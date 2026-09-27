import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../lib/store';
import MatchView from './MatchView';
import CompareTractsView from './CompareTractsView';
import CompareScenariosView from './CompareScenariosView';

/** The Analysis section: the active view fills the body; the Match / Compare pills float in the shell. */
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
    </div>
  );
}
