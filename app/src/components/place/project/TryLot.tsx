// "Try a lot": pick a zoning district and a lot size, read what Pittsburgh's code allows by right on it (homes,
// height, floor area, which building types), whether the project's homes fit and on how large a lot, and send the
// answer to the project. The same rule as the tract totals (lib/zoning/capacity). The inputs (LotInputs) sit in the left
// panel; the answer (TryLot) in the right.
import { cx } from '../../../lib/format';
import { capitalize, fmtCount, isNum } from '../../../lib/place/format';
import { TYPOLOGY_LABEL } from '../../../lib/place/thresholds';
import type { Typology } from '../../../lib/place/types';
import { useSide } from '../../../lib/project/side';
import { CAPACITY, districtName, homesByRight, inclusionaryHomes, lotFor, STANDARD_BY_CODE, STANDARDS, storiesOf, type TractCapacity, type UseKey, type UseStatus } from '../../../lib/zoning/capacity';
import { InfoTip } from '../../primitives';

/** The use rows a building type needs (an ADU is its own overlay rule). */
export const USE_FOR: Record<Typology, UseKey[]> = {
  adu: [],
  duplex_triplex: ['two_unit', 'three_unit'],
  townhome: ['single_attached'],
  small_apartment: ['multi_unit'],
  senior: ['elderly_limited', 'elderly_general'],
};
const RANK: UseStatus[] = ['P', 'P/S', 'A', 'S', 'C', 'N'];
export const STATUS_WORD: Record<UseStatus, string> = { P: 'by right', 'P/S': 'by right on narrow lots', A: 'administrator exception', S: 'special exception', C: 'conditional use', N: 'not allowed' };
const TYPES: Typology[] = ['townhome', 'duplex_triplex', 'small_apartment', 'senior', 'adu'];

/** How a district treats a building type: the best path among the uses it needs. */
export function statusFor(code: string, t: Typology): { word: string; tone: 'yes' | 'hearing' | 'no' | 'na' } {
  const s = STANDARD_BY_CODE.get(code);
  if (!s) return { word: STANDARDS.not_computed[code] ? 'not computed' : 'n/a', tone: 'na' };
  if (t === 'adu') return { word: 'ADU overlay only', tone: 'no' };
  const best = USE_FOR[t].map((u) => s.uses[u]).sort((a, b) => RANK.indexOf(a) - RANK.indexOf(b))[0];
  if (!best) return { word: 'n/a', tone: 'na' };
  return { word: STATUS_WORD[best], tone: best === 'P' || best === 'P/S' ? 'yes' : best === 'N' ? 'no' : 'hearing' };
}

const TONE: Record<'yes' | 'hearing' | 'no' | 'na', string> = {
  yes: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  hearing: 'bg-amber-50 text-amber-900 ring-amber-200',
  no: 'bg-stone-100 text-slate-500 ring-stone-200',
  na: 'bg-stone-100 text-slate-500 ring-stone-200',
};
const MARK = { yes: '✓', hearing: '~', no: '✗', na: '·' } as const;
const FIELD = 'w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-small text-slate-900 tnum focus:border-violet-500 focus:outline-none';
const round100 = (v: number) => Math.max(100, Math.round(v / 100) * 100);

export type LotProps = { geoid: string; cap: TractCapacity; lead: Typology | null; homes: number; homesExample: boolean };

