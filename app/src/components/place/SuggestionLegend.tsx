// The Match map's legend: each ranked tract is colored by the housing type the rules suggest under the current
// focusing issue and income level; grey where no one at that level is under-served (or the focus suggests nothing).
import { motion } from 'motion/react';
import { scoring } from '../../lib/data';
import { NO_DATA } from '../../lib/mapStyle';
import { Dot } from '../primitives';

export default function SuggestionLegend({ focus, level, counts, noneLabel = 'No suggestion (no under-served renters at this level)' }: { focus: string; level: string; counts: Record<string, number>; noneLabel?: string }) {
  return (
    <motion.div layout className="rounded-xl bg-white/95 px-3.5 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur">
      <div className="text-small font-semibold text-slate-900">
        Suggested housing type · {focus} · {level}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1.5">
        {scoring.typologies.map((t) => (
          <div key={t.id} className="flex items-center gap-1.5 text-small text-slate-800">
            <Dot color={t.color} size={10} />
            <span className="flex-1">{t.label}</span>
            <span className="text-caption text-slate-500 tnum">{counts[t.id] ?? 0}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex max-w-64 items-center gap-1.5 text-caption text-slate-700">
        <span className="h-3 w-4 shrink-0 rounded-sm ring-1 ring-stone-300" style={{ background: NO_DATA }} />
        <span>
          {noneLabel} <span className="text-slate-500 tnum">{counts.none ?? 0}</span>
        </span>
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-caption text-slate-600">
        <span className="h-3 w-4 shrink-0 rounded-sm" style={{ background: '#efede9' }} />
        Not ranked (fewer than 25 households)
      </div>
    </motion.div>
  );
}
