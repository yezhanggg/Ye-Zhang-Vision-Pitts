import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../lib/store';
import MatchView from './MatchView';
import CompareTractsView from './CompareTractsView';
import CompareScenariosView from './CompareScenariosView';
import AnalysisChat from './AnalysisChat';

/**
 * The Analysis section: the active view fills the body; the Match / Compare pills float in the shell. The
 * search-and-question box sits in the top-right corner of every view, as in Explore (Match places it itself,
 * above its tract card).
 */
export default function AnalysisView() {
  const mode = useApp((s) => s.mode);
  return (
    <div className="relative h-full">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={mode} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {mode === 'match' && <MatchView />}
          {mode === 'tracts' && <CompareTractsView />}
          {mode === 'scenarios' && <CompareScenariosView />}
        </motion.div>
      </AnimatePresence>
      {mode !== 'match' && (
        <div className="pointer-events-none absolute right-3 top-3 z-30 flex w-[440px] justify-end">
          <AnalysisChat compact />
        </div>
      )}
    </div>
  );
}
