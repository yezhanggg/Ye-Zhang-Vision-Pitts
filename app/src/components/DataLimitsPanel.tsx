import { activeFactors, buildingStats, meta } from '../lib/data';
import { UI, factorName } from '../lib/copy';
import type { Conf, TractProps } from '../lib/types';
import { Explainer } from './primitives';

export default function DataLimitsPanel({ t }: { t: TractProps }) {
  const counts: Record<string, number> = { high: 0, medium: 0, low: 0 };
  const missing: string[] = [];
  const low: string[] = [];
  for (const f of activeFactors) {
    if (typeof t[f.id] !== 'number') {
      missing.push(factorName(f.id, f.label));
      continue;
    }
    const c = t[`${f.id}_conf`] as Conf | null;
    if (c) counts[c]++;
    if (c === 'low') low.push(factorName(f.id, f.label));
  }
  const cvFlags: string[] = [];
  if (typeof t.med_hh_income_cv === 'number' && t.med_hh_income_cv > 0.3) cvFlags.push('median income');
  if (typeof t.med_gross_rent_cv === 'number' && t.med_gross_rent_cv > 0.3) cvFlags.push('median rent');
  if (typeof t.need_count_cv === 'number' && t.need_count_cv > 0.3) cvFlags.push('the count of low-income renters');
  const n = activeFactors.length;
  const bld = buildingStats.get(t.GEOID);
  const seg = (k: keyof typeof counts, cls: string) => counts[k] > 0 && <div className={cls} style={{ flex: counts[k] }} />;
  const weak = low.length + missing.length;
  const summary = !t.residential ? 'Not ranked: fewer than 25 households' : weak ? `${weak} of ${n} factors ${weak === 1 ? 'is' : 'are'} weak or missing here` : `All ${n} factors have data here`;
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
        {!t.residential && <li>• {UI.notRanked}</li>}
        {missing.length > 0 && <li>• No data for {missing.join(', ')}. It is left out of this tract’s score and the other factors count a bit more.</li>}
        {low.length > 0 && <li>• Low confidence: {low.join(', ')} (older data, thin coverage, changed boundaries, an estimate spread from ZIP codes, or a wide margin of error).</li>}
        {cvFlags.length > 0 && <li>• Census survey estimates for {cvFlags.join(' and ')} are uncertain here (margin of error above 30%).</li>}
        {t.eviction_filing_rate != null ? <li>• Eviction filings are spread from ZIP-code totals to tracts by housing units: an estimate, not a tract observation.</li> : <li>• Eviction filings are not covered for this tract, so displacement risk uses its other parts.</li>}
        {t.hcv_per_renter == null && t.residential && <li>• HUD hides voucher counts where there are 10 or fewer, so this shows as missing, not zero.</li>}
        {t.mva21_score == null && t.residential && <li>• No housing-market classification here (too few sales or non-residential land), so market strength is left out.</li>}
        {t.mva16_score == null && t.mva21_score != null && <li>• No 2016 market type to compare with, so the change since 2016 is treated as flat.</li>}
        <li>• Flood exposure comes from a terrain screening model, not a FEMA floodplain.</li>
        <li>• Zoning, infrastructure capacity and embodied carbon are not integrated. The tool does not claim to answer them.</li>
        {bld && (
          <li>
            • 3D buildings: {bld.total - bld.estimated} of {bld.total} heights come from records (Overture or county assessment stories); {bld.estimated} are guessed at 6 m and drawn faded.
          </li>
        )}
        <li>• Market-type letters are compared within the same year only; the change shows direction, not size.</li>
        <li>• The fit rules and your priorities are value judgments, not findings. The six factors are the data.</li>
      </ul>
      {meta.built_at && <div className="mt-2 text-caption text-slate-600">Data built {meta.built_at.slice(0, 10)} · ACS 2020–24 · CHAS 2018–22</div>}
    </Explainer>
  );
}
