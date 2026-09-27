import { motion } from 'motion/react';
import { factorById, scoring, typologyById } from '../lib/data';
import { BIVARIATE_PALETTE, ELEV_STOPS_FT, FACTOR_BINS, FACTOR_PALETTE, NO_DATA, PRESSURE_LABELS, PRESSURE_PALETTE, RENT_GROWTH_LABELS, RENT_GROWTH_PALETTE, SCORE_PALETTE } from '../lib/mapStyle';
import { UI, factorName } from '../lib/copy';
import type { MapMetric } from '../lib/store';
import { Dot } from './primitives';

function Ramp({ palette, ticks, lo, hi, w }: { palette: string[]; ticks?: string[]; lo: string; hi: string; w: string }) {
  return (
    <div className="pt-1">
      <div className={`flex h-3 overflow-hidden rounded-full ring-1 ring-black/5 ${w}`}>
        {palette.map((c, i) => (
          <div key={i} className="flex-1" style={{ background: c }} />
        ))}
      </div>
      {ticks && (
        <div className={`relative mt-1 h-4 text-caption text-slate-600 tnum ${w}`}>
          {ticks.map((b, i) => (
            <span key={i} className={`absolute ${i === 0 ? '' : i === ticks.length - 1 ? '-translate-x-full' : '-translate-x-1/2'}`} style={{ left: `${(i / (ticks.length - 1)) * 100}%` }}>
              {b}
            </span>
          ))}
        </div>
      )}
      <div className={`mt-0.5 flex justify-between text-small font-medium text-slate-800 ${w}`}>
        <span>← {lo}</span>
        <span>{hi} →</span>
      </div>
    </div>
  );
}

/** `closeCalls`: the map draws the close-call overlay (top two within the close margin), so the legend explains it. */
export default function Legend({ metric, flips, compact, buildings, closeCalls }: { metric: MapMetric; flips?: boolean; compact?: boolean; buildings?: string | null; closeCalls?: boolean }) {
  const w = compact ? 'w-56' : 'w-60';
  const pct = (b: number[]) => b.map((x) => String(Math.round(x * 100)));
  let title = 'Best match score';
  let body: React.ReactNode;
  if (metric.kind === 'pick') {
    title = 'Which housing type wins';
    body = (
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
        {scoring.typologies.map((t) => (
          <div key={t.id} className="flex items-center gap-1.5 text-small text-slate-800">
            <Dot color={t.color} size={10} />
            {t.label}
          </div>
        ))}
        {closeCalls && (
          <div className="col-span-full mt-0.5 flex items-center gap-1.5 text-small text-slate-800">
            <span className="h-3 w-4 rounded-sm border border-dashed border-slate-600 bg-white/60" />
            Close call: top two within {Math.round((scoring.scoring.close_margin ?? 0.03) * 100)} points
          </div>
        )}
        {flips && (
          <div className="col-span-full mt-0.5 flex items-center gap-1.5 text-small text-slate-800">
            <span className="h-3 w-4 rounded-sm border-2 border-slate-900" />
            Winner changes from A to B
          </div>
        )}
      </div>
    );
  } else if (metric.kind === 'factor') {
    title = factorName(metric.id, factorById.get(metric.id)?.label);
    body = <Ramp palette={FACTOR_PALETTE} ticks={compact ? undefined : pct(FACTOR_BINS).map((x, i) => (i % 2 === 0 ? x : ''))} lo="Lower" hi="Higher" w={w} />;
  } else if (metric.kind === 'lens' && metric.id === 'pressure') {
    title = 'Market pressure from neighbors';
    body = (
      <div className="space-y-0.5 pt-1">
        {PRESSURE_PALETTE.map((c, i) => (
          <div key={c} className="flex items-center gap-1.5 text-caption text-slate-800">
            <span className="h-3 w-4 rounded-sm" style={{ background: c }} />
            {PRESSURE_LABELS[i]}
          </div>
        ))}
      </div>
    );
  } else if (metric.kind === 'lens') {
    title = 'Watch list: need × market change, 2016 → 2021';
    body = (
      <div className="flex items-end gap-2 pt-1">
        <div className="flex flex-col-reverse gap-0.5">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex gap-0.5">
              {[0, 1, 2].map((col) => (
                <span key={col} className="h-5 w-5 rounded-sm" style={{ background: BIVARIATE_PALETTE[row * 3 + col] }} />
              ))}
            </div>
          ))}
        </div>
        <div className="text-caption leading-tight text-slate-700">
          <div>↑ need: low → high</div>
          <div>→ market: falling · flat · rising</div>
          <div className="mt-1 font-semibold text-[#c8321f]">dark red = watch list</div>
        </div>
      </div>
    );
  } else if (metric.kind === 'info') {
    title = UI.rentLayer;
    body = (
      <div className="space-y-0.5 pt-1">
        {RENT_GROWTH_PALETTE.map((c, i) => (
          <div key={c} className="flex items-center gap-1.5 text-caption text-slate-800">
            <span className="h-3 w-4 rounded-sm" style={{ background: c }} />
            {RENT_GROWTH_LABELS[i]}
          </div>
        ))}
        {!compact && <div className="max-w-56 pt-1 text-caption leading-tight text-slate-600">{UI.rentLayerSub}</div>}
      </div>
    );
  } else if (metric.kind === 'layer') {
    title = 'Ground elevation';
    body = (
      <div className="pt-1">
        <div className={`h-3 rounded-full ring-1 ring-black/5 ${w}`} style={{ background: `linear-gradient(to right, ${ELEV_STOPS_FT.map(([, c]) => c).join(',')})` }} />
        <div className={`mt-1 flex justify-between text-caption text-slate-600 tnum ${w}`}>
          <span>{ELEV_STOPS_FT[0][0].toLocaleString('en-US')} ft</span>
          <span>{ELEV_STOPS_FT[ELEV_STOPS_FT.length - 1][0].toLocaleString('en-US')} ft</span>
        </div>
      </div>
    );
  } else {
    if (metric.kind === 'typology') title = `Match score · ${typologyById.get(metric.id)?.label}`;
    body = <Ramp palette={SCORE_PALETTE} ticks={pct(scoring.bins.score)} lo={compact ? 'Weaker' : 'Weaker match'} hi={compact ? 'Stronger' : 'Stronger match'} w={w} />;
  }
  const showNoData = metric.kind !== 'pick' && metric.kind !== 'layer';
  return (
    <motion.div layout className={`rounded-xl bg-white/95 shadow-lg ring-1 ring-black/5 backdrop-blur ${compact ? 'px-3 py-2' : 'px-3.5 py-3'}`}>
      <div className="text-small font-semibold text-slate-900">{title}</div>
      {body}
      {!compact && (
        <div className="mt-1 space-y-0.5 text-caption text-slate-600">
          {showNoData && (
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-4 rounded-sm" style={{ background: NO_DATA }} />
              {metric.kind === 'info' ? 'Hidden: fewer than 20 units listed' : 'No data'}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-4 rounded-sm" style={{ background: '#efede9' }} />
            Not ranked (fewer than 25 households)
          </div>
        </div>
      )}
      {buildings && !compact && (
        <div className="mt-2 max-w-60 border-t border-stone-200 pt-2 text-caption text-slate-700">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ background: buildings }} />
            <span className="h-3 w-3 rounded-sm opacity-40" style={{ background: buildings }} />
            <span className="font-medium">{UI.buildingsLegend.split(':')[0]}</span>
          </div>
          <div className="mt-0.5">{UI.buildingsLegend.split(': ')[1]}</div>
        </div>
      )}
    </motion.div>
  );
}
