// Browse a place (Ye, 2026-10-27): what it needs most, at a glance, before testing a project. The project that fits
// best (the same answer the map paints: the suggestion rules at the income level and residents set in the left panel,
// ordered by its weights; the renters' split, a size the renters could fill; and, when it differs, the income level
// with the most cost-burdened renters, one click away), who rents by income with the burdened share, rents against what each income can pay, who the
// renters are (household sizes, seniors, one-person), the ten-year trend, and what zoning allows (on the lot, in the
// tract). One "Test this project" button carries the fit into the inputs. Tract counts are HUD CHAS and ACS; ZIP
// counts are ACS and the ZIP file. Online only: loaded on demand.
import { useMemo, type ReactNode } from 'react';
import { DEMAND } from '../../../lib/demand/data';
import { depthHomes } from '../../../lib/demand/depth';
import { belowCut } from '../../../lib/demand/interp';
import { groupShares, householdsByGroup, recommendedMix } from '../../../lib/demand/mix';
import type { DemandUnit } from '../../../lib/demand/types';
import { zipById } from '../../../lib/equity/zip';
import { cx } from '../../../lib/format';
import { ceilingRent, confUsable, limitFor } from '../../../lib/place/afford';
import { capitalize, fmtShare, isNum } from '../../../lib/place/format';
import { isSeniorAge, LEVEL_LABEL, type PlanLevel } from '../../../lib/place/plan';
import { usePlan } from '../../../lib/place/planStore';
import type { Recommendation } from '../../../lib/place/recommend';
import { TYPOLOGY_LABEL } from '../../../lib/place/thresholds';
import type { HudTable, PlaceMeasures, Typology } from '../../../lib/place/types';
import { useDemandScores } from '../../../lib/place/useDemandScores';
import { zipExtra, zipTracts } from '../../../lib/place/zipView';
import { placeFor } from '../../../lib/place/data';
import { composeRec } from '../../../lib/policy/compose';
import { usePolicy } from '../../../lib/policy/store';
import { setDevType, type DevType } from '../../../lib/project/devType';
import { SIDE_A } from '../../../lib/project/side';
import type { SiteLot } from '../../../lib/project/store';
import { homesByRight, STANDARD_BY_CODE, storiesOf, tractCapacity } from '../../../lib/zoning/capacity';
import { statusFor } from '../project/TryLot';
import { useBrowse } from './browse';

const CARD = 'rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200';
const SUB = 'text-caption font-semibold uppercase tracking-wide text-slate-500';
const BAR = '#7c3aed';
const BURDEN = '#e11d48';
const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
/** The ACS window in short, "2020–24". */
const ACS = DEMAND.acs.replace(/^(\d{4})–\d\d(\d\d).*/, '$1–$2');
const usd = (v: number) => `$${n0(v)}`;

type Level3 = 30 | 50 | 80;
interface Band {
  label: string;
  hh: number;
  burdened: number | null;
}

/** Renter households by income band with the cost-burdened among them: the tract's CHAS bands, else the ZIP's ACS
 *  B25118 brackets cut at HUD's 3-person limits (burdened from the ZIP file, at or below 80% AMI). */
function bandsFor(place: PlaceMeasures | null, demand: DemandUnit | null, hud: HudTable, zip: string | null): Band[] {
  if (place) {
    const b = place.bands;
    const row = (label: string, id: keyof typeof b): Band => ({ label, hh: b[id]?.hh ?? 0, burdened: b[id]?.burden30 ?? null });
    return [row('≤30% AMI', 'le30'), row('30–50%', 'b30_50'), row('50–80%', 'b50_80'), row('80–100%', 'b80_100'), row('Over 100%', 'gt100')];
  }
  if (!demand) return [];
  const counts = demand.inc.map((x) => x[0]);
  const at = (limit: number | null) => (limit == null ? null : belowCut(counts, DEMAND.edges.income, limit).value);
  const l50 = limitFor(hud, 50, 3);
  const cuts = [at(limitFor(hud, 30, 3)), at(l50), at(limitFor(hud, 80, 3)), at(l50 == null ? null : l50 * 2)];
  const total = counts.every(isNum) ? (counts as number[]).reduce((a, c) => a + c, 0) : null;
  if (cuts.some((c) => !isNum(c)) || total == null) return [];
  const [c30, c50, c80, c100] = cuts as number[];
  const zb = zip ? zipById.get(zip)?.burdened : undefined;
  const bz = (k: string) => (zb && isNum(zb[k]) ? (zb[k] as number) : null);
  const b30 = bz('30'), b50 = bz('50'), b80 = bz('80');
  return [
    { label: '≤30% AMI', hh: c30, burdened: b30 },
    { label: '30–50%', hh: c50 - c30, burdened: b50 != null && b30 != null ? Math.max(0, b50 - b30) : null },
    { label: '50–80%', hh: c80 - c50, burdened: b80 != null && b50 != null ? Math.max(0, b80 - b50) : null },
    { label: '80–100%', hh: c100 - c80, burdened: null },
    { label: 'Over 100%', hh: total - c100, burdened: null },
  ];
}

