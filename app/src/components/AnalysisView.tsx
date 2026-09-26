import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp, type AnalysisMode } from '../lib/store';
import { cx } from '../lib/format';
import { UI } from '../lib/copy';
import MatchView from './MatchView';
import CompareTractsView from './CompareTractsView';
import CompareScenariosView from './CompareScenariosView';
import { ValuesBadge } from './primitives';

const SUBTABS: { id: AnalysisMode; label: string }[] = [
  { id: 'match', label: UI.matchTab },
  { id: 'tracts', label: UI.compareTractsTab },
  { id: 'scenarios', label: UI.compareScenariosTab },
];

/** The Analysis section: a slim sub-tab bar (Match · Compare tracts · Compare scenarios · Copy link) over the active view. */
export default function AnalysisView() {
  const mode = useApp((s) => s.mode);
  const { setMode } = useApp.getState();
  const [copied, setCopied] = useState(false);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* clipboard blocked on file:// in some browsers; the hash is still in the address bar */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="flex h-full flex-col">
      <div className="relative z-20 grid h-11 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-stone-200/80 bg-white/90 px-4 backdrop-blur">
        <div className="hidden min-w-0 items-center gap-2 text-caption text-slate-600 md:flex" title={UI.analysisCaption}>
          <span className="truncate">{UI.analysisCaption}</span>
          <span className="hidden shrink-0 xl:inline-flex">
            <ValuesBadge />
          </span>
        </div>
        <nav aria-label="Analysis views" className="col-start-2 flex rounded-lg bg-stone-100 p-0.5 ring-1 ring-stone-200/70">
          {SUBTABS.map((t) => (
            <button key={t.id} onClick={() => setMode(t.id)} aria-current={mode === t.id ? 'page' : undefined} className={cx('relative rounded-md px-3 py-1 text-small font-semibold transition-colors', mode === t.id ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900')}>
              {mode === t.id && <motion.span layoutId="subtab-pill" className="absolute inset-0 rounded-md bg-white shadow-sm ring-1 ring-black/5" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="flex justify-end">
          <button onClick={copyLink} className="rounded-lg bg-white px-2.5 py-1 text-small font-semibold text-slate-700 ring-1 ring-stone-300 hover:ring-stone-400">
            {copied ? UI.linkCopied : UI.copyLink}
          </button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={mode} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {mode === 'match' && <MatchView />}
            {mode === 'tracts' && <CompareTractsView />}
            {mode === 'scenarios' && <CompareScenariosView />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
