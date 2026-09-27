import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useApp } from '../lib/store';
import { UI } from '../lib/copy';
import { cx } from '../lib/format';

/**
 * The floating right panel (Explore summary, Match tract card). Closed, it folds into a small tab in the same
 * corner, the mirror of the left panel. It follows `ui.right` unless a view passes its own `open` / `onToggle`
 * (Explore does: its summary opens when there is something to show). `show` keeps both off until an intro ends.
 */
export default function PanelFrame({ children, show = true, open: controlled, onToggle, title = UI.summaryTab, inline = false }: { children: ReactNode; show?: boolean; open?: boolean; onToggle?: (open: boolean) => void; title?: string; /** Laid out by the parent (a column) instead of pinned to the corner. */ inline?: boolean }) {
  const stored = useApp((s) => s.ui.right);
  const setUi = useApp((s) => s.setUi);
  const lite = useApp((s) => s.lite);
  const open = controlled ?? stored;
  const toggle = (o: boolean) => (onToggle ? onToggle(o) : setUi({ right: o }));
  return (
    <AnimatePresence initial={false}>
      {show &&
        (open ? (
          <motion.div key="panel" initial={lite ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={lite ? undefined : { opacity: 0, x: 24 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }} className={cx('flex w-[440px] flex-col rounded-2xl bg-white/95 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.25)] ring-1 ring-black/5 backdrop-blur', inline ? 'pointer-events-auto relative min-h-0 flex-1' : 'absolute bottom-3 right-3 top-16 z-20')} aria-label={title}>
            <button onClick={() => toggle(false)} className="absolute -left-3.5 top-3 z-20 grid h-7 w-7 place-items-center rounded-full bg-white text-slate-500 shadow-md ring-1 ring-black/10 hover:text-slate-900" aria-label={UI.hideSummary} title={UI.hideSummary}>
              <PanelRightClose className="h-3.5 w-3.5" />
            </button>
            <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto rounded-2xl">{children}</div>
          </motion.div>
        ) : (
          <motion.div key="panel-tab" initial={lite ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={inline ? 'pointer-events-auto' : 'absolute right-3 top-16 z-20'}>
            <button onClick={() => toggle(true)} className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-small font-semibold text-slate-800 shadow-lg ring-1 ring-black/5 backdrop-blur hover:bg-white" aria-label={UI.showSummary} title={UI.showSummary}>
              {title}
              <PanelRightOpen className="h-4 w-4 text-slate-600" />
            </button>
          </motion.div>
        ))}
    </AnimatePresence>
  );
}
