import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronUp, MapPin, Sparkles, X } from 'lucide-react';
import { localMatches, photonSuggest, type GeoResult, type Resolved } from '../../lib/geocode';
import { CHAT_COPY, buildFacts, exchangesOldestFirst, suggestions, useChat, type ChatMessage, type ChatScope } from '../../lib/explore/chat';
import { WITHHELD } from '../../lib/analysis/strictChat';
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
/** The chat's thinking mark (orb + rotating status words); also used by VisionPitts Insight on Equity & policy. */
export function Thinking({ since }: { since: number }) {
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

const timeOf = (at: number) => {
  try {
    return new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
};

/** The small point a bubble has at its lower corner, on the speaker's side. */
function Tail({ side, className }: { side: 'left' | 'right'; className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 8 10" className={cx('absolute bottom-0 h-2.5 w-2', side === 'right' ? '-right-[6px]' : '-left-[6px] -scale-x-100', className)}>
      <path d="M0 0 C0 6 3 9 8 10 L0 10 Z" fill="currentColor" />
    </svg>
  );
}

/** A question, on the right. */
function UserBubble({ m }: { m: ChatMessage }) {
  return (
    <div className="group flex flex-col items-end" data-role="user">
      <div className="relative max-w-[85%] rounded-2xl rounded-br-md bg-violet-600 px-3 py-1.5 text-small text-white shadow-sm">
        <span className="whitespace-pre-wrap break-words">{m.text}</span>
        <Tail side="right" className="text-violet-600" />
      </div>
      <span className="mr-1 mt-0.5 text-[10.5px] leading-tight text-slate-400">{timeOf(m.at)}</span>
    </div>
  );
}

/** An answer (or the thinking mark while it is written), on the left. */
function AnswerBubble({ q, a, fresh, lite }: { q: ChatMessage; a: ChatMessage | null; fresh: boolean; lite: boolean }) {
  const thinking = !a || a.pending;
  const withheld = !!a && a.text === WITHHELD;
  const tone = thinking ? 'bg-white ring-stone-200 text-slate-800' : withheld ? 'bg-amber-50 ring-amber-200 text-amber-900' : a.failed ? 'bg-stone-100 ring-stone-200 text-slate-600' : 'bg-white ring-stone-200 text-slate-800';
  const tail = thinking ? 'text-white' : withheld ? 'text-amber-50' : a.failed ? 'text-stone-100' : 'text-white';
  const caption: string[] = [];
  if (a && !thinking && !a.failed) {
    if (a.checked) caption.push(CHAT_COPY.checked);
  }
  return (
    <div className="flex flex-col items-start" data-role="assistant">
      <div className={cx('relative max-w-[85%] rounded-2xl rounded-bl-md px-3 py-1.5 text-small shadow-sm ring-1', tone)}>
        {thinking ? (
          <Thinking since={q.at} />
        ) : (
          <motion.div initial={fresh ? { opacity: 0, y: 4 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {/* Keyed by the text: an answer rewritten in place (the Analysis gate) starts over rather than keeping the old length. */}
            <Reveal key={a.text} text={a.text} animate={!lite && fresh} className="break-words" />
            {a.unchecked && <p className="mt-1.5 rounded-md bg-amber-50 px-2 py-1 text-caption text-amber-800 ring-1 ring-amber-200">{CHAT_COPY.unchecked}</p>}
          </motion.div>
        )}
        <Tail side="left" className={tail} />
      </div>
      {!thinking && (
        <span className="ml-1 mt-0.5 max-w-[85%] text-[10.5px] leading-tight text-slate-400">
          {[...caption, timeOf(a.at)].filter(Boolean).join(' · ')}
        </span>
      )}
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
  return <div className={cx('whitespace-pre-wrap', className)}>{!animate || n >= tokens.length ? text : tokens.slice(0, n).join('')}</div>;
}

/**
 * Top-right of Explore: one box to find a place or ask a question. What is typed is sorted in the browser
 * (lib/explore/intent): names and addresses go to the map search, which is free; only questions go to the
 * assistant. Suggested prompts, answers and the thinking mark all live inside the same box, which folds away.
 */
export default function ChatBox({ scope, resolve, onGo, compact = false, fill = false, prompts: promptsOverride }: { /** Suggested questions to show instead of the generic ones. */ prompts?: string[]; scope: ChatScope; resolve: (r: GeoResult) => Resolved; /** Open this place (Explore: its summary; Analysis: its tract card). */ onGo: (geoid: string) => void; /** Over a view with no column of its own: stays a pill until it is used. */ compact?: boolean; /** Docked in a column of definite height: the box fills it and the thread scrolls inside, with no height cap. */ fill?: boolean }) {
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
  // The Explore box remembers across reloads whether its thread was folded; a compact box always starts as a pill.
  const storedFold = useChat((s) => s.folded);
  const setStoredFold = useChat((s) => s.setFolded);
  // A docked box (Equity & policy) always opens unfolded and does not touch Explore's remembered fold.
  const [folded, setFoldedLocal] = useState(compact ? true : fill ? false : storedFold ?? false);
  const setFolded = (f: boolean | ((f: boolean) => boolean)) =>
    setFoldedLocal((cur) => {
      const next = typeof f === 'function' ? f(cur) : f;
      if (!compact && !fill && next !== storedFold) setStoredFold(next);
      return next;
    });
  const [remote, setRemote] = useState<{ q: string; items: GeoResult[] } | null>(null);
  const [status, setStatus] = useState<{ kind: 'busy' | 'error'; text: string; retry?: string } | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const lookup = useRef<AbortController | null>(null);
  /** Answers that were being written while this box was on screen: only those write themselves in. */
  const wasPending = useRef(new Set<number>());

  const props = useMemo(() => (scope.selected ? scope.fc.features.find((f) => f.properties.GEOID === scope.selected)?.properties ?? null : null), [scope.fc, scope.selected]);
  const name = props ? unitTitle(props) : null;
  const generic = useMemo(() => suggestions(name, scope.variable, scope.level), [name, scope.variable, scope.level]);
  // A suggested question disappears once it has been asked (compared ignoring case and spacing).
  const asked = useMemo(() => new Set(messages.filter((m) => m.role === 'user').map((m) => m.text.trim().toLowerCase().replace(/\s+/g, ' '))), [messages]);
  const prompts = useMemo(
    () => (promptsOverride?.length ? promptsOverride : generic).filter((p) => !asked.has(p.trim().toLowerCase().replace(/\s+/g, ' '))),
    [promptsOverride, generic, asked],
  );
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
    let fresh = false;
    for (const m of messages) {
      if (!m.pending || wasPending.current.has(m.id)) continue;
      wasPending.current.add(m.id);
      fresh = true;
    }
    // Like most chats, the newest exchange is at the bottom: a new question or answer scrolls the thread down to it
    // (unless the reader has scrolled up to read something older while an answer is being written).
    const el = list.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (fresh || nearBottom) requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior: lite || !fresh ? 'auto' : 'smooth' }));
  }, [messages, lite]);
  const exchanges = useMemo(() => exchangesOldestFirst(messages), [messages]);

  const quiet = compact && folded && !inputOpen;
  const hasAi = (prompts.length > 0 || messages.length > 0) && !quiet;
  const hasNotes = !!status || !!pin;
  const showRows = typing && rows.length > 0;
  const showAi = hasAi && !typing && !folded;
  const wide = inputOpen || showRows || showAi || hasNotes;
  // Open on the latest exchange whenever the thread comes into view (it is kept across reloads).
  const threadShown = showAi && exchanges.length > 0;
  // Once a conversation exists the box reads like most chats: name bar on top, the thread (oldest first), the suggested
  // questions, then the input at the bottom (search results open below it). Before that, the input leads.
  const chat = messages.length > 0 || fill;
  useEffect(() => {
    const el = list.current;
    if (threadShown && el) el.scrollTop = el.scrollHeight;
  }, [threadShown]);

  return (
    <div data-tour="ask" className={cx('pointer-events-auto ml-auto flex w-full shrink-0 flex-col overflow-hidden rounded-[24px] bg-white/95 shadow-lg ring-1 ring-black/5 backdrop-blur transition-[max-width,box-shadow] duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.1)] focus-within:ring-2 focus-within:ring-violet-300', fill && 'h-full min-h-0')} style={{ maxWidth: fill ? undefined : wide ? 440 : 320 }}>
      <div className={cx('shrink-0', chat && 'order-3 border-t border-stone-200/70 p-2')}>
      <div className={cx(chat && 'overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200/80 transition-shadow focus-within:ring-2 focus-within:ring-violet-300')}>
      <PromptInput bare small={fill || chat} value={value} onChange={setValue} onSubmit={() => act(rows[hi])} onKey={onKey} onOpenChange={setInputOpen} busy={busy} placeholder={name ? C.askAbout(name) : C.ask} grey={chat} />
      </div>
      </div>

      <AnimatePresence initial={false}>
        {showRows && (
          <motion.div key="rows" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SOFT} className={cx('shrink-0 overflow-hidden', chat && 'order-4')}>
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
          <motion.div key="notes" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SOFT} className={cx('shrink-0 overflow-hidden', chat && 'order-2')}>
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
          <motion.div key="ai" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SOFT} className={cx('flex flex-col overflow-hidden', fill && 'min-h-0 flex-1', chat && 'order-1')}>
            {prompts.length > 0 && (
              <div className={cx('shrink-0 border-t border-stone-200/70 px-2 py-1.5', chat && 'order-2 mt-auto')} aria-label={C.prompts}>
                {prompts.map((p, i) => (
                  <motion.button key={p} type="button" disabled={busy} onClick={() => send(p)} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SOFT, delay: 0.04 * i }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-small text-slate-500 transition-colors hover:bg-violet-50 hover:text-violet-800 disabled:opacity-50">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                    <span className="truncate">{p}</span>
                  </motion.button>
                ))}
              </div>
            )}
            {exchanges.length > 0 && (
              <div ref={list} className={cx('scroll-quiet relative overflow-y-auto overflow-x-hidden border-t', fill ? 'min-h-0 flex-1 max-h-[calc(100vh-10rem)]' : 'max-h-[38vh]', 'border-stone-200/70 bg-stone-50/60 px-3.5 py-2.5')} aria-label={C.answers} aria-live="polite">
                <AnimatePresence initial={false}>
                  {exchanges.map(({ q, a }) => (
                    <motion.div key={q.id} layout={!lite} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SOFT} className="flex flex-col gap-1.5 pb-3 last:pb-0" data-testid="chat-exchange">
                      <UserBubble m={q} />
                      <AnswerBubble q={q} a={a} fresh={!!a && wasPending.current.has(a.id)} lite={lite} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {hasAi && !typing && !(fill && !messages.length) && (
          <motion.div key="foot" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SOFT} className={cx('shrink-0 overflow-hidden', chat ? 'order-first' : fill && 'mt-auto')}>
            <div className={cx('flex items-center justify-between gap-2 border-stone-200/70 py-1 pl-4 pr-1.5', chat ? 'border-b' : 'border-t')}>
              <span className="truncate text-caption font-semibold text-violet-700">{fill ? '' : CHAT_COPY.name}</span>
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

