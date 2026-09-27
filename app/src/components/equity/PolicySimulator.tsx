// The policy simulator: four levers as switches. Each prints what it does in one sentence, the exact rule, the
// assumptions it makes (labeled), and before → after counts from the same tract data, with the changed tracts
// outlined on the map above.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { tractById } from '../../lib/data';
import { cx } from '../../lib/format';
import { hud, placeById } from '../../lib/place/data';
import { fmtDollars } from '../../lib/place/format';
import { usePlan } from '../../lib/place/planStore';
import { MILES_LABEL } from '../../lib/place/plan';
import { fitsRent2br, usableAsking, type AmiPct } from '../../lib/equity/measures';
import { aduByRight, bonusAffordableHomes, densityBonus, gapCost, largestGaps, rent60TwoBedroom, transitExtension, BONUS_AFFORDABLE_SHARE, type Row } from '../../lib/equity/policy';
import { RESIDENTIAL_FAMILIES, SMALL_APT_CONDITIONAL_FAMILIES, statusFromShares } from '../../lib/equity/zoning';
import { Explainer } from '../primitives';
import { nameOf, namesOf } from './names';

type LeverId = 'adu' | 'bonus' | 'voucher' | 'transit';

const STATUS_WORD = {
  yes: 'by right',
  conditional: 'conditional use',
  no: 'not allowed',
  unknown: 'no rule on file',
} as const;

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cx('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors', on ? 'bg-slate-900' : 'bg-stone-300')}
    >
      <span className={cx('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', on ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  );
}

function BeforeAfter({ label, before, after, of }: { label: string; before: number | string; after: number | string; of?: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2 rounded-lg bg-stone-50 px-2.5 py-1.5 ring-1 ring-stone-200/70">
      <span className="text-caption text-slate-700">{label}</span>
      <span className="shrink-0 font-display text-body font-bold text-slate-900 tnum">
        {before} <span className="text-slate-400">→</span> {after}
        {of != null && <span className="text-caption font-normal text-slate-500"> of {of}</span>}
      </span>
    </div>
  );
}

function Lever({
  tag,
  title,
  does,
  rule,
  assumption,
  on,
  onToggle,
  children,
  off,
}: {
  tag: string;
  title: string;
  does: string;
  rule: ReactNode;
  assumption?: ReactNode;
  on: boolean;
  onToggle: (v: boolean) => void;
  children: ReactNode;
  off?: ReactNode;
}) {
  return (
    <article className={cx('flex flex-col rounded-xl bg-white p-3 ring-1 transition-shadow', on ? 'shadow-md ring-slate-900/30' : 'ring-stone-200/80')}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{tag}</div>
          <h3 className="font-display text-body font-bold text-slate-900">{title}</h3>
        </div>
        <Switch on={on} onChange={onToggle} label={title} />
      </div>
      <p className="mt-1 text-small text-slate-700">{does}</p>
      <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 font-mono text-[11.5px] leading-snug text-slate-700 ring-1 ring-slate-200">{rule}</div>
      {assumption && (
        <p className="mt-1.5 text-caption text-amber-900">
          <span className="rounded bg-amber-100 px-1 py-px text-[10px] font-bold uppercase tracking-wider">Assumption</span> {assumption}
        </p>
      )}
      <div className="mt-2 space-y-1.5">{on ? children : <p className="text-caption text-slate-500">{off ?? 'Switch on to see the result and outline the changed tracts on the map.'}</p>}</div>
    </article>
  );
}

function Affected({ ids, label = 'Changed tracts' }: { ids: string[]; label?: string }) {
  return (
    <p className="text-caption text-slate-700">
      <span className="font-semibold">
        {label} ({ids.length} {ids.length === 1 ? 'tract' : 'tracts'}):
      </span>{' '}
      {namesOf(ids)}
    </p>
  );
}

