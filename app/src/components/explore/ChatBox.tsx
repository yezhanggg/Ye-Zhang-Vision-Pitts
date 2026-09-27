import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronUp, MapPin, Sparkles, X } from 'lucide-react';
import { localMatches, photonSuggest, type GeoResult, type Resolved } from '../../lib/geocode';
import { CHAT_COPY, buildFacts, suggestions, useChat, type ChatMessage, type ChatScope } from '../../lib/explore/chat';
import { unitTitle } from '../../lib/explore/catalog';
import { EXPLORE_UI } from '../../lib/explore/copy';
import { classify, unitMatches } from '../../lib/explore/intent';
import { useApp } from '../../lib/store';
import { cx } from '../../lib/format';
import { KindIcon, enterWith } from '../TractSearch';
import { PromptInput } from '../ui/ai-chat-input';
import { ThinkingOrb } from '../ui/thinking-orbs';

const C = EXPLORE_UI.chat;
const SOFT = { type: 'spring', stiffness: 340, damping: 32, mass: 0.9 } as const;
const VIOLET = '#6d28d9';

type Row =
  | { kind: 'unit'; key: string; geoid: string; label: string; sub: string | null }
  | { kind: 'place'; key: string; result: GeoResult; geoid: string }
  | { kind: 'lookup'; key: string; text: string }
  | { kind: 'ask'; key: string; text: string };

