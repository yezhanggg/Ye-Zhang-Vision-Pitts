import { activeFactors, buildingStats, hasAskingRents, meta, scoring, tractLabel } from '../lib/data';
import { fmtInt } from '../lib/format';
import { UI, factorName } from '../lib/copy';
import { ANALYSIS_COPY as C, countWord, joinAnd } from '../lib/analysis/copy';
import { HOUSEHOLD_MIN } from '../lib/analysis/rationale';
import type { Conf, TractProps } from '../lib/types';
import { Explainer } from './primitives';

const CV_MAX = 0.3;
const FLOOR = scoring.factor_options?.transit?.household_floor ?? 400;
const FLOOD_MAX = scoring.factor_options?.flood?.implausible_share_pct ?? 50;
const ZIP_DOMINANT = scoring.factor_options?.displacement?.eviction_zip_dominant_min ?? 0.8;
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Why a factor's confidence tag is what it is here, from the same rules the pipeline applies (src/visionpitts/factors.py). */
function confReason(f: string, t: TractProps, conf: Conf): string | null {
  switch (f) {
    case 'need':
      return num(t.need_count_cv) && t.need_count_cv > CV_MAX ? 'the count of low-income renters has a margin of error above 30%' : conf !== 'high' ? 'the CHAS income data is from 2018–22' : null;
    case 'market_strength':
      if (t.mva16_score == null) return 'there is no 2016 market type to compare with';
      return conf === 'low' ? 'the 2021 classification is five years old and was drawn on 2010 tract boundaries that match this tract only partly' : conf === 'medium' ? 'the market classification is from 2021' : null;
    case 'displacement_risk': {
      const why: string[] = [];
      if ((t.displacement_n ?? 0) < 3) why.push(`only ${countWord(t.displacement_n ?? 0)} of its four parts ${(t.displacement_n ?? 0) === 1 ? 'is' : 'are'} available`);
      if (t.eviction_filing_rate != null && (t.eviction_zip_n ?? 1) > 1 && (t.eviction_zip_dominant ?? 0) < ZIP_DOMINANT) why.push(`its eviction estimate is split across ${t.eviction_zip_n} ZIP codes with no dominant one`);
      if (why.length) return joinAnd(why);
      return conf === 'low' ? 'the rent-burden share behind it has a margin of error above 30%' : 'its parts date from 2018–22 to 2023–25';
    }
    case 'subsidy_eligible':
      return t.qct || t.dda ? null : t.oz || t.cdbg ? 'its only designation dates from 2018 and was drawn on 2010 tract boundaries' : null;
    case 'transit_access':
      return num(t.households) && t.households < FLOOR ? `it has ${fmtInt(t.households)} households, fewer than ${FLOOR}, so departures are divided by ${FLOOR}` : null;
    case 'flood_exposure':
      // The flood bullet below explains both the model and an implausible reading; nothing to add here.
      return null;
    case 'senior_demand':
      return !num(t.age65_share_cv) || t.age65_share_cv > CV_MAX ? 'the share of residents 65 and over has a margin of error above 30%' : null;
    case 'small_multifamily_stock':
      return !num(t.units_2_4_share_cv) || t.units_2_4_share_cv > CV_MAX ? 'the share of homes in 2–4 unit buildings has a margin of error above 30%' : null;
    default:
      return null;
  }
}