export default function PolicySimulator({ rows, ami, selectedId, onFlips }: { rows: Row[]; ami: AmiPct; selectedId: string | null; onFlips: (s: Set<string>) => void }) {
  const [on, setOn] = useState<Record<LeverId, boolean>>({
    adu: false,
    bonus: false,
    voucher: false,
    transit: false,
  });
  const [homesText, setHomesText] = useState('40');
  const homes = Math.max(0, Math.min(10000, Math.round(Number(homesText) || 0)));
  const level = usePlan((s) => s.level);
  const household = usePlan((s) => s.household);
  const transitMi = usePlan((s) => s.transitMi);
  const toggle = (id: LeverId) => (v: boolean) => setOn((o) => ({ ...o, [id]: v }));

  const adu = useMemo(() => aduByRight(rows, hud, { level, household }), [rows, level, household]);
  const bonus = useMemo(() => densityBonus(rows), [rows]);
  const r60 = rent60TwoBedroom(hud);
  const gaps = useMemo(() => largestGaps(rows, hud, ami, homes), [rows, ami, homes]);
  const transit = useMemo(() => transitExtension(rows, transitMi, 1), [rows, transitMi]);
  const n = rows.length;

  useEffect(() => {
    const s = new Set<string>();
    if (on.adu) adu.changed.forEach((id) => s.add(id));
    if (on.bonus) bonus.changed.forEach((id) => s.add(id));
    if (on.voucher) gaps.top.forEach((g) => s.add(g.id));
    if (on.transit) transit.changed.forEach((id) => s.add(id));
    onFlips(s);
  }, [on, adu, bonus, gaps, transit, onFlips]);

  const sel = selectedId ? (placeById.get(selectedId) ?? null) : null;
  const selName = selectedId ? nameOf(selectedId) : null;
  const selShares = sel?.zoning?.shares ?? null;
  const selGap = selectedId && sel ? gapCost(selectedId, sel, hud, ami, homes) : null;
  const fits = fitsRent2br(hud, ami);
  const selAsking = usableAsking(sel);

  return (
    <section className="mt-6" aria-label="Policy simulator">
      <div className="mb-2 max-w-3xl">
        <h2 className="font-display text-title font-bold text-slate-900">Policy simulator</h2>
        <p className="text-small text-slate-600">
          Four levers: zoning, a density bonus, a rent subsidy and a transit extension. Each one is a written rule applied to the same tract data as the dashboard; switch it on to see what changes and
          where. Changed tracts get a dark outline on the map. The zoning table behind levers 1 and 2 is an unverified reading of Title 9.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        <Lever
          tag="Zoning"
          title="1 · ADU by right"
          does="Lets a homeowner add a backyard or basement apartment (an ADU) without a hearing in every residential district."
          rule={
            <>
              In {RESIDENTIAL_FAMILIES.join(', ')} districts: ADU conditional use → by right.
              <br />A tract counts when ≥ 5% of its land is in a by-right district.
            </>
          }
          on={on.adu}
          onToggle={toggle('adu')}
        >
          <BeforeAfter label="Tracts where an ADU is by right" before={adu.before.length} after={adu.after.length} of={n} />
          <BeforeAfter label="Anti-displacement plan lists an ADU" before={adu.recBefore.length} after={adu.recAfter.length} of={n} />
          <p className="text-caption text-slate-700">
            Newly recommended: <b>{adu.newlyRecommended.length}</b>. The Anti-displacement rules already list an ADU wherever there is need; zoning is printed beside it, never used as a gate. What
            changes is that line: "conditional use" → "by right" in <b>{adu.noteChanged.length}</b> tracts.
          </p>
          <Affected ids={adu.changed} />
          {selName && selShares && (
            <p className="text-caption text-slate-600">
              {selName}: {STATUS_WORD[statusFromShares(selShares, 'adu')]} → {STATUS_WORD[statusFromShares(selShares, 'adu', Object.fromEntries(RESIDENTIAL_FAMILIES.map((f) => [f, 'yes'])))]}
            </p>
          )}
        </Lever>

        <Lever
          tag="Zoning · incentive"
          title="2 · Density bonus"
          does="Where small apartment buildings need a hearing today, allow them by right if some homes are kept affordable."
          rule={
            <>
              In {SMALL_APT_CONDITIONAL_FAMILIES.join(', ')} districts: small apartment conditional → by right when ≥ {Math.round(BONUS_AFFORDABLE_SHARE * 100)}% of homes rent at or below the 60% AMI
              2-bedroom rent.
            </>
          }
          assumption={<>a {Math.round(BONUS_AFFORDABLE_SHARE * 100)}% set-aside at 60% AMI is this tool's example, not a city rule. HUD sets 60% limits at 1.2 × the 50% limits.</>}
          on={on.bonus}
          onToggle={toggle('bonus')}
        >
          <BeforeAfter label="Tracts where a small apartment is by right" before={bonus.before.length} after={bonus.after.length} of={n} />
          <Affected ids={bonus.changed} />
          {r60 && (
            <p className="text-caption text-slate-700">
              60% AMI 2-bedroom rent (3 persons): {r60.formula}. A 12-home building keeps {bonusAffordableHomes(12)} homes at that rent ({Math.round(BONUS_AFFORDABLE_SHARE * 100)}% of 12, rounded up);
              a {homes || 40}-home building keeps {bonusAffordableHomes(homes || 40)}.
            </p>
          )}
          {selName && r60 && (
            <p className="text-caption text-slate-600">
              {selName}:{' '}
              {selAsking == null
                ? 'no reliable asking rent, so the discount cannot be shown'
                : selAsking > r60.rent
                  ? `listings ask ${fmtDollars(selAsking)}; ${fmtDollars(selAsking)} − ${fmtDollars(r60.rent)} = ${fmtDollars(selAsking - r60.rent)} a month below market for each set-aside home`
                  : `listings ask ${fmtDollars(selAsking)}, already at or below the ${fmtDollars(r60.rent)} 60% rent, so the set-aside costs the owner nothing here`}
              .
            </p>
          )}
        </Lever>

        <Lever
          tag="Tax incentive"
          title="3 · Voucher to close the rent gap"
          does="Pay the difference between what listings ask and what a household can afford, for a set number of 2-bedroom homes."
          rule={
            <>
              yearly cost = max(0, asking − fits) × 12 × homes
              <br />
              fits = 2-bedroom rent at {ami}% AMI = {fmtDollars(fits)}
            </>
          }
          assumption="a gross subsidy estimate, not a program budget: no administration, no tenant income changes, rents held at today's asking level."
          on={on.voucher}
          onToggle={toggle('voucher')}
        >
          <label className="flex items-center justify-between gap-2 text-caption text-slate-700">
            Homes per tract
            <input
              type="number"
              min={0}
              max={10000}
              value={homesText}
              onChange={(e) => setHomesText(e.target.value)}
              className="w-20 rounded-md bg-white px-2 py-1 text-right text-small ring-1 ring-stone-300 tnum focus:outline-none focus:ring-violet-400"
            />
          </label>
          {selName && (
            <p className="rounded-lg bg-stone-50 px-2.5 py-1.5 text-caption text-slate-700 ring-1 ring-stone-200/70">
              <b>{selName}</b>:{' '}
              {selGap
                ? selGap.gap > 0
                  ? `${fmtDollars(selGap.asking)} − ${fmtDollars(selGap.fits)} = ${fmtDollars(selGap.gap)} a month; × 12 × ${homes} = ${fmtDollars(selGap.cost)} a year`
                  : `listings ask ${fmtDollars(selGap.asking)}, at or below ${fmtDollars(selGap.fits)}: $0, the market already fits at ${ami}% AMI`
                : 'no reliable asking rent here, so no estimate'}
            </p>
          )}
          <BeforeAfter label={`10 largest-gap tracts, ${homes} homes each, per year`} before="$0" after={fmtDollars(gaps.total)} />
          <ol className="space-y-0.5 text-caption text-slate-700">
            {gaps.top.map((g) => (
              <li key={g.id} className="flex justify-between gap-2">
                <span className="truncate">
                  {nameOf(g.id)} <span className="text-slate-500">{tractById.get(g.id)?.name.replace('Tract ', '')}</span>
                </span>
                <span className="shrink-0 tnum">
                  {fmtDollars(g.gap)}/mo → {fmtDollars(g.cost)}
                </span>
              </li>
            ))}
          </ol>
          <p className="text-caption text-slate-500">
            {gaps.withGap} of {n} tracts have a gap at {ami}% AMI.
          </p>
        </Lever>

        <Lever
          tag="Infrastructure"
          title="4 · Frequent transit extension"
          does="Extend frequent bus or T service so that places within a mile of a frequent stop today count as served."
          rule={
            <>
              Transit-first passes when the average resident lives within D miles of a stop with ≥ 64 weekday departures.
              <br />
              D: {MILES_LABEL[transitMi]} (your Place-tab choice) → 1 mile.
            </>
          }
          assumption="new frequent service reaches every tract within 1 mile of today's frequent stops; no cost or route is estimated."
          on={on.transit}
          onToggle={toggle('transit')}
        >
          <BeforeAfter label="Tracts that pass the Transit-first test" before={transit.before.length} after={transit.after.length} of={n} />
          <Affected ids={transit.changed} label="Newly pass" />
          {transitMi >= 1 && <p className="text-caption text-slate-600">Your Place-tab distance is already 1 mile, so this lever changes nothing.</p>}
          {selName && sel?.transit?.freq_dist_mi != null && (
            <p className="text-caption text-slate-600">
              {selName}: nearest frequent stop {sel.transit.freq_dist_mi.toFixed(2)} miles from the average resident.
            </p>
          )}
        </Lever>
      </div>
      <Explainer className="mt-3" title="What these levers leave out">
        <ul className="list-disc space-y-0.5 pl-5 text-caption text-slate-700">
          <li>Zoning changes say where a type becomes legal, not whether anyone builds it; the counts are tracts, not homes.</li>
          <li>The subsidy uses today's asking rents from listings with high or medium confidence; tracts without one are left out, not guessed.</li>
          <li>Distances are straight lines from 2020 census block points, averaged over residents, not walking routes.</li>
        </ul>
      </Explainer>
    </section>
  );
}