/** The thinking mark: an orb whose motion and words change as the seconds pass. */
function Thinking({ since }: { since: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const timers = C.phases.map((p, k) => window.setTimeout(() => setI(k), Math.max(0, p.at - (Date.now() - since))));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [since]);
  const p = C.phases[i];
  return (
    <div className="flex items-center gap-2.5 py-0.5" role="status" aria-label={C.thinking}>
      <span className="grid h-8 w-8 shrink-0 place-items-center">
        <ThinkingOrb state={p.state} size={32} theme="light" color={VIOLET} dotSize={1.35} dots={1.15} aria-hidden />
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={p.text} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.24 }} className="shimmer-text text-small font-medium">
          {p.text}…
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/** An answer that writes itself in, a couple of words at a time. `animate` is read once, when the answer arrives. */
function Reveal({ text, animate, className }: { text: string; animate: boolean; className?: string }) {
  const tokens = useMemo(() => text.split(/(\s+)/), [text]);
  const [n, setN] = useState(animate ? 0 : tokens.length);
  useEffect(() => {
    if (!animate) return;
    let k = 0;
    const id = window.setInterval(() => {
      k += 4;
      setN(k);
      if (k >= tokens.length) window.clearInterval(id);
    }, 36);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className={cx('whitespace-pre-wrap', className)}>{n >= tokens.length ? text : tokens.slice(0, n).join('')}</div>;
}

/**
 * Top-right of Explore: one box to find a place or ask a question. What is typed is sorted in the browser
 * (lib/explore/intent): names and addresses go to the map search, which is free; only questions go to the
 * assistant. Suggested prompts, answers and the thinking mark all live inside the same box, which folds away.
 */
export default function ChatBox({ scope, resolve, onGo, compact = false }: { scope: ChatScope; resolve: (r: GeoResult) => Resolved; /** Open this place (Explore: its summary; Analysis: its tract card). */ onGo: (geoid: string) => void; /** Over a view with no column of its own: stays a pill until it is used. */ compact?: boolean }) {
  const messages = useChat((s) => s.messages);
  const busy = useChat((s) => s.busy);
  const ask = useChat((s) => s.ask);
  const clear = useChat((s) => s.clear);
  const pin = useApp((s) => s.pin);
  const lite = useApp((s) => s.lite);
  const set = useApp((s) => s.set);
  const [value, setValue] = useState('');
  const [hi, setHi] = useState(0);
  const [inputOpen, setInputOpen] = useState(false);
  const [folded, setFolded] = useState(compact);
  const [remote, setRemote] = useState<{ q: string; items: GeoResult[] } | null>(null);
  const [status, setStatus] = useState<{ kind: 'busy' | 'error'; text: string; retry?: string } | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const lastQuestion = useRef<HTMLDivElement>(null);
  const lookup = useRef<AbortController | null>(null);
  /** Answers that were being written while this box was on screen: only those write themselves in. */
  const wasPending = useRef(new Set<number>());

  const props = useMemo(() => (scope.selected ? scope.fc.features.find((f) => f.properties.GEOID === scope.selected)?.properties ?? null : null), [scope.fc, scope.selected]);
  const name = props ? unitTitle(props) : null;
  const prompts = useMemo(() => suggestions(name, scope.variable, scope.level), [name, scope.variable, scope.level]);
  const about = `${scope.level}|${scope.cityOnly ? 'city' : 'county'}|${scope.selected ?? ''}|${scope.variable?.id ?? ''}`;
  const outside = scope.level === 'muni' ? C.outside.muni : scope.cityOnly ? C.outside.city : C.outside.county;

  // ---------------------------------------------------------------- what was typed, sorted
  const text = value.trim();
  const intent = useMemo(() => classify(text), [text]);
  const typing = text.length > 0;
  useEffect(() => {
    setHi(0);
    if (typing) setStatus(null);
  }, [text, typing]);
  // Address suggestions (free) while it reads like a place, never for a question.
  useEffect(() => {
    const q = intent.query;
    if (intent.kind === 'question' || q.length < 3) return setRemote(null);
    const ctl = new AbortController();
    const timer = window.setTimeout(() => {
      photonSuggest(q, ctl.signal)
        .then((items) => !ctl.signal.aborted && setRemote({ q, items }))
        .catch(() => !ctl.signal.aborted && setRemote({ q, items: [] }));
    }, 350);
    return () => {
      window.clearTimeout(timer);
      ctl.abort();
    };
  }, [intent.kind, intent.query]);

  const rows = useMemo<Row[]>(() => {
    if (!typing) return [];
    const seen = new Set<string>();
    const places: Row[] = [];
    for (const u of unitMatches(intent.query, scope.fc, 4)) {
      if (seen.has(u.geoid)) continue;
      seen.add(u.geoid);
      places.push({ kind: 'unit', key: `u:${u.geoid}`, ...u });
    }
    const found = [...localMatches(intent.query, { places: 3, tracts: 3 }), ...(remote && remote.q === intent.query ? remote.items : [])];
    const named = new Set<string>();
    for (const r of found) {
      const res = resolve(r);
      const label = `${r.kind}|${r.label}|${r.sub ?? ''}`.toLowerCase();
      // A result that cannot be placed in the open boundary is left out, and so is a second row that reads the same.
      if (!res.ok || named.has(label) || (r.kind !== 'address' && seen.has(res.geoid))) continue;
      named.add(label);
      seen.add(res.geoid);
      places.push({ kind: 'place', key: `p:${label}`, result: r, geoid: res.geoid });
    }
    const askRow: Row = { kind: 'ask', key: 'ask', text };
    const lookupRow: Row = { kind: 'lookup', key: 'lookup', text: intent.query };
    if (intent.kind === 'question') return [askRow, ...places.slice(0, 3)];
    if (intent.kind === 'address') return [lookupRow, ...places.slice(0, 4), askRow];
    return places.length ? [...places.slice(0, 5), askRow] : [lookupRow, askRow];
  }, [typing, text, intent, scope.fc, remote, resolve]);

  // ---------------------------------------------------------------- doing it
  const go = (geoid: string, pinAt?: GeoResult) => {
    set({ pin: pinAt?.kind === 'address' && pinAt.center ? { lng: pinAt.center[0], lat: pinAt.center[1], label: pinAt.label } : null });
    onGo(geoid);
    setStatus(null);
  };
  const send = (q: string): boolean => {
    if (busy) {
      setStatus({ kind: 'error', text: C.wait });
      return false;
    }
    setFolded(false);
    setStatus(null);
    void ask(q, () => buildFacts(scope), about);
    return true;
  };
  const find = async (q: string) => {
    lookup.current?.abort();
    const ctl = new AbortController();
    lookup.current = ctl;
    setStatus({ kind: 'busy', text: C.looking });
    const res = await enterWith(q, resolve, ctl.signal);
    if (ctl.signal.aborted) return;
    if (res.ok) go(res.geoid, res.result);
    else setStatus({ kind: 'error', text: res.reason === 'outside' ? outside : C.notFound(q), retry: res.reason === 'outside' ? undefined : q });
  };
  /** Returns false when nothing was done with the text, so it stays in the box. */
  const act = (row: Row | undefined): boolean => {
    if (!row) return false;
    if (row.kind === 'ask') return send(row.text);
    if (row.kind === 'unit') go(row.geoid);
    else if (row.kind === 'place') go(row.geoid, row.result);
    else void find(row.text);
    return true;
  };
  const pick = (row: Row) => {
    if (act(row)) setValue('');
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>): boolean => {
    if (!rows.length) return false;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setHi((h) => (e.key === 'ArrowDown' ? Math.min(h + 1, rows.length - 1) : Math.max(h - 1, 0)));
      return true;
    }
    return false;
  };

  // ---------------------------------------------------------------- the conversation
  useEffect(() => {
    for (const m of messages) if (m.pending) wasPending.current.add(m.id);
    // Bring the latest question to the top of the list, so its answer is read from the start.
    const box = list.current, q = lastQuestion.current;
    if (box && q) box.scrollTo({ top: q.offsetTop - 8, behavior: lite ? 'auto' : 'smooth' });
  }, [messages, lite]);
  const lastUserId = useMemo(() => [...messages].reverse().find((m) => m.role === 'user')?.id ?? null, [messages]);
  const provider = useMemo(() => [...messages].reverse().find((m) => m.provider)?.provider ?? CHAT_COPY.defaultProvider, [messages]);
  const exchanges = useMemo(() => {
    const out: { q: ChatMessage; a: ChatMessage | null }[] = [];
    for (let i = 0; i < messages.length; i++) if (messages[i].role === 'user') out.push({ q: messages[i], a: messages[i + 1]?.role === 'assistant' ? messages[i + 1] : null });
    return out;
  }, [messages]);

  const quiet = compact && folded && !inputOpen;
  const hasAi = (prompts.length > 0 || messages.length > 0) && !quiet;
  const hasNotes = !!status || !!pin;
  const showRows = typing && rows.length > 0;
  const showAi = hasAi && !typing && !folded;
  const wide = inputOpen || showRows || showAi || hasNotes;

  return (
    <div className="pointer-events-auto ml-auto w-full overflow-hidden rounded-[24px] bg-white/95 shadow-lg ring-1 ring-black/5 backdrop-blur transition-[max-width,box-shadow] duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.1)] focus-within:ring-2 focus-within:ring-violet-300" style={{ maxWidth: wide ? 440 : 320 }}>
      <PromptInput bare value={value} onChange={setValue} onSubmit={() => act(rows[hi])} onKey={onKey} onOpenChange={setInputOpen} busy={busy} placeholder={name ? C.askAbout(name) : C.ask} />

      <AnimatePresence initial={false}>
        {showRows && (
          <motion.div key="rows" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SOFT} className="overflow-hidden">
            <ul role="listbox" aria-label={C.results} className="border-t border-stone-200/70 p-1.5">
              {rows.map((row, i) => (
                <li key={row.key}>
                  <button type="button" role="option" aria-selected={i === hi} onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setHi(i)} onClick={() => pick(row)} className={cx('flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors', i === hi ? 'bg-violet-50' : 'hover:bg-stone-50')}>
                    {row.kind === 'ask' ? <Sparkles className="h-4 w-4 shrink-0 text-violet-600" /> : row.kind === 'lookup' ? <KindIcon kind="address" /> : <KindIcon kind={row.kind === 'unit' ? 'tract' : row.result.kind} />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-small font-medium text-slate-900">{row.kind === 'ask' ? C.askRow : row.kind === 'lookup' ? C.lookupRow : row.kind === 'unit' ? row.label : row.result.label}</span>
                      <span className="block truncate text-caption text-slate-600">{row.kind === 'ask' || row.kind === 'lookup' ? `“${row.text}”` : row.kind === 'unit' ? row.sub ?? '' : row.result.sub ?? ''}</span>
                    </span>
                    {row.kind === 'ask' && <span className="shrink-0 rounded-md bg-violet-100 px-1.5 py-px text-caption font-semibold text-violet-800">{C.askTag}</span>}
                    {i === hi && <span className="shrink-0 rounded-md bg-white px-1.5 py-px text-caption font-medium text-slate-500 ring-1 ring-stone-200">{C.enter} ↵</span>}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {hasNotes && !typing && (
          <motion.div key="notes" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SOFT} className="overflow-hidden">
            <div className="space-y-1 border-t border-stone-200/70 px-4 py-2">
              {status && (
                <p role="status" className={cx('text-small', status.kind === 'error' ? 'text-rose-700' : 'text-slate-600')}>
                  {status.text}{' '}
                  {status.retry && (
                    <button onClick={() => send(status.retry as string)} className="font-semibold text-violet-700 hover:underline">
                      {C.askInstead}
                    </button>
                  )}
                </p>
              )}
              {pin && (
                <p className="flex items-center gap-1.5 text-caption text-slate-600">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-violet-600" />
                  <span className="min-w-0 flex-1 truncate">
                    {C.pinned}: <span className="font-medium text-slate-800">{pin.label}</span>
                  </span>
                  <button onClick={() => set({ pin: null })} className="rounded-md p-0.5 text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-label={C.unpin} title={C.unpin}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {showAi && (
          <motion.div key="ai" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SOFT} className="overflow-hidden">
            {prompts.length > 0 && (
              <div className="border-t border-stone-200/70 px-2 py-1.5" aria-label={C.prompts}>
                {prompts.map((p, i) => (
                  <motion.button key={p} type="button" disabled={busy} onClick={() => send(p)} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SOFT, delay: 0.04 * i }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-small text-slate-500 transition-colors hover:bg-violet-50 hover:text-violet-800 disabled:opacity-50">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                    <span className="truncate">{p}</span>
                  </motion.button>
                ))}
              </div>
            )}
            {exchanges.length > 0 && (
              <div ref={list} className="scroll-quiet relative max-h-[38vh] overflow-y-auto border-t border-stone-200/70 px-4 py-2.5" aria-label={C.answers} aria-live="polite">
                {exchanges.map(({ q, a }, i) => (
                  <div key={q.id} ref={q.id === lastUserId ? lastQuestion : undefined} className={cx(i > 0 && 'mt-3 border-t border-stone-100 pt-3')}>
                    <div className="text-small font-semibold text-slate-900">{q.text}</div>
                    <div className="mt-1">
                      {!a || a.pending ? (
                        <Thinking since={q.at} />
                      ) : (
                        <motion.div initial={wasPending.current.has(a.id) ? { opacity: 0, y: 4 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                          <Reveal text={a.text} animate={!lite && wasPending.current.has(a.id)} className={cx('text-small', a.failed ? 'text-slate-600' : 'text-slate-700')} />
                          {a.unchecked && <p className="mt-1 text-caption text-amber-800">{CHAT_COPY.unchecked}</p>}
                        </motion.div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {hasAi && !typing && (
          <motion.div key="foot" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SOFT} className="overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-t border-stone-200/70 py-1 pl-4 pr-1.5">
              <span className="truncate text-caption text-slate-500">{CHAT_COPY.poweredBy(provider)}</span>
              <span className="flex shrink-0 items-center gap-0.5">
                {messages.length > 0 && !busy && (
                  <button onClick={clear} className="rounded-lg px-2 py-1 text-caption font-semibold text-slate-500 hover:bg-stone-100 hover:text-slate-900" title={C.clearTitle}>
                    {C.clear}
                  </button>
                )}
                <motion.button type="button" onClick={() => setFolded((f) => !f)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.88 }} transition={SOFT} className="grid h-7 w-7 place-items-center rounded-full text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-expanded={!folded} aria-label={folded ? C.unfold : C.fold} title={folded ? C.unfold : C.fold}>
                  <motion.span animate={{ rotate: folded ? 180 : 0 }} transition={SOFT} className="grid place-items-center">
                    <ChevronUp className="h-4 w-4" />
                  </motion.span>
                </motion.button>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

