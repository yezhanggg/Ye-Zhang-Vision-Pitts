// "Why #1 and not #2": diverging bars for the four factors whose contributions differ most between the top two
// types, in the two typology colours. Positive bars favour the top type. Numbers come from lib/analysis.factorGaps.
import { factorGaps, factorLabel, typeLabel, type Rationale } from '../../lib/analysis/rationale';
import { pts1, unit } from '../../lib/analysis/copy';
import { typologyById } from '../../lib/data';
import type { TractResult } from '../../lib/derived';
import { useApp } from '../../lib/store';
import { cx } from '../../lib/format';
import { Dot, SectionTitle } from '../primitives';

export default function GapBars({ r, ra }: { r: TractResult; ra: Rationale }) {
  const lite = useApp((s) => s.lite);
  if (!ra.top || !ra.second) return null;
  const gaps = factorGaps(r, ra.top, ra.second);
  if (!gaps.length) return null;
  const rows = [...gaps].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 4).sort((a, b) => b.delta - a.delta);
  // Nothing separates them (one factor on, or identical rows): no chart to draw.
  if (!rows.some((g) => Math.abs(g.delta) >= 0.05)) return null;
  const max = Math.max(...rows.map((g) => Math.abs(g.delta)), 0.5);
  const A = typeLabel(ra.top), B = typeLabel(ra.second);
  const cA = typologyById.get(ra.top)?.color ?? '#475569', cB = typologyById.get(ra.second)?.color ?? '#94a3b8';
  const tie = ra.state === 'tie';
  const trans = lite ? '' : 'transition-[width] duration-500 ease-out';
  return (
    <section>
      <SectionTitle sub={tie ? 'The four factors that differ most between the tied types.' : `The four factors that differ most. Positive bars favor ${A}.`}>{tie ? `Where ${A} and ${B} differ` : `Why ${A} and not ${B}`}</SectionTitle>
      <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-stone-200/80">
        <ul className="space-y-1.5">
          {rows.map((g) => {
            const pos = g.delta >= 0;
            const w = (Math.abs(g.delta) / max) * 50;
            const sign = Math.abs(g.delta) < 0.05 ? '' : pos ? '+' : '−';
            // The points stay in the tooltip; the bar itself is the reading (ranks and words, no score).
            const tip = `${factorLabel(g.factor)}: ${sign}${pts1(g.delta)} ${unit(pts1(g.delta))} for ${pos ? A : B}`;
            return (
              <li key={g.factor} className="flex items-center gap-2 text-small" title={tip}>
                <span className="w-32 shrink-0 truncate text-slate-800">{factorLabel(g.factor)}</span>
                <div className="relative h-4 flex-1" role="img" aria-label={tip}>
                  <span className="absolute inset-y-0 left-1/2 w-px bg-stone-300" />
                  <span className={cx('absolute top-0.5 h-3 rounded-sm', trans)} style={pos ? { left: '50%', width: `${w}%`, background: cA } : { right: '50%', width: `${w}%`, background: cB }} />
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-slate-700">
          <span className="flex items-center gap-1">
            <Dot color={cA} size={8} /> favors {A}
          </span>
          <span className="flex items-center gap-1">
            <Dot color={cB} size={8} /> favors {B}
          </span>
          <span className="text-slate-500">longer is a bigger difference; hover a bar for the points</span>
        </div>
      </div>
    </section>
  );
}
