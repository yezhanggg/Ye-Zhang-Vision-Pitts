import type { Layers } from '../../lib/store';
import { LEVEL_LABEL } from '../../lib/explore/catalog';
import { NO_DATA, finite, fmtTick, fmtValue, paletteFor, refPosition } from '../../lib/explore/bins';
import { BOUNDARY_STYLE, EXPLORE_UI } from '../../lib/explore/copy';
import { useReference } from '../../lib/explore/remote';
import type { BrowseLevel, ValueMap, VariableDef } from '../../lib/explore/types';
import { classCounts, isAnalysis, type AnalysisVar } from '../../lib/explore/analysisVars';
import { cx } from '../../lib/format';

const BOUNDARY_IDS = ['tracts', 'bg', 'zcta', 'muni', 'county', 'city'] as const;

/** Anchors a label so it never spills past the ramp ends. */
const anchor = (pos: number) => (pos < 0.12 ? 'translate-x-0' : pos > 0.88 ? '-translate-x-full' : '-translate-x-1/2');

function RefMark({ label, pos, value, up }: { label: string; pos: number; value: string; up: boolean }) {
  return (
    <div className={cx('absolute flex items-center gap-0.5 whitespace-nowrap text-caption font-medium text-slate-700', anchor(pos))} style={{ left: `${pos * 100}%` }} title={`${label}: ${value}`}>
      <svg viewBox="0 0 10 8" className="h-2 w-2.5 text-slate-800" aria-hidden>
        <path d={up ? 'M5 0 L10 8 L0 8 Z' : 'M0 0 L10 0 L5 8 Z'} fill="currentColor" />
      </svg>
      {label}
    </div>
  );
}

/** Legend for an Analysis layer: the fixed ramp (percentiles, scores) or the class swatches, plus the tract-only note. */
function AnalysisLegend({ variable, values, hoverId, scope }: { variable: AnalysisVar; values: ValueMap; hoverId: string | null; scope: string }) {
  const hovered = hoverId ? values.get(hoverId) : undefined;
  const hoverClass = hovered && finite(hovered.est) && variable.classOf ? variable.classOf(hovered.est) : null;
  let body: React.ReactNode;
  if (variable.paint.kind === 'seq') {
    const { palette, bins } = variable.paint;
    const pos = hovered && finite(hovered.est) ? Math.max(0, Math.min(1, hovered.est)) : null;
    body = (
      <>
        <div className="relative mt-1 flex h-3 rounded-full ring-1 ring-black/5">
          {palette.map((c, i) => (
            <div key={i} className={cx('flex-1', i === 0 && 'rounded-l-full', i === palette.length - 1 && 'rounded-r-full')} style={{ background: c }} />
          ))}
          {pos != null && <span className="absolute -bottom-1 -top-1 w-0.5 rounded bg-slate-900 ring-1 ring-white" style={{ left: `calc(${pos * 100}% - 1px)` }} aria-label={EXPLORE_UI.legend.hovered} />}
        </div>
        <div className="relative mt-1 h-4 text-caption text-slate-600 tnum">
          {bins.map((b, i) => (
            <span key={i} className={cx('absolute', i === 0 ? '' : i === bins.length - 1 ? '-translate-x-full' : '-translate-x-1/2')} style={{ left: `${(i / (bins.length - 1)) * 100}%` }}>
              {i % 2 === 0 || i === bins.length - 1 ? Math.round(b * 100) : ''}
            </span>
          ))}
        </div>
        <div className="flex justify-between text-caption text-slate-700">
          <span>{variable.unit === 'pct' ? '← Lower than most tracts' : '← Weaker match'}</span>
          <span>{variable.unit === 'pct' ? 'Higher than most →' : 'Stronger match →'}</span>
        </div>
      </>
    );
  } else if (variable.paint.kind === 'cat') {
    const counts = classCounts(variable, values);
    body = (
      <div className="mt-1 space-y-0.5">
        {variable.paint.labels.map((label, i) => (
          <div key={label} className={cx('flex items-center gap-1.5 text-caption text-slate-800', hoverClass === i && 'font-semibold')}>
            <span className={cx('h-3 w-4 shrink-0 rounded-sm', hoverClass === i && 'ring-2 ring-slate-900')} style={{ background: variable.paint.kind === 'cat' ? variable.paint.palette[i] : undefined }} />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <span className="tnum text-slate-500">{counts[i] ?? 0}</span>
          </div>
        ))}
      </div>
    );
  } else {
    body = null;
  }
  return (
    <div className="w-64 rounded-xl bg-white/95 px-3.5 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur">
      <div className="text-small font-semibold text-slate-900">{variable.label}</div>
      {body}
      <div className="mt-1 space-y-0.5 text-caption text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className={cx('h-3 w-4 rounded-sm', hovered && !finite(hovered.est) && 'ring-2 ring-slate-900')} style={{ background: NO_DATA }} />
          {EXPLORE_UI.legend.noData}
        </div>
        <div className="tnum">{scope} · {EXPLORE_UI.analysisOnly}</div>
      </div>
    </div>
  );
}

