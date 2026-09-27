// The policy simulator, as a pop-up beside ③ Policies: all four levers in one scrolling list, each with its switch,
// what it does, the written rule and assumption, before → after with the arithmetic, and the neighborhoods it
// changes. Changed tracts are outlined on the map while the lever is on.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Info, X } from 'lucide-react';
import { tractById } from '../../lib/data';
import { cx } from '../../lib/format';
import { hud, placeById } from '../../lib/place/data';
import { fmtDollars } from '../../lib/place/format';
import { usableAsking } from '../../lib/equity/measures';
import { bonusAffordableHomes, gapCost, rent60TwoBedroom, BONUS_AFFORDABLE_SHARE } from '../../lib/equity/policy';
import { RESIDENTIAL_FAMILIES, statusFromShares } from '../../lib/equity/zoning';
import { LEAVE_OUT, type LeverId, type LeverSummary, type PolicyResults } from '../../lib/equity/export';
import { nameOf, namesOf } from './names';

const STATUS_WORD = {
  yes: 'by right',
  conditional: 'conditional use',
  no: 'not allowed',
  unknown: 'no rule on file',
} as const;

const DOES: Record<LeverId, string> = {
  adu: 'Lets a homeowner add a backyard or basement apartment without a hearing in every residential district.',
  bonus: 'Where small apartment buildings need a hearing today, allow them by right if some homes stay affordable.',
  voucher: 'Pays the difference between what listings ask and what a household can afford, for a set number of 2-bedroom homes.',
  transit: 'Extends frequent bus or T service so places within a mile of a frequent stop today count as served.',
};

const ASSUME: Partial<Record<LeverId, string>> = {
  bonus: `A ${Math.round(BONUS_AFFORDABLE_SHARE * 100)}% set-aside at 60% AMI is this tool's example, not a city rule. HUD sets 60% limits at 1.2 × the 50% limits.`,
  voucher: "A gross subsidy estimate, not a program budget: no administration, no tenant income changes, rents held at today's asking level.",
  transit: "New frequent service reaches every tract within 1 mile of today's frequent stops; no cost or route is estimated.",
};

