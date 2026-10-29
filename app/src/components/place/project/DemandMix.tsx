// "Who needs it": renter households in the tract and its ZIP code against the city (ACS 2020–24), what that says
// about the building type (lib/demand/order) and the unit mix (lib/demand/mix), how today's renters are housed and
// what their homes rent for, how deep the qualifying market is, and the tax credit homes already nearby.
import { cx } from '../../../lib/format';
import { DEMAND, demandCity } from '../../../lib/demand/data';
import { belowCut } from '../../../lib/demand/interp';
import { belowRent, captureRate, compareGroups, SIZE_GROUP_HOUSEHOLDS, SIZE_GROUP_LABEL, SIZE_GROUP_SHORT } from '../../../lib/demand/mix';
import { aheadBecause, FIXED_ORDER_STANCES, type scoreTypes } from '../../../lib/demand/order';
import { renterGrowth, SIGNAL_LABEL, SIGNAL_MARGIN, SIGNAL_SHORT, type Signal } from '../../../lib/demand/signals';
import type { DemandUnit, Share } from '../../../lib/demand/types';
import { ceilingRent, limitFor } from '../../../lib/place/afford';
import { fmtCount, fmtDollars, fmtShare, isNum } from '../../../lib/place/format';
import type { PlanLevel } from '../../../lib/place/plan';
import { LEVEL_LABEL } from '../../../lib/place/plan';
import { recommend, type Recommendation } from '../../../lib/place/recommend';
import { planOptions } from '../../../lib/place/suggest';
import { STANCE_LABEL, TYPOLOGY_LABEL } from '../../../lib/place/thresholds';
import type { HudTable, PlaceMeasures, Typology } from '../../../lib/place/types';
import { AFFORDABLE_LEVELS, homesAt, type ProjectMix } from '../../../lib/project/plan';
import type { ProjectModel } from './useProjectModel';
import { useSide } from '../../../lib/project/side';
import { BEDROOM_LABEL, MIX_LEVEL_LABEL, MIX_LEVELS, type Counts, type MixLevel } from '../../../lib/project/store';
import { Explainer, InfoTip } from '../../primitives';
import { cumulative } from '../Affordability';
import { Facts, SourceLine, Table } from '../shared';

const READ: Record<string, string> = { up: 'above the city', down: 'below the city' };

/** A share with its margin of error; the figure that decided the signal is bold with its direction. */
function ShareCell({ s, on, dir }: { s: Share | null; on: boolean; dir: Signal['dir'] }) {
  if (!s || !isNum(s[0])) return <span className="text-slate-500">n/a</span>;
  return (
    <span className={cx('whitespace-nowrap', on && 'font-semibold text-violet-800')}>
      {fmtShare(s[0])}
      {isNum(s[1]) && <span className="text-caption font-normal text-slate-500">±{Math.round(s[1] * 100)}</span>}
      {on && dir && <span aria-label={READ[dir]}>{dir === 'up' ? ' ↑' : ' ↓'}</span>}
    </span>
  );
}
const FIELD = 'w-12 rounded-md border border-stone-300 bg-white px-1 py-0.5 text-right text-small text-slate-900 tnum focus:border-violet-500 focus:outline-none';

const growthWord = (u: DemandUnit | null) => {
  const g = renterGrowth(u);
  return g == null ? 'n/a' : `${g >= 0 ? '+' : '−'}${Math.round(Math.abs(g) * 100)}%`;
};
const rtiWord = (u: DemandUnit | null) => (u && isNum(u.rent_to_income) ? fmtShare(u.rent_to_income) : 'n/a');