interface Props {
  variable: VariableDef | null;
  level: BrowseLevel;
  values: ValueMap | null;
  breaks: number[];
  ext: [number, number] | null;
  hoverId: string | null;
  layers: Layers;
  scope: string;
}

/** Bottom-left legend: the five-class ramp with break labels, city/county marks and the hovered unit; boundary swatches otherwise. */
export default function DataLegend({ variable, level, values, breaks, ext, hoverId, layers, scope }: Props) {
  const ref = useReference(variable?.id ?? null);
  if (!variable || !values) {
    const on = BOUNDARY_IDS.filter((id) => layers[id]);
    return (
      <div className="w-60 rounded-xl bg-white/95 px-3.5 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur">
        <div className="text-small font-semibold text-slate-900">{EXPLORE_UI.legend.boundaries}</div>
        <div className="mt-1 space-y-1">
          {on.map((id) => {
            const s = BOUNDARY_STYLE[id];
            return (
              <div key={id} className="flex items-center gap-2 text-caption text-slate-700">
                <svg width="28" height="8" viewBox="0 0 28 8" aria-hidden>
                  <line x1="1" y1="4" x2="27" y2="4" stroke={s.color} strokeWidth={s.legendWidth} strokeDasharray={s.dash?.map((d) => d * 2).join(' ')} strokeLinecap="round" />
                </svg>
                {s.label}
              </div>
            );
          })}
          {on.length === 0 && <div className="text-caption text-slate-600">No boundary layers on. Turn one on under Layers.</div>}
        </div>
        <div className="mt-1.5 border-t border-stone-200 pt-1.5 text-caption text-slate-600 tnum">{scope}</div>
      </div>
    );
  }

  if (isAnalysis(variable)) return <AnalysisLegend variable={variable} values={values} hoverId={hoverId} scope={scope} />;
  const palette = paletteFor(breaks.length + 1);
  const n = palette.length;
  const unit = variable.unit;
  const cityPos = refPosition(ref.city?.est, breaks, ext);
  const countyPos = refPosition(ref.county?.est, breaks, ext);
  const hovered = hoverId ? values.get(hoverId) : undefined;
  const hoverPos = hovered ? refPosition(hovered.est, breaks, ext) : null;
  const hoverNoData = !!hoverId && values.has(hoverId) && !finite(hovered?.est);
  return (
    <div className="w-64 rounded-xl bg-white/95 px-3.5 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur">
      <div className="text-small font-semibold text-slate-900">
        {variable.label} · {LEVEL_LABEL[level].short}
      </div>
      <div className="relative mt-1 h-4">{cityPos != null && <RefMark label={EXPLORE_UI.place.city} pos={cityPos} value={fmtValue(ref.city?.est, unit)} up={false} />}</div>
      <div className="relative flex h-3 rounded-full ring-1 ring-black/5">
        {palette.map((c, i) => (
          <div key={i} className={cx('flex-1', i === 0 && 'rounded-l-full', i === n - 1 && 'rounded-r-full')} style={{ background: c }} />
        ))}
        {hoverPos != null && <span className="absolute -bottom-1 -top-1 w-0.5 rounded bg-slate-900 ring-1 ring-white" style={{ left: `calc(${hoverPos * 100}% - 1px)` }} aria-label={EXPLORE_UI.legend.hovered} />}
      </div>
      <div className="relative mt-1 h-4 text-caption text-slate-600 tnum">
        {breaks.map((b, i) => (
          <span key={i} className="absolute -translate-x-1/2" style={{ left: `${((i + 1) / n) * 100}%` }}>
            {fmtTick(b, unit)}
          </span>
        ))}
        {breaks.length === 0 && ext && (
          <>
            <span className="absolute left-0">{fmtTick(ext[0], unit)}</span>
            <span className="absolute right-0">{fmtTick(ext[1], unit)}</span>
          </>
        )}
      </div>
      <div className="relative h-4">{countyPos != null && <RefMark label={EXPLORE_UI.place.county} pos={countyPos} value={fmtValue(ref.county?.est, unit)} up />}</div>
      <div className="mt-1 space-y-0.5 text-caption text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className={cx('h-3 w-4 rounded-sm', hoverNoData && 'ring-2 ring-slate-900')} style={{ background: NO_DATA }} />
          {EXPLORE_UI.legend.noData}
        </div>
        <div className="tnum">{scope}</div>
      </div>
    </div>
  );
}
