// "The data behind it" as a compact table: one row per factor with its percentile strip, the observed value, the
// confidence tag, the reader's priority word and the fit direction for the top type. A row opens into the full card.
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { activeFactors, scoring } from '../../lib/data';
import { factorName, weightWord } from '../../lib/copy';
import { useApp } from '../../lib/store';
import { cx, isNum } from '../../lib/format';
import type { Conf, TractProps, Weights } from '../../lib/types';
import { FactorCard, hudLine, rawLine, subsidyGrade } from '../FactorCards';
import { ConfChip, SPRING_FOLD } from '../primitives';

/** The fit direction for the top type: higher helps, lower helps, or no effect. */
function fitGlyph(d: number | undefined, topName: string | null): { glyph: string; title: string } | null {
  if (d === undefined || !topName) return null;
  if (d === 0) return { glyph: '–', title: `Does not affect the ${topName} match` };
  return d > 0 ? { glyph: '↑', title: `Higher is better for ${topName}` } : { glyph: '↓', title: `Lower is better for ${topName}` };
}

function Strip({ x, grade, lite }: { x: number | null; grade: boolean; lite: boolean }) {
  return (
    <div className="relative h-1.5 flex-1 rounded-full bg-gradient-to-r from-stone-100 via-stone-200 to-stone-300" title={x == null ? 'No data' : grade ? `Grade ${x}` : `Higher than ${Math.round(x * 100)}% of city tracts`}>
      {!grade && <span className="absolute top-[-2px] h-[10px] w-px bg-slate-400" style={{ left: '50%' }} aria-hidden />}
      {x == null ? <span className="hatch absolute inset-0 rounded-full" /> : <motion.span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-900 shadow" initial={false} animate={{ left: `${x * 100}%` }} transition={lite ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 28 }} />}
    </div>
  );
}

export default function FactorTable({ t, weights, topTypology }: { t: TractProps; weights: Weights; topTypology: string | null }) {
  const lite = useApp((s) => s.lite);
  const [open, setOpen] = useState<string | null>(null);
  const topName = topTypology ? scoring.typologies.find((k) => k.id === topTypology)?.label ?? null : null;
  return (
    <div className="divide-y divide-stone-100 overflow-hidden rounded-xl bg-white ring-1 ring-stone-200/80">
      {activeFactors.map((f) => {
        const x = isNum(t[f.id]) ? (t[f.id] as number) : null;
        const conf = x == null ? null : ((t[`${f.id}_conf`] as Conf | null) ?? null);
        const grade = f.id === 'subsidy_eligible';
        const fit = fitGlyph(topTypology ? scoring.fit.matrix[topTypology]?.[f.id] : undefined, topName);
        const w = weights[f.id] ?? 0;
        const isOpen = open === f.id;
        const hud = f.id === 'need' ? hudLine() : null;
        return (
          <div key={f.id}>
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : f.id)} className={cx('w-full px-3 py-2 text-left transition-colors hover:bg-stone-50', isOpen && 'bg-stone-50')}>
              <div className="flex items-center gap-2.5">
                <span className="w-[72px] shrink-0 truncate text-small font-semibold text-slate-900" title={factorName(f.id, f.label)}>
                  {f.short}
                </span>
                <Strip x={x} grade={grade} lite={lite} />
                <span className="shrink-0">
                  <ConfChip conf={conf} />
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-2 text-caption">
                <span className="min-w-0 truncate text-slate-600" title={grade && x != null ? subsidyGrade(x) : undefined}>
                  {grade && x != null ? `${subsidyGrade(x)} · ${rawLine(f, t)}` : rawLine(f, t)}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className={cx('font-medium', w > 0 ? 'text-violet-800' : 'text-slate-500')}>Your priority: {weightWord(w)}</span>
                  {fit && (
                    <span className="grid h-4 w-4 place-items-center rounded bg-stone-100 font-semibold text-slate-700" title={fit.title} aria-label={fit.title}>
                      {fit.glyph}
                    </span>
                  )}
                </span>
              </div>
              {hud && <div className="mt-0.5 text-caption text-slate-600">{hud}</div>}
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={lite ? { duration: 0 } : SPRING_FOLD} className="overflow-hidden">
                  <div className="px-2 pb-2">
                    <FactorCard f={f} t={t} weight={w} topTypology={topTypology} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