/** The lot being tried and what the code allows on it, on the side in context (lib/project/side). */
export function useLot({ geoid, cap, lead, homes }: LotProps) {
  const side = useSide();
  const site = side.project((s) => s.sites[geoid]) ?? {};
  const setSite = (p: Partial<typeof site>) => side.project.setState((s) => ({ sites: { ...s.sites, [geoid]: { ...s.sites[geoid], ...p } } }));
  const setHomes = (n: number) => side.plan.getState().setPlan({ homes: n });
  const here = Object.keys(cap.districts).filter((c) => STANDARD_BY_CODE.has(c));
  const elsewhere = STANDARDS.districts.map((d) => d.code).filter((c) => !here.includes(c));
  // Opens on a district here that allows the suggested type by right, else the most common one here.
  const byRightHere = lead ? here.find((c) => statusFor(c, lead).tone === 'yes') : undefined;
  const district = site.district && STANDARD_BY_CODE.has(site.district) ? site.district : byRightHere ?? here[0] ?? STANDARDS.districts[0].code;
  const std = STANDARD_BY_CODE.get(district)!;
  // A lot nobody has typed opens at the typical vacant lot in the tract.
  const typical = isNum(cap.vacant.median_sqft) && cap.vacant.median_sqft > 0 ? round100(cap.vacant.median_sqft) : null;
  const lotSqft = site.lotSqft ?? typical ?? Math.max(std.min_lot_sqft, 5000);
  const frontage = site.frontageFt ?? null;
  const calc = homesByRight(std, lotSqft, frontage, frontage ? lotSqft / frontage : null);
  const need = lotFor(std, homes, frontage);
  const stories = storiesOf(std);
  const parking = STANDARDS.parking.rules.find((r) => r.use === 'Multi-unit');
  const z = STANDARDS.inclusionary;
  const inIzo = (cap.izo_share ?? 0) > 0.5;
  const a = CAPACITY.assumptions;
  const num = (x: string) => (x === '' || !Number.isFinite(Number(x)) ? null : Math.max(0, Number(x)));
  const presets = [
    typical && { label: 'Typical vacant lot here', v: typical },
    std.min_lot_sqft > 0 && { label: 'District minimum', v: std.min_lot_sqft },
    { label: '5,000', v: 5000 },
    { label: '10,000', v: 10000 },
    { label: '½ acre', v: 21780 },
    { label: '1 acre', v: 43560 },
  ].filter(Boolean) as { label: string; v: number }[];

  return { setSite, setHomes, here, elsewhere, district, std, lotSqft, frontage, calc, need, stories, parking, z, inIzo, a, num, presets };
}