/** What demand did to the lead type, in one sentence. */
function OrderLine({ rec, before, scores }: { rec: Recommendation; before: Recommendation; scores: ReturnType<typeof scoreTypes> }) {
  const lead = rec.lead;
  if (FIXED_ORDER_STANCES.includes(rec.stance))
    return <>{STANCE_LABEL[rec.stance]} keeps its own order ({rec.stance === 'transit_first' ? 'densest first' : 'attached and multi-unit first'}); renter demand is shown below but does not reorder it.</>;
  if (!lead) return <>No type is suggested here at this level, so renter demand has nothing to order.</>;
  const top = scores[lead];
  if (before.lead && before.lead !== lead)
    return (
      <>
        Renter demand puts <b className="text-slate-900">{TYPOLOGY_LABEL[lead]}</b> first among the suggested types; on the weights alone it was {TYPOLOGY_LABEL[before.lead]}. {aheadBecause(top, scores[before.lead])}.
      </>
    );
  if (top.score > 0)
    return (
      <>
        Renter demand agrees: <b className="text-slate-900">{TYPOLOGY_LABEL[lead]}</b> first ({top.because.map((s) => `${SIGNAL_LABEL[s.key].toLowerCase()} ${READ[s.dir!]}`).join('; ')}).
      </>
    );
  return <>No demand signal favors one suggested type over another here, so the weighted order stands ({TYPOLOGY_LABEL[lead]} first).</>;
}

