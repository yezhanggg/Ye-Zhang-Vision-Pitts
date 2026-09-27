import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useStrictChat } from '../lib/analysis/strictChat';
import { useApp, type AnalysisMode } from '../lib/store';
import MatchView from './MatchView';
import CompareTractsView from './CompareTractsView';
import EquityPolicyView from './equity/EquityPolicyView';

/**
 * Keep the sub-views mounted: a view mounts the first time its mode is visited and Match plus the most recently
 * visited compare view stay alive (at most three maps), so switching back never rebuilds a map. `false` restores
 * the remounting fade (one view mounted at a time).
 */
const KEEP_ALIVE = true;

const FADE = { duration: 0.2 };

/** The views to keep mounted for `mode`: Match once visited, plus the current compare view only. */
function useKeptViews(mode: AnalysisMode): AnalysisMode[] {
  const [views, setViews] = useState<AnalysisMode[]>(() => [mode]);
  const otherCompare = views.some((v) => v !== 'match' && v !== mode);
  if (!views.includes(mode) || (mode !== 'match' && otherCompare)) setViews(mode === 'match' ? [...views, 'match'] : [...views.filter((v) => v === 'match'), mode]);
  return views;
}

function View({ mode, active }: { mode: AnalysisMode; active: boolean }) {
  if (mode === 'match') return <MatchView />;
  if (mode === 'tracts') return <CompareTractsView active={active} />;
  return <EquityPolicyView active={active} />;
}

/**
 * The Analysis section: the active view fills the body; the Match / Compare pills float in the shell. The
 * search-and-question box sits inside each view (Match: its right column; the compare views: the top of the rail),
 * and while this section is mounted an answer whose figures could not be checked is withheld from it.
 */
export default function AnalysisView() {
  const mode = useApp((s) => s.mode);
  const lastAnalysis = useApp((s) => s.lastAnalysis);
  useStrictChat();
  const current: AnalysisMode = mode === 'explore' ? lastAnalysis : mode;
  const views = useKeptViews(current);
  if (!KEEP_ALIVE) {
    return (
      <div className="relative h-full">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={current} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FADE}>
            <View mode={current} active />
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }
  return (
    <div className="relative h-full">
      {views.map((v) => {
        const active = v === current;
        return (
          <motion.div
            key={v}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={active ? { opacity: 1, visibility: 'visible' } : { opacity: 0, transitionEnd: { visibility: 'hidden' } }}
            transition={FADE}
            style={{ pointerEvents: active ? 'auto' : 'none' }}
            inert={!active}
            aria-hidden={!active}
            data-view={v}
            data-active={active ? 'true' : 'false'}
          >
            <View mode={v} active={active} />
          </motion.div>
        );
      })}
    </div>
  );
}