/** The lot's inputs, for the left panel: a district, the lot area and width, and a lot large enough for the homes. */
export function LotInputs(props: LotProps) {
  const { cap, homes } = props;
  const { setSite, here, elsewhere, district, lotSqft, frontage, calc, need, num, presets } = useLot(props);
  return (
    <div className="space-y-2" data-lot-inputs>
      <label className="block">
        <span className="text-caption font-medium text-slate-600">Zoning district</span>
        <select className={cx(FIELD, 'mt-0.5')} value={district} onChange={(e) => setSite({ district: e.target.value })} aria-label="Zoning district">
          {here.length > 0 && (
            <optgroup label="In this tract">
              {here.map((c) => (
                <option key={c} value={c}>
                  {c} · {districtName(c)} ({fmtCount(cap.districts[c])} lots)
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Elsewhere in the city">
            {elsewhere.map((c) => (
              <option key={c} value={c}>
                {c} · {districtName(c)}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <div className="flex gap-2">
        <label className="block min-w-0 flex-1">
          <span className="text-caption font-medium text-slate-600">Lot area, sq ft</span>
          <input type="number" min={0} step={100} className={cx(FIELD, 'mt-0.5')} value={lotSqft || ''} onChange={(e) => setSite({ lotSqft: num(e.target.value) })} aria-label="Lot area in square feet" />
        </label>
        <label className="block w-24">
          <span className="text-caption font-medium text-slate-600">Width, ft</span>
          <input type="number" min={0} step={5} className={cx(FIELD, 'mt-0.5')} value={frontage ?? ''} placeholder="square lot" onChange={(e) => setSite({ frontageFt: num(e.target.value) })} aria-label="Lot width along the street in feet" />
        </label>
      </div>
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setSite({ lotSqft: p.v })}
            className={cx('rounded-full px-2 py-0.5 text-caption ring-1 transition-colors', lotSqft === p.v ? 'bg-violet-600 text-white ring-violet-500' : 'bg-white text-slate-700 ring-stone-300 hover:bg-violet-50')}
          >
            {p.label}
            {p.label.startsWith('Typical') || p.label.startsWith('District') ? ` · ${fmtCount(p.v)}` : ''}
          </button>
        ))}
      </div>
      {homes > 0 && calc.homes < homes && need.kind === 'fits' && (
        <button type="button" className="text-caption font-medium text-violet-700 underline hover:text-violet-900" onClick={() => setSite({ lotSqft: need.lotSqft })}>
          Try a {fmtCount(need.lotSqft)} sq ft lot, enough for {fmtCount(homes)} homes
        </button>
      )}
    </div>
  );
}

/** What the code allows on the lot set in the left panel, for the right panel. */
export default function TryLot(props: LotProps) {
  const { lead, homes, homesExample } = props;
  const { district, std, calc, need, stories, parking, z, inIzo, a, lotSqft } = useLot(props);
  return (
    <div className="rounded-xl bg-violet-50/60 p-3 ring-1 ring-violet-200/70" data-try-lot>
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-small font-semibold text-slate-900">Try a lot</h4>
        <span className="text-caption text-slate-500">
          {district} · {fmtCount(lotSqft)} sq ft, set on the left
        </span>
      </div>

      <div className="mt-2 rounded-lg bg-white p-2.5 ring-1 ring-stone-200/80" aria-live="polite">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-lead font-semibold text-slate-900 tnum">
            {calc.homes > 0 ? `${fmtCount(calc.homes)} ${calc.homes === 1 ? 'home' : 'homes'} by right` : 'No homes by right'}
          </div>
          <InfoTip label="How this is worked out" align="end" width={300}>
            <span className="block text-left">
              {calc.formula ? `${calc.formula}.` : 'Enter a lot area.'} Width left empty reads the lot as a square. Envelope districts (RM and the mixed-use districts) count {fmtCount(a.home_sqft)} sq ft a home and {Math.round(a.efficiency * 100)}% of the floor area as homes. {std.section}. {std.notes.join(' ')}
            </span>
          </InfoTip>
        </div>
        <p className="text-caption text-slate-600">
          {calc.below_min ? `This lot is under the ${fmtCount(std.min_lot_sqft)} sq ft minimum for ${district}.` : `${district}: up to ${std.max_height_ft} ft${stories ? `, ${stories} stories` : ''}${calc.floor_area != null ? `, about ${fmtCount(calc.floor_area)} sq ft of floor area` : std.max_homes ? `, at most ${std.max_homes} ${std.max_homes === 1 ? 'home' : 'homes'} a lot` : ''}.`}
        </p>

        <ul className="mt-2 flex flex-wrap gap-1" aria-label="Building types in this district">
          {TYPES.map((t) => {
            const s = statusFor(district, t);
            return (
              <li key={t} title={`${capitalize(TYPOLOGY_LABEL[t])}: ${s.word}`} className={cx('rounded-full px-2 py-0.5 text-caption ring-1', TONE[s.tone], t === lead && 'font-semibold ring-2')}>
                {MARK[s.tone]} {capitalize(TYPOLOGY_LABEL[t])} <span className="font-normal">· {s.word}</span>
              </li>
            );
          })}
        </ul>

        {homes > 0 && (
          <p className="mt-2 border-t border-stone-100 pt-2 text-small leading-snug text-slate-800">
            <span className="text-slate-600">Your project, {fmtCount(homes)} homes{homesExample ? ' (example)' : ''}: </span>
            {calc.homes >= homes ? (
              <b className="text-emerald-700">fits on this lot.</b>
            ) : need.kind === 'fits' ? (
              <>
                needs a lot of about <b className="tnum">{fmtCount(need.lotSqft)} sq ft</b> in {district}.
              </>
            ) : need.kind === 'cap' ? (
              <>
                {district} allows at most {need.max} {need.max === 1 ? 'home' : 'homes'} a lot. Pick an RM or mixed-use district.
              </>
            ) : (
              'does not fit in this district.'
            )}
          </p>
        )}

        {calc.homes > 0 && (
          <p className="mt-2 text-caption leading-snug text-slate-600">
            {parking && isNum(parking.min_per_home) && !std.max_homes && `Parking (${STANDARDS.parking.section}): ${fmtCount(calc.homes * parking.min_per_home)}–${fmtCount(calc.homes * (parking.max_per_home ?? 0))} spaces, not taken out of the floor area. `}
            {inIzo && calc.homes >= z.min_homes && `Inclusionary overlay: ${inclusionaryHomes(calc.homes, true)} of these homes at ${z.ami_rental}% AMI. `}
            Not a zoning determination: setbacks next to houses, slopes and parking can lower it.
          </p>
        )}
      </div>
    </div>
  );
}