function Line({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-caption">
      <span className="min-w-0 text-slate-600">{label}</span>
      <span className="shrink-0 text-small font-semibold text-slate-900 tnum">{value}</span>
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-caption leading-snug text-slate-600">{children}</p>;
}

function Details({ l, r, selectedId }: { l: LeverSummary; r: PolicyResults; selectedId: string | null }) {
  const sel = selectedId ? (placeById.get(selectedId) ?? null) : null;
  const selName = selectedId ? nameOf(selectedId) : null;
  const shares = sel?.zoning?.shares ?? null;
  const r60 = rent60TwoBedroom(hud);
  const asking = usableAsking(sel);
  const selGap = selectedId && sel ? gapCost(selectedId, sel, hud, r.ami, r.homes) : null;
  return (
    <div className="space-y-1.5">
      <Note>{DOES[l.id]}</Note>
      <div className="rounded-md bg-slate-50 px-2 py-1 font-mono text-[11px] leading-snug text-slate-700 ring-1 ring-slate-200">{l.rule}</div>
      {ASSUME[l.id] && (
        <Note>
          <span className="mr-1 rounded bg-amber-100 px-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">Assumption</span>
          {ASSUME[l.id]}
        </Note>
      )}
      <Line label={l.measure} value={`${l.before} → ${l.after}`} />
      {l.id !== 'voucher' && <Note>{arith(l)}</Note>}
      {l.id === 'adu' && (
        <>
          <Line label="Anti-displacement plan lists an ADU" value={`${r.adu.recBefore.length} → ${r.adu.recAfter.length}`} />
          <Note>
            Newly recommended: <b>{r.adu.newlyRecommended.length}</b>. The zoning note beside the ADU turns from “conditional use” to “by right” in <b>{r.adu.noteChanged.length}</b> tracts.
          </Note>
        </>
      )}
      {l.id === 'bonus' && r60 && (
        <Note>
          60% AMI 2-bedroom rent: {r60.formula}. A 12-home building keeps {bonusAffordableHomes(12)} at that rent.
        </Note>
      )}
      {l.id === 'voucher' && (
        <ol className="space-y-px text-caption text-slate-700">
          <li className="text-slate-500">Each: (asking − {r.fits == null ? 'fits' : fmtDollars(r.fits)}) × 12 × {r.homes} homes</li>
          {r.gaps.top.map((g) => (
            <li key={g.id} className="flex justify-between gap-2">
              <span className="truncate">
                {nameOf(g.id)} <span className="text-slate-500">{tractById.get(g.id)?.name.replace('Tract ', '')}</span>
              </span>
              <span className="shrink-0 tnum">
                {fmtDollars(g.gap)} × 12 × {r.homes} = {fmtDollars(g.cost)}
              </span>
            </li>
          ))}
          <li className="flex justify-between gap-2 border-t border-stone-100 pt-0.5 font-semibold text-slate-900">
            <span>Sum, {r.gaps.top.length} tracts</span>
            <span className="tnum">{fmtDollars(r.gaps.total)} a year</span>
          </li>
          <li className="text-slate-500">
            {r.gaps.withGap} of {r.n} tracts have a gap at {r.ami}% AMI.
          </li>
        </ol>
      )}
      {l.id === 'transit' && r.transitLabel === '1 mile' && <Note>Your Place-tab distance is already 1 mile, so this lever changes nothing.</Note>}
      {l.id !== 'voucher' && (
        <Note>
          <span className="font-semibold text-slate-800">Changed ({l.changed.length}):</span> {namesOf(l.changed, 6)}
        </Note>
      )}
      {selName && (
        <p className="rounded-md bg-violet-50 px-2 py-1 text-caption text-violet-950">
          <b>{selName}</b>:{' '}
          {l.id === 'adu'
            ? shares
              ? `${STATUS_WORD[statusFromShares(shares, 'adu')]} → ${STATUS_WORD[statusFromShares(shares, 'adu', Object.fromEntries(RESIDENTIAL_FAMILIES.map((f) => [f, 'yes'])))]}`
              : 'no zoning shares on file'
            : l.id === 'bonus'
              ? !r60 || asking == null
                ? 'no reliable asking rent, so the discount cannot be shown'
                : asking > r60.rent
                  ? `${fmtDollars(asking)} − ${fmtDollars(r60.rent)} = ${fmtDollars(asking - r60.rent)} a month below market per set-aside home`
                  : `listings ask ${fmtDollars(asking)}, already at or below ${fmtDollars(r60.rent)}`
              : l.id === 'voucher'
                ? selGap
                  ? selGap.gap > 0
                    ? `${fmtDollars(selGap.asking)} − ${fmtDollars(selGap.fits)} = ${fmtDollars(selGap.gap)}/mo; × 12 × ${r.homes} = ${fmtDollars(selGap.cost)} a year`
                    : `listings ask ${fmtDollars(selGap.asking)}, at or below ${fmtDollars(selGap.fits)}: $0`
                  : 'no reliable asking rent, so no estimate'
                : sel?.transit?.freq_dist_mi != null
                  ? `nearest frequent stop ${sel.transit.freq_dist_mi.toFixed(2)} mi from the average resident`
                  : 'no transit distance on file'}
        </p>
      )}
    </div>
  );
}

/** "12 → 107 tracts: 107 − 12 = 95 more." */
function arith(l: LeverSummary): string {
  const b = Number(l.before),
    a = Number(l.after);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return '';
  const d = a - b;
  return d === 0 ? `${b} → ${a}: no change.` : `${a} − ${b} = ${Math.abs(d)} ${d > 0 ? 'more' : 'fewer'} tract${Math.abs(d) === 1 ? '' : 's'}.`;
}

function LeverBlock({ l, r, n, selectedId, onToggle }: { l: LeverSummary; r: PolicyResults; n: number; selectedId: string | null; onToggle: (id: LeverId) => void }) {
  return (
    <article data-lever-card={l.id} className={cx('rounded-lg px-3 py-2 ring-1', l.on ? 'bg-violet-50/40 ring-violet-200' : 'bg-white ring-stone-200/80')}>
      <div className="mb-1 flex items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-small font-semibold text-slate-900">
          <span className="text-slate-400 tnum">{n}</span> {l.name}
        </h3>
        <span className={cx('shrink-0 text-caption font-semibold tnum', l.on ? 'text-violet-800' : 'text-slate-500')}>{l.headline}</span>
        <button
          type="button"
          role="switch"
          aria-checked={l.on}
          aria-label={`${l.name} ${l.on ? 'on' : 'off'}`}
          onClick={() => onToggle(l.id)}
          className={cx('shrink-0 rounded px-1.5 py-px text-[10px] font-bold uppercase tracking-wider transition-colors', l.on ? 'bg-violet-700 text-white hover:bg-violet-800' : 'bg-stone-100 text-slate-500 hover:bg-stone-200')}
        >
          {l.on ? 'on' : 'off'}
        </button>
      </div>
      <Details l={l} r={r} selectedId={selectedId} />
    </article>
  );
}

/** "What these do": a button beside the lever chips that opens every lever's rule, arithmetic and reach. */
export default function PolicyPopover({ levers, results, selectedId, onToggle }: { levers: LeverSummary[]; results: PolicyResults; selectedId: string | null; onToggle: (id: LeverId) => void }) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const toggleOpen = () => {
    const r = wrap.current?.getBoundingClientRect();
    setAlignRight(!!r && r.left + 436 > window.innerWidth);
    setOpen((o) => !o);
  };
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open]);
  const onCount = levers.filter((l) => l.on).length;
  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-haspopup="dialog"
        data-testid="policy-popover-button"
        className={cx('-my-1 flex h-5 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[11px] font-semibold normal-case tracking-normal ring-1 transition-colors', open ? 'bg-violet-100 text-violet-800 ring-violet-300' : 'bg-violet-50 text-violet-700 ring-violet-200 hover:bg-violet-100 hover:text-violet-900')}
      >
        <Info className="h-3 w-3" />
        What these do
      </button>
      {open && (
        <section role="dialog" aria-label="Policy simulator" className={cx('absolute top-full z-50 mt-2 flex w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl bg-white font-normal normal-case tracking-normal shadow-xl ring-1 ring-stone-200', alignRight ? 'right-0' : 'left-0')} style={{ maxHeight: '70vh' }}>
          <div className="flex items-center gap-2 border-b border-stone-100 px-3 py-2">
            <h2 className="flex-1 text-small font-semibold text-slate-900">Policy simulator · what the four levers do</h2>
            <span className="text-caption text-slate-500">{onCount ? `${onCount} of 4 on` : 'all off'}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-6 w-6 place-items-center rounded text-slate-500 hover:bg-stone-100 hover:text-slate-900">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="scroll-quiet min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
            <p className="px-0.5 text-caption leading-snug text-slate-600">Four written rules applied to the same tract data; before and after are both computed here. Switch a lever on to outline the tracts it changes on the map.</p>
            {levers.map((l, i) => (
              <LeverBlock key={l.id} l={l} r={results} n={i + 1} selectedId={selectedId} onToggle={onToggle} />
            ))}
            <div className="rounded-lg bg-stone-50 px-3 py-2 text-caption leading-snug text-slate-600 ring-1 ring-stone-200/70">
              <div className="mb-0.5 font-semibold text-slate-800">What these levers leave out</div>
              {LEAVE_OUT.map((t) => (
                <p key={t}>· {t}</p>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
