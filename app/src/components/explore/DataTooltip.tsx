import { LEVEL_LABEL, RELIABILITY, unitSubtitle, unitTitle } from '../../lib/explore/catalog';
import { fmtMoe, fmtValue, reliability } from '../../lib/explore/bins';
import { EXPLORE_UI } from '../../lib/explore/copy';
import { analysisConf, fmtAnalysis, isAnalysis } from '../../lib/explore/analysisVars';
import type { Estimate, GeoLevel, UnitProps, VariableDef } from '../../lib/explore/types';
import { ConfChip } from '../primitives';

/** Map tooltip for one unit: name, level line, then the painted variable's estimate ± MOE with its reliability chip. */
export default function DataTooltip({ level, props, geoid, variable, estimate }: { level: GeoLevel; props: UnitProps | null; geoid: string; variable: VariableDef | null; estimate: Estimate | null | undefined }) {
  const share = props?.pgh_share;
  const sub = unitSubtitle(props);
  const line = [LEVEL_LABEL[level].one, sub, level !== 'muni' && typeof share === 'number' && share < 0.995 ? EXPLORE_UI.insideCity(Math.max(1, Math.round(share * 100))) : null].filter(Boolean).join(' · ');
  return (
    <div className="max-w-64">
      <div className="font-semibold">{props ? unitTitle(props) : geoid}</div>
      <div className="text-caption text-white/75">{line}</div>
      {variable ? (
        estimate && typeof estimate.est === 'number' ? (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="tnum">
              <b>{isAnalysis(variable) ? fmtAnalysis(variable, estimate.est) : fmtValue(estimate.est, variable.unit)}</b>
              {typeof estimate.moe === 'number' && <span className="text-white/80"> ± {fmtMoe(estimate.moe, variable.unit)}</span>}
            </span>
            {isAnalysis(variable) ? analysisConf(variable, geoid) && <ConfChip conf={analysisConf(variable, geoid)} /> : <ConfChip conf={reliability(estimate.cv, RELIABILITY)} />}
          </div>
        ) : (
          <div className="mt-1 text-white/80">
            {variable.label}: {EXPLORE_UI.noData}
          </div>
        )
      ) : (
        <div className="mt-1 text-white/80">{EXPLORE_UI.clickForDetails}</div>
      )}
    </div>
  );
}