export default function DataLimitsPanel({ t }: { t: TractProps }) {
  const counts: Record<string, number> = { high: 0, medium: 0, low: 0 };
  const missing: string[] = [];
  const low: { name: string; why: string | null }[] = [];
  const medium: { name: string; why: string }[] = [];
  for (const f of activeFactors) {
    if (typeof t[f.id] !== 'number') {
      missing.push(factorName(f.id, f.label));
      continue;
    }
    const c = t[`${f.id}_conf`] as Conf | null;
    if (c) counts[c]++;
    if (c === 'low' && f.id !== 'flood_exposure') low.push({ name: factorName(f.id, f.label), why: confReason(f.id, t, c) });
    if (c === 'medium') {
      const why = confReason(f.id, t, c);
      if (why) medium.push({ name: factorName(f.id, f.label), why });
    }
  }
  const cvFlags: string[] = [];
  if (num(t.med_hh_income_cv) && t.med_hh_income_cv > CV_MAX) cvFlags.push('median income');
  if (num(t.med_gross_rent_cv) && t.med_gross_rent_cv > CV_MAX) cvFlags.push('median rent');
  if (num(t.need_count_cv) && t.need_count_cv > CV_MAX) cvFlags.push('the count of low-income renters');
  const n = activeFactors.length;
  const bld = buildingStats.get(t.GEOID);
  const seg = (k: keyof typeof counts, cls: string) => counts[k] > 0 && <div className={cls} style={{ flex: counts[k] }} />;
  const weak = low.length + missing.length;
  const households = num(t.households) ? t.households : null;
  const summary = !t.residential ? `Not ranked: ${households == null ? `fewer than ${HOUSEHOLD_MIN} households` : `${fmtInt(households)} households, fewer than ${HOUSEHOLD_MIN}`}` : weak ? `${weak} of ${n} factors ${weak === 1 ? 'is' : 'are'} weak or missing here` : `All ${n} factors have data here`;
  const senior = num(t.age65_share) && t.age65_share >= 0.3 ? t.age65_share : null;
  const seniorMedian = meta.city_medians?.age65_share ?? null;
  const flood = num(t.flood_share_pct) && t.flood_share_pct > FLOOD_MAX ? t.flood_share_pct : null;
  return (
    <Explainer
      tone="card"
      title={
        <span>
          <span className="block">{UI.dataLimits}</span>
          <span className="block text-caption font-normal text-slate-600">{summary}</span>
        </span>
      }
    >
      {t.residential && (
        <>
          <div className="flex items-center justify-between text-small text-slate-800">
            <span>How much to trust each factor</span>
            <span className="tnum text-slate-700">
              {counts.high} high · {counts.medium} medium · {counts.low} low{missing.length ? ` · ${missing.length} missing` : ''}
            </span>
          </div>
          <div className="mt-1.5 flex h-2 gap-0.5 overflow-hidden rounded-full">
            {seg('high', 'bg-emerald-400')}
            {seg('medium', 'bg-amber-400')}
            {seg('low', 'bg-rose-400')}
            {missing.length > 0 && <div className="hatch" style={{ flex: missing.length }} />}
          </div>
        </>
      )}
      <ul className="mt-2.5 space-y-1.5 text-small text-slate-700">
        {!t.residential && <li>• {C.why.unranked(tractLabel(t), households, HOUSEHOLD_MIN)} Park, river, campus or stadium land usually reads this way.</li>}
        {t.residential && missing.length > 0 && <li>• No data for {joinAnd(missing)}. It is left out of this tract’s score and the other factors count a bit more.</li>}
        {low.map((x) => (
          <li key={x.name}>
            • Low confidence for {x.name}: {x.why ?? 'older data, thin coverage, changed boundaries or a wide margin of error'}.
          </li>
        ))}
        {medium.length > 0 && <li>• Medium confidence for {joinAnd(medium.map((x) => `${x.name} (${x.why})`))}.</li>}
        {cvFlags.length > 0 && <li>• Census survey estimates for {joinAnd(cvFlags)} are uncertain here (margin of error above 30%).</li>}
        {senior != null && (
          <li>
            • {pct(senior)} of residents here are 65 or older{seniorMedian != null ? `, against ${pct(seniorMedian)} in the typical city tract` : ''}. That usually means senior buildings already stand here, so this factor may be counting homes already built, not unmet demand.
          </li>
        )}
        {t.residential && (t.eviction_filing_rate != null ? <li>• Eviction filings are spread from ZIP-code totals to tracts by housing units: an estimate, not a tract observation.</li> : <li>• Eviction filings are not covered for this tract, so displacement risk uses its other parts.</li>)}
        {t.hcv_per_renter == null && t.residential && <li>• HUD hides voucher counts where there are 10 or fewer, so this shows as missing, not zero.</li>}
        {t.mva21_score == null && t.residential && <li>• No housing-market classification here (too few sales or non-residential land), so market strength is left out.</li>}
        {t.mva16_score == null && t.mva21_score != null && <li>• No 2016 market type to compare with, so the change since 2016 is treated as flat.</li>}
        {flood != null ? (
          <li>
            • The terrain flood model reads {Math.round(flood)}% of the land here as flood-prone. A reading above {FLOOD_MAX}% is not plausible for a built-up tract (it is not a FEMA floodplain), so flood exposure carries low confidence here and should be checked before it is cited.
          </li>
        ) : (
          <li>• Flood exposure comes from a terrain screening model, not a FEMA floodplain.</li>
        )}
        {hasAskingRents &&
          (t.rent_2br_2025_26 != null ? (
            <li>
              • Asking rents are licensed listing data (Dewey) with a market-rate skew: managed and turnover units are over-represented, subsidized and long-tenure units absent. {fmtInt(t.n_units_2025_26)} distinct 2BR units were listed here in 2025–26 ({t.asking_rents_conf ?? 'low'} confidence). Information only, never scored.
              {t.rent_2br_growth_existing == null && ' Existing-stock rent growth is hidden: fewer than 20 units listed before 2019 appear in both 2019–20 and 2025–26.'}
            </li>
          ) : (
            <li>• Asking rent is hidden: fewer than 20 distinct 2BR units were listed here in 2025–26 (licensed listing data, market-rate skew; information only).</li>
          ))}
        <li>• Zoning, infrastructure capacity and embodied carbon are not integrated. The tool does not claim to answer them.</li>
        {bld && (
          <li>
            • 3D buildings: {bld.total - bld.estimated} of {bld.total} heights come from records (Overture or county assessment stories); {bld.estimated} are guessed at 6 m and drawn faded.
          </li>
        )}
        <li>• Market-type letters are compared within the same year only; the change shows direction, not size.</li>
        <li>• The fit rules and your priorities are value judgments, not findings. The {countWord(scoring.factors.length)} factors are the data.</li>
      </ul>
      {meta.built_at && <div className="mt-2 text-caption text-slate-600">Data built {meta.built_at.slice(0, 10)} · ACS 2020–24 · CHAS 2018–22</div>}
    </Explainer>
  );
}
