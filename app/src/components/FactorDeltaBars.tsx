import { LayoutGroup, motion } from 'motion/react';
import { fLabel, type DeltaRow } from '../lib/derived';
import { pctShort } from '../lib/copy';
import { useApp } from '../lib/store';

/** Diverging A−B factor bars, sorted by how much each factor drives the difference in the match score. */
export default function FactorDeltaBars({ rows, colorA, colorB, labelA, labelB, typology }: { rows: DeltaRow[]; colorA: string; colorB: string; labelA: string; labelB: string; typology: string }) {
  const lite = useApp((s) => s.lite);
  const tr = lite ? { duration: 0 } : { type: 'spring' as const, stiffness: 320, damping: 30 };
  const effect = (r: DeltaRow) => {
    if (Math.abs(r.gap) < 0.002) return { text: `Little effect on the ${typology} match`, color: '#475569' };
    return r.gap > 0 ? { text: `Gives ${labelA} the edge for ${typology}`, color: colorA } : { text: `Gives ${labelB} the edge for ${typology}`, color: colorB };
  };
  const val = (x: number | null, subsidy: boolean) => (x == null ? 'no data' : subsidy ? (x >= 0.5 ? 'eligible' : 'not eligible') : pctShort(x));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-caption font-semibold">
        <span style={{ color: colorB }}>◀ {labelB} higher</span>
        <span style={{ color: colorA }}>{labelA} higher ▶</span>
      </div>
      <LayoutGroup id="delta">
        <ul className="space-y-1.5">
          {rows.map((r) => {
            const d = r.delta;
            const w = d == null ? 0 : Math.min(1, Math.abs(d)) * 50;
            const sub = r.factor === 'subsidy_eligible';
            const e = effect(r);
            return (
              <motion.li key={r.factor} layout="position" transition={tr} className="rounded-lg bg-white px-3 py-2 ring-1 ring-stone-200/70">
                <div className="text-small font-semibold text-slate-900">{fLabel(r.factor)}</div>
                <div className="relative mt-1 h-2 rounded-full bg-stone-100">
                  <div className="absolute left-1/2 top-[-2px] h-3 w-px bg-slate-400" />
                  {d == null ? <div className="hatch absolute inset-0 rounded-full" /> : <motion.div className="absolute top-0 h-full rounded-full" style={{ background: d >= 0 ? colorA : colorB }} initial={false} animate={{ left: d >= 0 ? '50%' : `${50 - w}%`, width: `${w}%` }} transition={tr} />}
                </div>
                <div className="mt-1 text-caption text-slate-700">
                  <span style={{ color: colorA }} className="font-semibold">
                    {labelA}
                  </span>
                  : {val(r.a, sub)} ·{' '}
                  <span style={{ color: colorB }} className="font-semibold">
                    {labelB}
                  </span>
                  : {val(r.b, sub)}
                </div>
                <div className="text-caption font-medium" style={{ color: e.color }}>
                  {e.text}
                </div>
              </motion.li>
            );
          })}
        </ul>
      </LayoutGroup>
      <p className="mt-2 text-caption text-slate-600">Percentages compare each place with all residential city tracts. Rows are sorted by how much they change the {typology} match score, using your priorities.</p>
    </div>
  );
}