/** The income level with the most cost-burdened renters (at or below 80% AMI). */
function needLevel(bands: Band[]): Level3 {
  const lv: Level3[] = [30, 50, 80];
  const scored = bands.slice(0, 3).map((b, i) => ({ lv: lv[i], v: b.burdened ?? b.hh }));
  return scored.sort((a, b) => b.v - a.v)[0]?.lv ?? 50;
}

function Bars({ rows, max, fmt }: { rows: { label: string; value: number; part?: number | null; note?: string }[]; max: number; fmt: (v: number) => string }) {
  return (
    <ul className="mt-1.5 space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="text-caption text-slate-700" title={r.note}>
          <div className="flex items-baseline justify-between gap-2">
            <span>{r.label}</span>
            <span className="font-semibold text-slate-900 tnum">{fmt(r.value)}</span>
          </div>
          <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-stone-200">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (r.value / Math.max(1, max)) * 100)}%`, background: BAR }} />
            {r.part != null && r.part > 0 && <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${Math.min(100, (r.part / Math.max(1, max)) * 100)}%`, background: BURDEN }} />}
          </div>
        </li>
      ))}
    </ul>
  );
}

const Stat = ({ k, v }: { k: string; v: ReactNode }) => (
  <div>
    <dt className="text-slate-500">{k}</dt>
    <dd className="font-semibold text-slate-900 tnum">{v}</dd>
  </div>
);

/** The units a type usually has, and its stories: small types at their own size; apartments and senior housing at
 *  the market depth (10% of the qualifying renters within a mile), within a range. */
const MIN_UNITS: Record<Typology, number> = { adu: 1, townhome: 1, duplex_triplex: 2, small_apartment: 4, senior: 4 };
const STORIES: Record<Typology, number> = { adu: 2, townhome: 3, duplex_triplex: 3, small_apartment: 4, senior: 4 };
function sizeFor(t: Typology, depth: number | null): number {
  if (t === 'adu') return 1;
  if (t === 'duplex_triplex') return 3;
  if (t === 'townhome') return 6;
  return Math.max(t === 'senior' ? 20 : 8, Math.min(t === 'senior' ? 60 : 40, depth ?? 24));
}

const devTypeFor = (t: Typology | null, level: PlanLevel): DevType => (t === 'senior' ? 'senior' : level === 'market' ? 'market' : 'affordable');

export interface OverviewProps {
  scope: 'parcel' | 'tract' | 'zip';
  /** The tract (Parcel, Tract) or the ZIP's main tracts read for the fit. */
  geoid: string | null;
  zip: string | null;
  place: PlaceMeasures | null;
  demand: DemandUnit | null;
  hud: HudTable;
  lot?: SiteLot;
  fitOrder?: Typology[];
  /** The map's suggestion per tract (a ZIP code tallies its tracts' leads from it). */
  suggestions?: Map<string, Recommendation>;
}

export default function Overview({ scope, geoid, zip, place, demand, hud, lot, fitOrder, suggestions }: OverviewProps) {
  const policy = usePolicy();
  const scores = useDemandScores();
  const level = usePlan((s) => s.level);
  const senior = usePlan((s) => isSeniorAge(s.age));
  const bands = useMemo(() => bandsFor(scope === 'zip' ? null : place, demand, hud, zip), [scope, place, demand, hud, zip]);
  const need = needLevel(bands);
  // The best fit: the map's answer. The suggestion rules at the income level and residents set on the left, ordered by
  // the weights, for the tract; across a ZIP code, the lead most of its tracts show.
  const fit = useMemo(() => {
    const leadAt = (g: string): Typology | null => {
      if (suggestions) return suggestions.get(g)?.lead ?? null;
      const p = placeFor(g);
      return p ? composeRec(p, hud, { level, senior, demand: scores?.get(g) }, policy).rec.lead : null;
    };
    if (scope !== 'zip') {
      const p = geoid ? placeFor(geoid) : null;
      const rec = p ? composeRec(p, hud, { level, senior, fitOrder, demand: geoid ? scores?.get(geoid) : undefined }, policy).rec : null;
      return { lead: rec?.lead ?? null, types: rec?.types.map((x) => x.typology) ?? [], tally: null as null | [string, number][] };
    }
    const tally = new Map<string, number>();
    for (const g of zip ? zipTracts(zip).main : []) {
      const l = leadAt(g) ?? 'none';
      tally.set(l, (tally.get(l) ?? 0) + 1);
    }
    const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    return { lead: (sorted.find(([k]) => k !== 'none')?.[0] as Typology | undefined) ?? null, types: [] as Typology[], tally: sorted };
  }, [scope, geoid, zip, level, senior, hud, policy, scores, fitOrder, suggestions]);
  const shares = demand ? groupShares(householdsByGroup(demand)) : null;
  const depth = scope !== 'zip' ? depthHomes(demand) : null;
  const std = lot?.district ? STANDARD_BY_CODE.get(lot.district) : undefined;
  const onLot = std && lot ? homesByRight(std, lot.sqft, lot.frontageFt ?? null, lot.depthFt ?? null) : null;
  // On a lot, the best fit is the first suggested type the lot allows by right (then the other types), at its size.
  const lead: Typology | null = useMemo(() => {
    if (!lot?.district || !std) return fit.lead;
    const order = [...new Set([...fit.types, 'townhome', 'duplex_triplex', 'small_apartment', 'senior'] as Typology[])];
    const max = onLot && !onLot.below_min ? onLot.homes : 0;
    return order.find((t) => statusFor(lot.district!, t).tone === 'yes' && max >= MIN_UNITS[t]) ?? null;
  }, [lot, std, onLot, fit]);
  const want = lead ? sizeFor(lead, depth?.homes ?? null) : 40;
  const size = onLot && onLot.homes > 0 ? Math.min(want, onLot.homes) : want;
  const mix = shares && size >= 4 ? recommendedMix(size, shares) : null;
  const burdenedLow = bands.slice(0, 3).reduce((a, b) => a + (b.burdened ?? 0), 0);
  const low = bands.slice(0, 3).reduce((a, b) => a + b.hh, 0);
  const listed = scope !== 'zip' && !!place && isNum(place.market?.asking_2br) && confUsable(place.market.asking_conf);
  const asking = scope === 'zip' ? (zip ? zipById.get(zip)?.asking ?? null : null) : listed ? place!.market.asking_2br : (place?.market?.safmr_2br ?? null);
  // A tract without usable listings shows its ZIP's Small Area Fair Market Rent instead, and says so.
  const askWord = scope === 'zip' || listed ? 'Asking, 2-bed (2025–26)' : 'Fair Market Rent, 2-bed (FY2026)';
  const medRent = demand?.rent_med?.[0] ?? null;
  const pays = ([30, 50, 80] as const).map((p) => ({ p, rent: ceilingRent(hud, p, 2)?.rent ?? null }));
  const needPays = pays.find((x) => x.p === level)?.rent ?? null;
  const g = demand?.g;
  const pctChange = (x: [number | null, number | null] | undefined) => (x && isNum(x[0]) && isNum(x[1]) && x[0] > 0 ? (x[1] - x[0]) / x[0] : null);
  const cap = geoid && scope !== 'zip' ? tractCapacity(geoid) : null;
  const renters = demand?.renters?.[0] ?? (scope === 'zip' && zip ? zipExtra.get(zip)?.renters['100'] ?? null : null);
  const chasTotal = bands.reduce((a, b) => a + b.hh, 0);
  const span = (y: number) => `${y - 4}–${String(y).slice(2)}`;
  const test = () => {
    setDevType(SIDE_A, devTypeFor(lead, level));
    SIDE_A.plan.getState().setPlan({ level, homes: size });
    if (lead) SIDE_A.project.setState({ stories: Math.min(STORIES[lead], std ? (storiesOf(std) ?? STORIES[lead]) : STORIES[lead]) });
    SIDE_A.project.setState({ mode: 'suggested' });
    useBrowse.getState().set('test');
  };
  const typeWord = lead ? capitalize(TYPOLOGY_LABEL[lead]) : lot ? 'Nothing fits this lot by right' : 'No type passes the rules here';
  // At the Parcel level the lot and its zoning come first (LotZoning, above this panel); the best fit moves to the end.
  const bestFit = (
    <section className="rounded-xl bg-emerald-50 px-3 py-2.5 ring-1 ring-emerald-200" data-best-fit>
      <div className={SUB}>
        {lot ? 'Best fit on this lot' : 'Best fit here'} · {LEVEL_LABEL[level]}
      </div>
      <div className="mt-0.5 text-lead font-semibold leading-tight text-emerald-700">{typeWord}</div>
      <p className="mt-0.5 text-small leading-snug text-slate-800">
        {level === 'market' ? 'At market rate' : `For renters ${LEVEL_LABEL[level]}`}
        {lead ? `; about ${size} unit${size === 1 ? '' : 's'}` : ''}
        {mix ? `, split ${mix.filter((l) => l.homes > 0).map((l) => `${l.homes} ${l.group === 'small' ? 'studio/1-bed' : l.group === 'two' ? '2-bed' : '3+ bed'}`).join(', ')}` : ''}.
        {lot && fit.lead && lead !== fit.lead ? ` The tract's best fit (${TYPOLOGY_LABEL[fit.lead]}) isn't allowed by right here.` : ''}
      </p>
      {need !== level && (
        <p className="mt-0.5 text-small leading-snug text-slate-800">
          Most cost-burdened here: renters {LEVEL_LABEL[need]}.{' '}
          <button type="button" onClick={() => usePlan.getState().setPlan({ level: need })} className="font-medium text-violet-700 underline hover:text-violet-900">
            Read at {LEVEL_LABEL[need]}
          </button>
        </p>
      )}
      {fit.tally && fit.tally.length > 1 && <p className="mt-0.5 text-caption leading-snug text-slate-600">Across its tracts: {fit.tally.map(([k, n]) => `${k === 'none' ? 'no suggestion' : TYPOLOGY_LABEL[k as Typology]} ${n}`).join(' · ')}.</p>}
      <button type="button" onClick={test} className="mt-2 w-full rounded-lg bg-violet-600 px-2 py-1.5 text-small font-semibold text-white hover:bg-violet-700">
        Test this project
      </button>
    </section>
  );
  return (
    <div className="space-y-3" data-overview={scope}>
      {!lot && bestFit}

      {bands.length > 0 && (
        <section className={CARD} data-overview-income>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-small font-semibold text-slate-900">Renters by income</h3>
            <span className="flex items-center gap-2 text-caption text-slate-600">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: BAR }} />
                Renters
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: BURDEN }} />
                Cost-burdened
              </span>
            </span>
          </div>
          <Bars rows={bands.map((b) => ({ label: b.label, value: b.hh, part: b.burdened, note: b.burdened != null ? `${n0(b.burdened)} paying over 30% of income` : undefined }))} max={Math.max(...bands.map((b) => b.hh))} fmt={n0} />
          <p className="mt-1.5 text-caption leading-snug text-slate-600">
            {low > 0 && burdenedLow > 0 ? `${fmtShare(burdenedLow / low)} of lower-income renters pay over 30% of income. ` : ''}
            {isNum(demand?.inc_med?.[0]) ? `Median renter income: ${usd(demand!.inc_med[0] as number)} (ACS ${ACS}).` : ''}
          </p>
          <p className="text-caption leading-snug text-slate-600">{scope === 'zip' ? `Renter households by income, ACS ${ACS}.` : `${n0(chasTotal)} renter households by income, HUD CHAS 2018–22.`}</p>
        </section>
      )}

      <section className={CARD} data-overview-rent>
        <h3 className="text-small font-semibold text-slate-900">Rent</h3>
        <Bars
          rows={[
            ...(isNum(asking) ? [{ label: askWord, value: asking as number }] : []),
            ...(isNum(medRent) ? [{ label: `Median paid, all sizes (ACS ${ACS})`, value: medRent as number }] : []),
            ...pays.filter((x) => isNum(x.rent)).map((x) => ({ label: `Affordable at ${x.p}% AMI, 2-bed`, value: x.rent as number })),
          ]}
          max={Math.max(1, asking ?? 0, medRent ?? 0, ...pays.map((x) => x.rent ?? 0))}
          fmt={usd}
        />
        {isNum(asking) && isNum(needPays) && <p className="mt-1.5 text-caption leading-snug text-slate-600">{(asking as number) > (needPays as number) ? `Renters ${LEVEL_LABEL[level]} are ${usd((asking as number) - (needPays as number))} a month short of a 2-bed.` : `Renters ${LEVEL_LABEL[level]} can afford a 2-bed here.`}</p>}
      </section>

      <section className={CARD} data-overview-tenants>
        <h3 className="text-small font-semibold text-slate-900">Renters</h3>
        {shares && (
          <Bars
            rows={[
              { label: '1–2 people', value: shares.small },
              { label: '3–4 people', value: shares.two },
              { label: '5 or more', value: shares.large },
            ]}
            max={1}
            fmt={(v) => fmtShare(v)}
          />
        )}
        <dl className="mt-2 grid grid-cols-3 gap-2 rounded-lg bg-stone-50 px-2.5 py-1.5 text-caption">
          <Stat k="Renter households" v={isNum(renters) ? n0(renters as number) : '—'} />
          <Stat k="Age 65+" v={isNum(demand?.shares.age65?.[0]) ? fmtShare(demand!.shares.age65[0] as number) : '—'} />
          <Stat k="Living alone" v={isNum(demand?.shares.one_person?.[0]) ? fmtShare(demand!.shares.one_person[0] as number) : '—'} />
        </dl>
        <p className="mt-1.5 text-caption leading-snug text-slate-600">
          ACS {ACS}.{scope !== 'zip' && chasTotal > 0 && isNum(renters) ? ` HUD CHAS 2018–22 counts ${n0(chasTotal)}, so the totals differ.` : ''}
        </p>
      </section>

      {g && (
        <section className={CARD} data-overview-trend>
          <h3 className="text-small font-semibold text-slate-900">
            {span(DEMAND.growth_years[0])} to {span(DEMAND.growth_years[1])}
          </h3>
          <dl className="mt-1 grid grid-cols-3 gap-2 text-caption">
            {[
              ['Renter households', pctChange(g.renters)],
              ['Median rent', pctChange(g.rent)],
              ['Household income', pctChange(g.income)],
            ].map(([k, v]) => (
              <Stat key={k as string} k={k as string} v={v == null ? '—' : <span className={cx((v as number) >= 0 ? 'text-emerald-700' : 'text-rose-700')}>{`${(v as number) >= 0 ? '+' : '−'}${Math.round(Math.abs(v as number) * 100)}%`}</span>} />
            ))}
          </dl>
          <p className="mt-1 text-caption leading-snug text-slate-600">
            ACS 5-year. Income is the median of all households.
            {pctChange(g.rent) != null && pctChange(g.income) != null ? ` ${pctChange(g.rent)! > pctChange(g.income)! ? 'Rents grew faster than incomes.' : 'Incomes kept up with rents.'}` : ''} {n0(demand?.lihtc?.li_units ?? 0)} tax credit homes here.
          </p>
        </section>
      )}

      {cap && (
        <section className={CARD} data-overview-zoning>
          <h3 className="text-small font-semibold text-slate-900">Zoning</h3>
          <p className="mt-0.5 text-small leading-snug text-slate-800">
            {n0(cap.vacant.lots)} vacant lots allow about <b className="font-semibold">{n0(cap.vacant.homes)} homes by right</b>, plus {n0(cap.gentle.homes)} on existing 2–3 unit lots.
          </p>
        </section>
      )}
      {lot && bestFit}
      <p className="px-1 text-caption leading-snug text-slate-500">Sources: HUD CHAS 2018–22, ACS {ACS}, asking rents 2025–26, HUD FY2026 limits.</p>
    </div>
  );
}