/** Homes by income level and size: inputs in the left panel, or (without `onEdit`) the same grid read only. */
function MixEditor({ mix, onEdit, head = 'Homes' }: { mix: ProjectMix; onEdit?: (c: Counts) => void; head?: string }) {
  const set = (l: MixLevel, b: number, v: number) => {
    const next = Object.fromEntries(MIX_LEVELS.map((x) => [x, [...mix.counts[x]]])) as Counts;
    next[l][b] = Math.max(0, Math.round(v));
    onEdit?.(next);
  };
  return (
    <div className="mt-2 overflow-x-auto rounded-xl ring-1 ring-stone-200/80">
      <table className="w-full text-small">
        <thead>
          <tr className="bg-stone-50 text-caption text-slate-600">
            <th className="px-2 py-1 text-left font-medium">{head}</th>
            {BEDROOM_LABEL.map((b) => (
              <th key={b} className="px-1 py-1 text-right font-medium">
                {b}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {MIX_LEVELS.map((l) => (
            <tr key={l}>
              <td className="whitespace-nowrap px-2 py-1 text-slate-800">{MIX_LEVEL_LABEL[l]}</td>
              {mix.counts[l].map((v, b) => (
                <td key={b} className="px-1 py-1 text-right">
                  {onEdit ? <input type="number" min={0} step={1} inputMode="numeric" className={FIELD} value={v} aria-label={`${MIX_LEVEL_LABEL[l]} ${BEDROOM_LABEL[b]}`} onChange={(e) => set(l, b, Number(e.target.value) || 0)} /> : <span className={cx('tnum', v > 0 ? 'text-slate-900' : 'text-slate-400')}>{v}</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DemandMix({ model, place, hud, rec, fitOrder }: { model: ProjectModel; place: PlaceMeasures; hud: HudTable; rec: Recommendation; fitOrder: Typology[] }) {
  const plan = useSide().plan();
  const { tract, zip, zipId, signals, scores, mix } = model;
  const city = demandCity();
  if (!tract) return null;
  const before = recommend(place, hud, rec.stance, planOptions(plan, fitOrder));
  const level: PlanLevel = plan.level;
  const pct = level === 'market' ? null : level;

  // Market depth: proposed homes with an income limit against the renter households under it.
  const proposed = homesAt(mix.counts, AFFORDABLE_LEVELS);
  const topLevel = (['80', '60', '50', '30'] as MixLevel[]).find((l) => mix.counts[l].some((n) => n > 0)) ?? null;
  const limitNum = topLevel == null ? null : topLevel === '60' ? (limitFor(hud, 50, 3) ?? NaN) * 1.2 : limitFor(hud, Number(topLevel) as 30 | 50 | 80, 3);
  const zipQualified = zip && isNum(limitNum) ? belowCut(zip.inc.map((x) => x[0]), DEMAND.edges.income, limitNum) : null;
  const zipCapture = zipQualified ? captureRate(proposed, zipQualified.value, zip?.lihtc?.li_units ?? null) : null;
  const chasBand = topLevel === '30' ? 'le30' : topLevel === '50' ? 'b30_50' : topLevel === '80' ? 'b50_80' : null;
  const tractQualified = chasBand ? cumulative(place, chasBand).hh : null;
  const tractCapture = chasBand ? captureRate(proposed, tractQualified, tract.lihtc?.li_units ?? null) : null;

  const housed = compareGroups(tract);
  const lt = tract.lihtc;
  const mile = lt?.mile;
  const yrs = DEMAND.lihtc;

  return (
    <div className="space-y-2.5" data-demand-mix>
      <p className="text-small leading-snug text-slate-800">
        <OrderLine rec={rec} before={before} scores={scores} />
      </p>

      <Table
        caption="Renter demand signals"
        head={[
          <span className="inline-flex items-center gap-1">
            ACS {DEMAND.acs}
            <InfoTip label="How to read this table" align="start" width={300}>
              <span className="block text-left">
                Renter households in the tract and its ZIP code against the city, with their 90% margin of error. Bold with an arrow: the figure that differs from the city by more than its mark ({Math.round(SIGNAL_MARGIN.renter * 100)} points; {Math.round(SIGNAL_MARGIN.large5 * 100)} for renters of 5+, {Math.round(SIGNAL_MARGIN.small_bldg * 100)} for 1–4 unit buildings) and by more than its margin of error. The tract is read first, its ZIP code when the tract's margin is too wide. The grey rows are context and never count. Hover a row for the arithmetic.
              </span>
            </InfoTip>
          </span>,
          'Tract',
          zipId ? `ZIP ${zipId}` : 'ZIP',
          'City',
        ]}
        rows={[
          ...signals.map((s) => ({
            key: s.key,
            title: `${SIGNAL_LABEL[s.key]}: ${s.sentence}`,
            cells: [SIGNAL_SHORT[s.key], <ShareCell s={s.tract} on={s.from === 'tract'} dir={s.dir} />, <ShareCell s={s.zip} on={s.from === 'zip'} dir={s.dir} />, isNum(s.city) ? fmtShare(s.city) : 'n/a'],
          })),
          { key: 'growth', muted: true, title: `Renter households ${DEMAND.growth_years[0]} → ${DEMAND.growth_years[1]} (households × renter share, ACS 2010–14 and 2020–24 on 2020 tracts). Context only: no margin of error, so it never counts.`, cells: [`Renter growth since ${DEMAND.growth_years[0]}`, growthWord(tract), growthWord(zip), growthWord(city)] },
          { key: 'rti', muted: true, title: 'Median gross rent × 12 ÷ renter median household income (B25064, B25119). Context only.', cells: ['Rent ÷ renter income', rtiWord(tract), rtiWord(zip), rtiWord(city)] },
        ]}
      />

      <div className="rounded-xl bg-white p-2.5 ring-1 ring-stone-200/80">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="text-small font-semibold text-slate-900">
            Unit mix <span className="font-normal text-slate-600">· {mix.homes} homes{mix.mode === 'suggested' ? ` at ${LEVEL_LABEL[level]}` : `, ${proposed} with an income limit`}</span>
          </h4>
          <span className="shrink-0 text-caption text-slate-500">{mix.mode === 'suggested' ? "Renters' split" : 'Your mix'}, set on the left</span>
        </div>
        {mix.mode === 'suggested' ? (
          mix.lines ? (
            <>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {mix.lines.map((l) => (
                  <div key={l.group} className="rounded-lg bg-stone-50 px-2 py-1.5 text-center" title={`Households of ${SIZE_GROUP_HOUSEHOLDS[l.group]}: ${l.formula}`}>
                    <div className="text-lead font-semibold text-slate-900 tnum">{l.homes}</div>
                    <div className="text-caption text-slate-600">{SIZE_GROUP_SHORT[l.group]}</div>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-caption leading-snug text-slate-600">
                Split like the renter households of the {mix.from === 'zip' ? 'ZIP code' : 'tract'} by size
                {mix.example && ': 40 homes is an example, set Homes on the left'}. Studios are your call: Unit mix on the left sets homes by income level and size.
              </p>
            </>
          ) : (
            <p className="mt-1 text-caption text-slate-600">Household sizes are not available here, so every home is shown as a 2-bedroom.</p>
          )
        ) : (
          <MixEditor mix={mix} />
        )}
      </div>

      <div className="space-y-1.5 px-0.5">
        <Explainer title="How renters are housed today">
          <Table
            caption="Renter households by size and renter homes by bedrooms"
            head={['', 'Households', 'Homes']}
            rows={housed.map((g) => ({
              key: g.group,
              cells: [
                <span>
                  {SIZE_GROUP_SHORT[g.group]} <span className="text-caption text-slate-500">· {SIZE_GROUP_HOUSEHOLDS[g.group]}</span>
                </span>,
                <span className="whitespace-nowrap">{isNum(g.households.value) ? fmtCount(g.households.value) : 'n/a'}{isNum(g.households.moe) && <span className="text-caption text-slate-500">±{fmtCount(g.households.moe)}</span>}</span>,
                <span className="whitespace-nowrap">{isNum(g.homes.value) ? fmtCount(g.homes.value) : 'n/a'}{isNum(g.homes.moe) && <span className="text-caption text-slate-500">±{fmtCount(g.homes.moe)}</span>}</span>,
              ],
            }))}
          />
          <ul className="mt-1.5 space-y-0.5 text-caption leading-snug text-slate-700">
            {housed.some((g) => g.gap != null) ? housed.filter((g) => g.gap != null).map((g) => <li key={g.group}>{SIZE_GROUP_LABEL[g.group]}: {g.sentence}.</li>) : <li>Households and homes match within the margins of error at every size.</li>}
          </ul>
          <p className="mt-1.5 text-caption leading-snug text-slate-600">Households (B25009) and homes (B25042) describe the same occupied homes, so a gap says how renters are housed today, such as small households in larger homes; it is not a count of missing homes.</p>
        </Explainer>

        {pct != null && (
          <Explainer title={`Homes renting below the rent that fits at ${LEVEL_LABEL[level]}`}>
            <Table
              caption="Renter homes below the rent that fits"
              head={['', 'Rent that fits', 'Homes below it', 'Of homes with rent']}
              rows={([0, 1, 2, 3] as const).map((br) => {
                const c = ceilingRent(hud, pct, br);
                const b = c ? belowRent(tract, br, c.rent, DEMAND.edges.rent) : null;
                return {
                  key: String(br),
                  title: b?.formula,
                  cells: [BEDROOM_LABEL[br], c ? fmtDollars(c.rent) : 'n/a', b && isNum(b.value) ? `${b.lowerBound ? 'at least ' : 'about '}${fmtCount(b.value)}` : 'n/a', b && isNum(b.withRent) ? fmtCount(b.withRent) : 'n/a'],
                };
              })}
            />
            <p className="mt-1.5 text-caption leading-snug text-slate-600">Gross rent brackets of B25068 (under $300, $300–499, $500–749, $750–999, $1,000–1,499, $1,500 or more), counted straight-line inside the bracket the rent falls in; the open top bracket is never split. A home renting below the line is not reserved for anyone: it holds whoever lives there now.</p>
          </Explainer>
        )}

        <Explainer title="How deep the qualifying market is">
          {proposed > 0 && topLevel ? (
            <div className="space-y-1.5 text-small leading-snug text-slate-800">
              <p>
                The mix has <b>{proposed}</b> homes with an income limit, the highest at {MIX_LEVEL_LABEL[topLevel]}.
              </p>
              <p>
                <span className="font-medium">ZIP {zipId}:</span>{' '}
                {zipQualified && isNum(zipQualified.value) ? (
                  <>
                    {zipQualified.lowerBound ? 'at least ' : 'about '}
                    {fmtCount(zipQualified.value)} renter households earn under {fmtDollars(limitNum)} (the 3-person limit{topLevel === '60' ? ', 50% limit × 1.2' : ''}; B25118 brackets, straight line: {zipQualified.formula}). Capture rate {zipCapture?.rate != null ? <b>{fmtShare(zipCapture.rate)}</b> : 'not meaningful'}
                    {zipCapture?.formula ? ` (${zipCapture.formula})` : ''}.
                  </>
                ) : (
                  'not available'
                )}
              </p>
              <p>
                <span className="font-medium">Tract:</span>{' '}
                {chasBand && tractCapture ? (
                  <>
                    {fmtCount(tractQualified)} renter households at or below {MIX_LEVEL_LABEL[topLevel]} (CHAS). Capture rate {tractCapture.rate != null ? <b>{fmtShare(tractCapture.rate)}</b> : 'not meaningful'}
                    {tractCapture.formula ? ` (${tractCapture.formula})` : ''}.
                  </>
                ) : (
                  'CHAS has no 60% band; read the ZIP figure.'
                )}
              </p>
              <p className="text-caption text-slate-600">A capture rate is the share of qualifying renter households a project needs to fill. It is a screen, not a market study: it ignores who would move in from elsewhere and which existing homes compete.</p>
            </div>
          ) : (
            <p className="text-small text-slate-700">The mix has no homes with an income limit.</p>
          )}
        </Explainer>

        <Explainer title="Tax credit homes nearby" right={<span className="text-caption text-slate-600 tnum">{mile ? fmtCount(mile.li_units) : 'n/a'} within a mile</span>}>
          {lt ? (
            <>
              <Facts
                items={[
                  { key: 'in', k: 'In the tract', v: `${fmtCount(lt.li_units)} homes in ${lt.projects} ${lt.projects === 1 ? 'property' : 'properties'}` },
                  { key: 'mile', k: 'Within a mile of the tract', v: mile ? `${fmtCount(mile.li_units)} homes in ${mile.projects}` : 'n/a' },
                  { key: 'recent', k: `Placed in service ${yrs.as_of - yrs.recent_years} or later (within a mile)`, v: mile ? fmtCount(mile.li_units_recent) : 'n/a' },
                  { key: 'past', k: `${yrs.use_years} years or more since placed in service (within a mile)`, v: mile ? fmtCount(mile.li_units_past30) : 'n/a' },
                  { key: 'end', k: `Reaching ${yrs.use_years} years by ${yrs.as_of + 5} (within a mile)`, v: mile ? fmtCount(mile.li_units_end_5y) : 'n/a' },
                ]}
              />
              {lt.nearby && lt.nearby.length > 0 && (
                <ul className="mt-2 divide-y divide-stone-100 overflow-hidden rounded-xl bg-white text-small ring-1 ring-stone-200/80">
                  {lt.nearby.map((p) => (
                    <li key={`${p.name}-${p.yr}-${p.mi}`} className="flex items-baseline justify-between gap-2 px-2.5 py-1.5">
                      <span className="min-w-0 truncate text-slate-800">{p.name}</span>
                      <span className="shrink-0 text-caption text-slate-600 tnum">
                        {p.yr ?? 'year n/a'} · {isNum(p.li) ? `${p.li} homes` : 'n/a'} · {p.credit ?? 'credit n/a'}
                        {p.bond ? ' bond' : ''} · {p.mi.toFixed(2)} mi
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1.5 text-caption leading-snug text-slate-600">
                {yrs.use_years} years = the federal 15-year compliance period plus 15 years of extended use (an assumption: properties placed before 1990 had less, and some carry longer terms). The nearest properties are measured from the tract's center.
              </p>
            </>
          ) : (
            <p className="text-small text-slate-700">Not available.</p>
          )}
        </Explainer>

        <SourceLine className="px-1">
          Source · ACS {DEMAND.acs} B25009, B25007, B25032, B25042, B25068, B25118, B25119, B25064 · ACS 2010–14 for growth (on 2020 tracts) · HUD CHAS 2018–22 · HUD tax credit property database{yrs.retrieved ? `, read ${yrs.retrieved}` : ''} · docs/data/demand.md, docs/assumptions.md §15.
        </SourceLine>
      </div>
    </div>
  );
}

/** The unit mix's inputs, for the left panel: the renters' split, or homes typed by income level and size. */
export function MixInputs({ mix, head }: { mix: ProjectMix; head?: string }) {
  const side = useSide();
  const setMine = (counts: Counts) => side.project.setState({ mode: 'mine', counts });
  const mine = mix.mode === 'mine';
  return (
    <div className="space-y-2" data-mix-inputs>
      <div className="grid grid-cols-2 gap-0.5 rounded-lg bg-stone-100 p-0.5" role="radiogroup" aria-label="Unit mix">
        {[
          { on: !mine, label: "Renters' split", pick: () => side.project.setState({ mode: 'suggested' }) },
          { on: mine, label: 'My mix', pick: () => setMine(mix.counts) },
        ].map((o) => (
          <button key={o.label} type="button" role="radio" aria-checked={o.on} onClick={o.pick} className={cx('rounded-md px-1.5 py-1 text-small font-medium transition-colors', o.on ? 'bg-white text-slate-900 shadow-sm ring-1 ring-stone-200' : 'text-slate-600 hover:text-slate-900')}>
            {o.label}
          </button>
        ))}
      </div>
      {mine && <MixEditor mix={mix} onEdit={setMine} head={head} />}
    </div>
  );
}
