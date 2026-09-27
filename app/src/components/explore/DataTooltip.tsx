import { unitSubtitle, unitTitle } from '../../lib/explore/catalog';
import { fmtValue } from '../../lib/explore/bins';
import { EXPLORE_UI } from '../../lib/explore/copy';
import { fmtAnalysis, isAnalysis } from '../../lib/explore/analysisVars';
import type { Estimate, UnitProps, VariableDef } from '../../lib/explore/types';

/** Map tooltip for one unit: its name and, when a variable is painted, the latest value. Nothing else. */
export default function DataTooltip({ props, geoid, variable, estimate }: { props: UnitProps | null; geoid: string; variable: VariableDef | null; estimate: Estimate | null | undefined }) {
  const sub = unitSubtitle(props);
  const has = !!estimate && typeof estimate.est === 'number' && Number.isFinite(estimate.est);
  return (
    <div className="max-w-64">
      <div className="font-semibold">{props ? unitTitle(props) : geoid}</div>
      {sub && <div className="text-caption text-white/75">{sub}</div>}
      {variable ? (
        <div className="mt-1">
          <div className="text-caption text-white/75">{variable.label}</div>
          <div className="text-lead font-bold tnum">{has ? (isAnalysis(variable) ? fmtAnalysis(variable, estimate?.est) : fmtValue(estimate?.est, variable.unit)) : EXPLORE_UI.noData}</div>
        </div>
      ) : (
        <div className="mt-1 text-caption text-white/80">{EXPLORE_UI.clickForDetails}</div>
      )}
    </div>
  );
}
