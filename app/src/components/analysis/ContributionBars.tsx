// "How the 5 types compare": one bar per housing type, its length the fit and its segments each factor's share.
// Segments are the `contrib` parts of lib/scoring (always ≥ 0: a negative-fit factor adds when the value is low).
// Divs only, no chart library. No number is printed: the points live in the hover tooltips (the Analysis tab reads
// in ranks and words).
import { useState } from 'react';
import { factorLabel, type Rationale } from '../../lib/analysis/rationale';
import { pts1, scorePair, unit } from '../../lib/analysis/copy';
import { scoring, typologyById } from '../../lib/data';
import type { TractResult } from '../../lib/derived';
import { useApp } from '../../lib/store';
import { cx } from '../../lib/format';
import { Dot } from '../primitives';

/** One fixed colour per factor (distinct from the typology palette; none is the violet of "your values"). */
export const FACTOR_COLORS: Record<string, string> = {
  need: '#2a78d6',
  market_strength: '#eb6834',
  displacement_risk: '#e87ba4',
  subsidy_eligible: '#1baf7a',
  transit_access: '#eda100',
  flood_exposure: '#4cc3d9',
  senior_demand: '#a0522d',
  small_multifamily_stock: '#6b7280',
};
export const factorColor = (f: string) => FACTOR_COLORS[f] ?? '#a8a29e';

export default function ContributionBars({ r, ra }: { r: TractResult; ra: Rationale }) {
  const lite = useApp((s) => s.lite);
  const [hint, setHint] = useState<string | null>(null);
  const rows = [...r.ranking, ...ra.unscored.filter((k) => !r.ranking.includes(k))];
  const used = scoring.factors.filter((f) => r.scores.some((s) => s.parts.some((p) => p.factor === f.id)));
  if (!rows.length) return null;
  // Whole points, as in the ranking list; the top two print one decimal when they round to the same integer.
  const pair = ra.top && ra.second && ra.topScore != null && ra.secondScore != null ? scorePair(ra.topScore, ra.secondScore) : null;
  const fmt = (k: string, v: number) => (pair && k === ra.top ? pair[0] : pair && k === ra.second ? pair[1] : String(Math.round(v * 100)));
  const trans = lite ? '' : 'transition-[width] duration-500 ease-out';
  return (
    <div>
      <ol className="space-y-1.5">
        {rows.map((k) => {
          const ty = typologyById.get(k);
          const s = r.scores.find((x) => x.typology === k);
          const score = s?.score ?? null;
          const tied = ra.tied.includes(k);
          return (
            <li key={k} className="flex items-center gap-2 text-small">
              <span className="flex w-32 shrink-0 items-center gap-1.5 text-slate-800">
                <Dot color={ty?.color ?? '#999'} size={8} />
                <span className="truncate">{ty?.label ?? k}</span>
                {tied && <span className="shrink-0 rounded-full bg-slate-100 px-1 text-caption font-semibold text-slate-800 ring-1 ring-slate-300">tie</span>}
              </span>
              <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-stone-100" role="img" title={score == null ? undefined : `${ty?.label ?? k}: ${fmt(k, score)} of 100`} aria-label={score == null ? `${ty?.label ?? k}: not scored` : `${ty?.label ?? k}: ${fmt(k, score)} of 100`}>
                {score == null ? (
                  <div className="hatch absolute inset-0" />
                ) : (
                  <div className="flex h-full">
                    {s!.parts.map((p) => {
                      const label = `${factorLabel(p.factor)}: +${pts1(p.contrib * 100)} ${unit(pts1(p.contrib * 100))} of ${fmt(k, score)}`;
                      return (
                        <span
                          key={p.factor}
                          tabIndex={0}
                          title={label}
                          aria-label={label}
                          onMouseEnter={() => setHint(label)}
                          onMouseLeave={() => setHint(null)}
                          onFocus={() => setHint(label)}
                          onBlur={() => setHint(null)}
                          className={cx('h-full shrink-0 outline-none ring-white/80 hover:ring-2 focus-visible:ring-2', trans)}
                          style={{ width: `${p.contrib * 100}%`, background: factorColor(p.factor) }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
              {score == null && <span className="w-14 shrink-0 text-right text-caption text-slate-500">not scored</span>}
            </li>
          );
        })}
      </ol>
      <div className="mt-1.5 min-h-4 text-caption text-slate-600" aria-live="polite">
        {hint ?? 'Longer is a better fit. Each segment is one factor’s share; hover or focus a segment to read it.'}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-caption text-slate-700">
        {used.map((f) => (
          <span key={f.id} className="flex items-center gap-1" title={factorLabel(f.id)}>
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: factorColor(f.id) }} />
            {f.short}
          </span>
        ))}
      </div>
    </div>
  );
}
