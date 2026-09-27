import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PanelRightClose } from 'lucide-react';
import { useApp } from '../lib/store';
import { UI } from '../lib/copy';

/**
 * The floating right panel (Explore summary, Match tract card). `ui.right` hides it; the shell's top-right cluster
 * brings it back. `show` lets a view keep it off until its intro has finished.
 */
export default function PanelFrame({ children, show = true }: { children: ReactNode; show?: boolean }) {
  const open = useApp((s) => s.ui.right);
  const setUi = useApp((s) => s.setUi);
  const lite = useApp((s) => s.lite);
  return (
    <AnimatePresence>
      {show && open && (
        <motion.div key="panel" initial={lite ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }} className="absolute bottom-3 right-3 top-16 z-20 flex w-[440px] flex-col rounded-2xl bg-white/95 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.25)] ring-1 ring-black/5 backdrop-blur">
          <button onClick={() => setUi({ right: false })} className="absolute -left-3.5 top-3 z-20 grid h-7 w-7 place-items-center rounded-full bg-white text-slate-500 shadow-md ring-1 ring-black/10 hover:text-slate-900" aria-label={UI.hideSummary} title={UI.hideSummary}>
            <PanelRightClose className="h-3.5 w-3.5" />
          </button>
          <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto rounded-2xl">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
