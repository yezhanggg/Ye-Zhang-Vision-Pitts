import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Compass, Home } from 'lucide-react';
import { TOUR_COPY, useTour } from '../lib/tour';
import TourLayer from './tour/TourLayer';
import { sectionOf, useApp, type AnalysisMode } from '../lib/store';
import { cx } from '../lib/format';
import { UI } from '../lib/copy';
import { SPRING_TAB } from './primitives';

type Section = ReturnType<typeof sectionOf>;
const SUBTABS: { id: AnalysisMode; label: string }[] = [
  { id: 'match', label: UI.matchTab },
  { id: 'tracts', label: UI.compareTractsTab },
  { id: 'scenarios', label: UI.compareScenariosTab },
];

function Pill<T extends string>({ items, value, onPick, ariaLabel, layoutId, size = 'md', tour }: { items: { id: T; label: string }[]; value: T; onPick: (id: T) => void; ariaLabel: string; layoutId: string; size?: 'md' | 'sm'; tour?: string }) {
  return (
    <nav aria-label={ariaLabel} data-tour={tour} className={cx('pointer-events-auto flex rounded-xl bg-white/95 shadow-lg ring-1 ring-black/5 backdrop-blur', size === 'md' ? 'p-1' : 'p-0.5')}>
      {items.map((t) => {
        const on = value === t.id;
        return (
          <button key={t.id} onClick={() => onPick(t.id)} aria-current={on ? 'page' : undefined} className={cx('relative rounded-lg font-semibold transition-colors', size === 'md' ? 'px-4 py-1.5 text-body' : 'px-3 py-1 text-small', on ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900')}>
            {on && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-lg bg-stone-100 ring-1 ring-black/5" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
            <span className="relative">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/**
 * No fixed bars, no name, no logo: the map fills the window and every control floats on it. The heading is the
 * same in Explore and Analysis. Top-left: Home (back to the start page, where Details and About live). Top-center:
 * Explore | Analysis, then the Analysis views. Top-right: the search-and-question box, placed by each view.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const mode = useApp((s) => s.mode);
  const lastAnalysis = useApp((s) => s.lastAnalysis);
  const { setMode, set } = useApp.getState();
  const section = sectionOf(mode);
  const sections: { id: Section; label: string }[] = [
    { id: 'explore', label: UI.explore },
    { id: 'analysis', label: UI.analysis },
  ];

  return (
    <div className="relative h-full">
      <div className="absolute inset-0">{children}</div>
      <div className="absolute left-3 top-3 z-30 flex items-center gap-1.5">
        <motion.button onClick={() => set({ view: 'landing' })} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }} transition={SPRING_TAB} title={UI.homeTitle} className="flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-small font-semibold text-slate-700 shadow-lg ring-1 ring-black/5 backdrop-blur hover:bg-white hover:text-slate-900">
          <Home className="h-4 w-4" />
          {UI.home}
        </motion.button>
        <motion.button onClick={() => useTour.getState().start()} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }} transition={SPRING_TAB} title={TOUR_COPY.buttonTitle} className="flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-small font-semibold text-slate-700 shadow-lg ring-1 ring-black/5 backdrop-blur hover:bg-white hover:text-slate-900">
          <Compass className="h-4 w-4" />
          {TOUR_COPY.button}
        </motion.button>
      </div>
      <div className="pointer-events-none absolute left-1/2 top-3 z-30 flex -translate-x-1/2 flex-col items-center gap-1.5">
        <Pill items={sections} value={section} onPick={(id) => setMode(id === 'explore' ? 'explore' : lastAnalysis)} ariaLabel="Sections" layoutId="tab-pill" tour="sections" />
        {section === 'analysis' && <Pill items={SUBTABS} value={mode as AnalysisMode} onPick={(id) => setMode(id)} ariaLabel="Analysis views" layoutId="subtab-pill" size="sm" tour="subtabs" />}
      </div>
      <TourLayer />
    </div>
  );
}
