import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { sectionOf, useApp } from './lib/store';
import AppShell from './components/AppShell';
import ExploreView from './components/explore/ExploreView';
import AnalysisView from './components/AnalysisView';
import SourcesModal from './components/SourcesModal';

export default function App() {
  const mode = useApp((s) => s.mode);
  const lite = useApp((s) => s.lite);
  const section = sectionOf(mode);
  return (
    <MotionConfig reducedMotion={lite ? 'always' : 'user'}>
      <AppShell>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={section} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {section === 'explore' ? <ExploreView /> : <AnalysisView />}
          </motion.div>
        </AnimatePresence>
      </AppShell>
      <SourcesModal />
    </MotionConfig>
  );
}
