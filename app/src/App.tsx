import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useApp } from './lib/store';
import AppShell from './components/AppShell';
import ExploreView from './components/ExploreView';
import CompareTractsView from './components/CompareTractsView';
import CompareScenariosView from './components/CompareScenariosView';
import SourcesModal from './components/SourcesModal';
import LandingPage from './components/LandingPage';

export default function App() {
  const view = useApp((s) => s.view);
  const mode = useApp((s) => s.mode);
  const lite = useApp((s) => s.lite);
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
                <motion.div key={mode} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  {mode === 'explore' && <ExploreView />}
                  {mode === 'tracts' && <CompareTractsView />}
                  {mode === 'scenarios' && <CompareScenariosView />}
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
