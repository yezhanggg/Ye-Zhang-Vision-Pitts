import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { focusTracts, tractById, tractLabel } from '../lib/data';
import { censusLookup, localMatches, looksLikeAddress, nominatimSearch, photonSuggest, quickPicks, resolveResult, searchOnEnter, type GeoResult, type Resolved } from '../lib/geocode';
import { UI } from '../lib/copy';
import { useApp } from '../lib/store';
import { cx } from '../lib/format';

interface Props {
  value: string | null;
  onChange: (id: string) => void;
  tag?: string;
  tagColor?: string;
  placeholder?: string;
  showQuickPicks?: boolean;
  exclude?: string | null;
  label?: string;
  /** Custom placement of a result (Explore resolves into block groups or ZIPs, county-wide when online). Default: city tracts. */
  resolve?: (r: GeoResult) => Resolved;
  /** Label for the current value when it is not a city tract (Explore units). */
  currentLabel?: string | null;
  /** Message for a result that falls outside the resolvable area. */
  outsideText?: string;
}

const GROUP_TITLE: Record<string, string> = { neighborhood: 'Neighborhoods', tract: 'Census tracts', address: 'Addresses & places' };

export function KindIcon({ kind }: { kind: GeoResult['kind'] }) {
  const cls = 'h-4 w-4 shrink-0 text-slate-500';
  if (kind === 'address')
    return (
      <svg viewBox="0 0 20 20" className={cls}>
        <path d="M10 18s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="10" cy="8" r="2.2" fill="currentColor" />
      </svg>
    );
  if (kind === 'tract')
    return (
      <svg viewBox="0 0 20 20" className={cls}>
        <path d="M3 5l5-2 4 2 5-2v12l-5 2-4-2-5 2z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 20 20" className={cls}>
      <path d="M3 17V9l4-3 4 3v8M11 17V6l3-2 3 2v11M2 17h16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** Enter with a custom resolver: the same geocoder chain as searchOnEnter, but each hit is placed by `resolve`. */
export async function enterWith(q: string, resolve: (r: GeoResult) => Resolved, signal?: AbortSignal): Promise<Resolved> {
  const text = q.trim();
  if (!text) return { ok: false, reason: 'notfound' };
  const attempts: (() => Promise<GeoResult | null | undefined>)[] = [];
  if (looksLikeAddress(text)) attempts.push(() => censusLookup(text));
  else attempts.push(async () => localMatches(text)[0]);
  attempts.push(async () => (await photonSuggest(text, signal))[0]);
  attempts.push(() => nominatimSearch(text, signal));
  let outside: Resolved | null = null;
  for (const fn of attempts) {
    if (signal?.aborted) break;
    try {
      const r = await fn();
      if (!r) continue;
      const res = resolve(r);
      if (res.ok) return res;
      if (res.reason === 'outside') outside = res;
    } catch {
      /* next */
    }
  }
  return outside ?? { ok: false, reason: 'notfound' };
}

export default function TractSearch({ value, onChange, tag, tagColor = '#7c3aed', placeholder = UI.searchPlaceholder, showQuickPicks = true, exclude, label = 'Search', resolve, currentLabel, outsideText = UI.outsideCity }: Props) {
  const pin = useApp((s) => s.pin);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [navigated, setNavigated] = useState(false);
  const [remote, setRemote] = useState<{ q: string; items: GeoResult[] } | null>(null);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [status, setStatus] = useState<{ kind: 'busy' | 'error'; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const enterCtl = useRef<AbortController | null>(null);

  const local = useMemo(() => localMatches(q), [q]);
  useEffect(() => {
    const s = q.trim();
    if (s.length < 3) {
      setRemote(null);
      setLoadingRemote(false);
      return;
    }
    const ctl = new AbortController();
    setLoadingRemote(true);
    const timer = window.setTimeout(() => {
      photonSuggest(s, ctl.signal)
        .then((items) => !ctl.signal.aborted && setRemote({ q: s, items }))
        .catch(() => !ctl.signal.aborted && setRemote({ q: s, items: [] }))
        .finally(() => !ctl.signal.aborted && setLoadingRemote(false));
    }, 350);
    return () => {
      window.clearTimeout(timer);
      ctl.abort();
    };
  }, [q]);

  const items: GeoResult[] = useMemo(() => {
    if (!q.trim()) return quickPicks();
    const rem = remote && remote.q === q.trim() ? remote.items : [];
    const names = new Set(local.map((r) => r.label.toLowerCase()));
    return [...local, ...rem.filter((r) => !names.has(r.label.toLowerCase()))];
  }, [q, local, remote]);

  const current = value ? tractById.get(value) : null;
  const currentText = currentLabel ?? (current ? `${tractLabel(current)} · ${current.name}` : null);
  const finish = () => {
    setQ('');
    setOpen(false);
    setNavigated(false);
    inputRef.current?.blur();
  };
  const pick = (r: GeoResult) => {
    const res = (resolve ?? resolveResult)(r);
    if (!res.ok) return setStatus({ kind: 'error', text: res.reason === 'outside' ? outsideText : 'We could not place that result on the map.' });
    if (res.geoid === exclude) return setStatus({ kind: 'error', text: 'That is the other place in this comparison. Pick a different one.' });
    setStatus(null);
    const set = useApp.getState().set;
    if (r.kind === 'address' && r.center) set({ pin: { lng: r.center[0], lat: r.center[1], label: r.label } });
    else set({ pin: null });
    onChange(res.geoid);
    finish();
  };
  const submit = async () => {
    const text = q.trim();
    if (!text) return;
    if (navigated && items[hi]) return pick(items[hi]);
    if (!looksLikeAddress(text) && local[0]) return pick(local[0]);
    enterCtl.current?.abort();
    const ctl = new AbortController();
    enterCtl.current = ctl;
    setStatus({ kind: 'busy', text: 'Looking up that address…' });
    const res = resolve ? await enterWith(text, resolve, ctl.signal) : await searchOnEnter(text, ctl.signal);
    if (ctl.signal.aborted) return;
    if (res.ok) pick(res.result);
    else setStatus({ kind: 'error', text: res.reason === 'outside' ? outsideText : 'No match found. Try a street address with a house number, or a neighborhood name.' });
  };
  const clear = () => {
    enterCtl.current?.abort();
    setQ('');
    setStatus(null);
    useApp.getState().set({ pin: null });
    inputRef.current?.focus();
  };

  let lastGroup = '';
  return (
    <div className="space-y-2">
      <div className="relative">
        <div className={cx('flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 transition-shadow', open ? 'ring-violet-400 shadow-[0_0_0_4px_rgba(124,58,237,0.12)]' : 'ring-stone-300 hover:ring-stone-400')}>
          {tag ? (
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-caption font-bold text-white" style={{ background: tagColor }}>
              {tag}
            </span>
          ) : (
            <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-slate-500">
              <circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
          <input
            ref={inputRef}
            value={q}
            aria-label={label}
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            onChange={(e) => {
              setQ(e.target.value);
              setHi(0);
              setNavigated(false);
              setOpen(true);
              setStatus(null);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                setHi((h) => Math.min(h + 1, items.length - 1));
                setNavigated(true);
                setOpen(true);
                e.preventDefault();
              }
              if (e.key === 'ArrowUp') {
                setHi((h) => Math.max(h - 1, 0));
                setNavigated(true);
                e.preventDefault();
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                if (!q.trim() && items[hi]) pick(items[hi]);
                else void submit();
              }
              if (e.key === 'Escape') {
                setOpen(false);
                inputRef.current?.blur();
              }
            }}
            placeholder={currentText && !open ? currentText : placeholder}
            className={cx('min-w-0 flex-1 bg-transparent text-body outline-none', currentText && !open ? 'placeholder:font-medium placeholder:text-slate-900' : 'placeholder:text-slate-500')}
          />
          {(q || pin) && (
            <button onMouseDown={(e) => e.preventDefault()} onClick={clear} className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-label="Clear search and pin">
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
        <AnimatePresence>
          {open && (
            <motion.ul role="listbox" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }} className="scroll-quiet absolute left-0 right-0 z-[2000] mt-1.5 max-h-96 overflow-auto rounded-xl bg-white p-1 shadow-2xl ring-1 ring-black/5">
              {!q.trim() && <li className="px-2.5 pb-1 pt-1.5 text-caption font-semibold text-slate-600">Demo neighborhoods</li>}
              {items.map((r, i) => {
                const header = q.trim() && r.kind !== lastGroup ? GROUP_TITLE[r.kind] : null;
                lastGroup = r.kind;
                const disabled = !!r.geoid && r.geoid === exclude;
                return (
                  <li key={`${r.via}-${r.kind}-${r.label}-${i}`}>
                    {header && <div className="px-2.5 pb-1 pt-2 text-caption font-semibold text-slate-600">{header}</div>}
                    <button
                      role="option"
                      aria-selected={i === hi}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(r)}
                      onMouseEnter={() => {
                        setHi(i);
                        setNavigated(true);
                      }}
                      disabled={disabled}
                      className={cx('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left disabled:opacity-40', i === hi && 'bg-violet-50', r.geoid === value && r.kind === 'tract' && 'ring-1 ring-violet-200')}
                    >
                      <KindIcon kind={r.kind} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-small font-medium text-slate-900">{r.label}</span>
                        {r.sub && <span className="block truncate text-caption text-slate-600">{r.sub}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
              {q.trim() && loadingRemote && <li className="px-3 py-2 text-caption text-slate-600">Searching addresses…</li>}
              {q.trim() && !loadingRemote && items.length === 0 && <li className="px-3 py-2 text-small text-slate-700">{looksLikeAddress(q) ? 'Press Enter to look up this address.' : `No place matches “${q}”.`}</li>}
              {q.trim() && looksLikeAddress(q) && items.length > 0 && <li className="border-t border-stone-100 px-3 py-2 text-caption text-slate-600">Press Enter to look up the exact address.</li>}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {status && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} role="status" className={cx('overflow-hidden text-small', status.kind === 'error' ? 'text-rose-700' : 'text-slate-600')}>
            {status.text}
          </motion.p>
        )}
      </AnimatePresence>
      {pin && !status && (
        <p className="flex items-center gap-1.5 text-caption text-slate-600">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-600" />
          Pinned: <span className="truncate font-medium text-slate-800">{pin.label}</span>
        </p>
      )}
      {showQuickPicks && focusTracts.length > 0 && (
        <div>
          <div className="mb-1.5 text-caption text-slate-600">Or start with a demo neighborhood:</div>
          <div className="flex flex-wrap gap-1.5">
            {focusTracts.map((t) => (
              <button key={t.GEOID} onClick={() => onChange(t.GEOID)} disabled={t.GEOID === exclude} className={cx('rounded-full px-2.5 py-1 text-small font-medium ring-1 transition-colors disabled:opacity-40', t.GEOID === value ? 'bg-violet-600 text-white ring-violet-700' : 'bg-white text-slate-700 ring-stone-300 hover:bg-violet-50 hover:text-violet-800 hover:ring-violet-200')}>
                {tractLabel(t)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
