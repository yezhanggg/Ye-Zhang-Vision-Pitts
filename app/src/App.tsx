import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { sectionOf, useApp } from './lib/store';
import AppShell from './components/AppShell';
import LandingPage from './components/LandingPage';
import ExploreView from './components/explore/ExploreView';
import AnalysisView from './components/AnalysisView';
import SourcesModal from './components/SourcesModal';

export default function App() {
  const view = useApp((s) => s.view);
  const mode = useApp((s) => s.mode);
  const lite = useApp((s) => s.lite);
  const section = sectionOf(mode);
  return (
    <MotionConfig reducedMotion={lite ? 'always' : 'user'}>
      <AnimatePresence mode="wait" initial={false}>
        {view === 'landing' ? (
          <motion.div key="landing" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.985 }} transition={{ duration: 0.35 }}>
            <LandingPage />
          </motion.div>
        ) : (
          <motion.div key="app" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <AppShell>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={section} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  {section === 'explore' ? <ExploreView /> : <AnalysisView />}
                </motion.div>
              </AnimatePresence>
            </AppShell>
          </motion.div>
        )}
      </AnimatePresence>
      <SourcesModal />
    </MotionConfig>
  );
}
