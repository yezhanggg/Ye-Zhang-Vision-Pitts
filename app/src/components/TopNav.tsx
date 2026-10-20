// The top-center switch online: Explore | Analysis, where Analysis names the view in use and opens a menu of its three
// views (Place, Compare places, Equity & policy) on hover, focus or click. Loaded on demand; the offline single file
// keeps AppShell's two rows of pills.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { sectionOf, useApp, type AnalysisMode } from '../lib/store';
import { UI } from '../lib/copy';
import { cx } from '../lib/format';
import { Chevron, SPRING_TAB } from './primitives';

const VIEWS: { id: AnalysisMode; label: string; line: string }[] = [
  { id: 'match', label: UI.matchTab, line: 'Read one place and test a project there' },
  { id: 'tracts', label: UI.compareTractsTab, line: 'Two places side by side, with the comparison between' },
  { id: 'scenarios', label: UI.compareScenariosTab, line: 'Where renters need help and what policies would change' },
];

const TAB = 'relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-1.5 text-body font-semibold transition-colors max-sm:px-3 max-sm:text-small';

export default function TopNav() {
  const mode = useApp((s) => s.mode);
  const lastAnalysis = useApp((s) => s.lastAnalysis);
  const setMode = useApp((s) => s.setMode);
  const analysis = sectionOf(mode) === 'analysis';
  const current = VIEWS.find((v) => v.id === (analysis ? mode : lastAnalysis)) ?? VIEWS[0];
  const [open, setOpen] = useState(false);
  const shut = useRef<number | undefined>(undefined);
  const show = () => {
    window.clearTimeout(shut.current);
    setOpen(true);
  };
  const hide = () => {
    window.clearTimeout(shut.current);
    shut.current = window.setTimeout(() => setOpen(false), 160);
  };
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);
  const pick = (id: AnalysisMode) => {
    setMode(id);
    setOpen(false);
  };

  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-30 flex -translate-x-1/2 flex-col items-center">
      <nav aria-label="Sections" data-tour="sections" className="pointer-events-auto relative flex gap-0.5 rounded-xl bg-white/95 p-1 shadow-lg ring-1 ring-black/5 backdrop-blur">
        <button type="button" onClick={() => setMode('explore')} aria-current={!analysis ? 'page' : undefined} className={cx(TAB, !analysis ? 'bg-stone-100 text-slate-900 ring-1 ring-black/5' : 'text-slate-600 hover:bg-stone-100 hover:text-slate-900')}>
          {UI.explore}
        </button>
        <div className="relative" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
          <motion.button
            type="button"
            data-tour="subtabs"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-current={analysis ? 'page' : undefined}
            onClick={() => (analysis ? setOpen(!open) : (setMode(current.id), setOpen(true)))}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            transition={SPRING_TAB}
            className={cx(TAB, analysis ? 'bg-stone-100 text-slate-900 ring-1 ring-black/5' : 'text-slate-600 hover:bg-stone-100 hover:text-slate-900', open && 'ring-violet-300')}
          >
            {UI.analysis}
            {analysis && <span className="text-small font-medium text-violet-700 max-sm:hidden">· {current.label}</span>}
            <span className="inline-flex transition-transform" style={{ transform: `rotate(${open ? -90 : 90}deg)` }}>
              <Chevron className="h-3.5 w-3.5 text-slate-500" />
            </span>
          </motion.button>
          <AnimatePresence>
            {open && (
              <motion.div
                role="menu"
                aria-label="Analysis views"
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
                transition={SPRING_TAB}
                style={{ transformOrigin: 'top center', width: 288 }}
                className="absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-black/5"
              >
                {VIEWS.map((v) => {
                  const on = analysis && mode === v.id;
                  return (
                    <button key={v.id} type="button" role="menuitem" aria-current={on ? 'page' : undefined} onClick={() => pick(v.id)} className={cx('block w-full rounded-lg px-3 py-2 text-left transition-colors', on ? 'bg-violet-50' : 'hover:bg-stone-100')}>
                      <span className={cx('block text-small font-semibold', on ? 'text-violet-800' : 'text-slate-900')}>{v.label}</span>
                      <span className="block text-caption leading-snug text-slate-600">{v.line}</span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>
    </div>
  );
}
