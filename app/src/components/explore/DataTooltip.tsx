import { unitSubtitle, unitTitle } from '../../lib/explore/catalog';
import { fmtValue } from '../../lib/explore/bins';
import { EXPLORE_UI } from '../../lib/explore/copy';
import { fmtAnalysis, isAnalysis } from '../../lib/explore/analysisVars';
import type { Estimate, UnitProps, VariableDef } from '../../lib/explore/types';
import { ZONING_CAVEAT, byRightList, zoningByCode } from '../../lib/explore/zoning';

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

/** Map tooltip for one zoning district: code, family, the building types allowed by right (unverified table). */
export function ZoningTooltip({ code }: { code: string }) {
  const p = zoningByCode.get(code);
  if (!p) return <div className="font-semibold">{code}</div>;
  const yes = byRightList(p);
  const cond = byRightList(p, 'conditional');
  return (
    <div className="max-w-72">
      <div className="font-semibold">
        {p.code} · {p.family_label}
      </div>
      <div className="mt-1 text-caption">
        <span className="text-white/75">By right: </span>
        {yes.length ? yes.join(', ') : 'no housing types'}
      </div>
      {cond.length > 0 && (
        <div className="text-caption">
          <span className="text-white/75">With approval: </span>
          {cond.join(', ')}
        </div>
      )}
      <div className="mt-0.5 text-caption italic text-white/70">({ZONING_CAVEAT})</div>
    </div>
  );
}
