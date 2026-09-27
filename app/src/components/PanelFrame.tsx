import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useApp } from '../lib/store';
import { UI } from '../lib/copy';
import { cx } from '../lib/format';
import { SPRING_PANEL, SPRING_TAB } from './primitives';

/**
 * The floating right panel (Explore summary, Match tract card). Closed, it folds into a small tab in its own
 * corner, the mirror of the left panel, growing out of the tab and shrinking back into it. It follows `ui.right`
 * unless a view passes its own `open` / `onToggle` (Explore does: its summary opens when there is something to
 * show). `inline` lets a parent column place it (under the question box); `show` keeps it off until an intro ends.
 */
export default function PanelFrame({ children, show = true, open: controlled, onToggle, title = UI.summaryTab, inline = false, tourId }: { children: ReactNode; show?: boolean; open?: boolean; onToggle?: (open: boolean) => void; title?: string; inline?: boolean; /** Marks the open panel for the quick tour. */ tourId?: string }) {
  const stored = useApp((s) => s.ui.right);
  const setUi = useApp((s) => s.setUi);
  const open = controlled ?? stored;
  const toggle = (o: boolean) => (onToggle ? onToggle(o) : setUi({ right: o }));
  return (
    <AnimatePresence initial={false} mode="popLayout">
      {show &&
        (open ? (
          <motion.div key="panel" data-tour={tourId} style={{ transformOrigin: 'top right' }} initial={{ opacity: 0, scale: 0.9, x: 14, filter: 'blur(6px)' }} animate={{ opacity: 1, scale: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.92, x: 14, filter: 'blur(6px)', transition: { duration: 0.18, ease: 'easeIn' } }} transition={SPRING_PANEL} className={cx('flex flex-col rounded-2xl bg-white/95 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.25)] ring-1 ring-black/5 backdrop-blur', inline ? 'pointer-events-auto relative min-h-0 w-full flex-1' : 'absolute bottom-3 right-3 top-16 z-20 w-[440px] max-sm:left-3 max-sm:w-auto')} aria-label={title}>
            <motion.button onClick={() => toggle(false)} whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.88 }} transition={SPRING_TAB} className="absolute -left-3.5 top-3 z-20 grid h-7 w-7 place-items-center rounded-full bg-white text-slate-500 shadow-md ring-1 ring-black/10 hover:text-slate-900" aria-label={UI.hideSummary} title={UI.hideSummary}>
              <PanelRightClose className="h-3.5 w-3.5" />
            </motion.button>
            <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto rounded-2xl">{children}</div>
          </motion.div>
        ) : (
          <motion.div key="panel-tab" style={{ transformOrigin: 'top right' }} initial={{ opacity: 0, scale: 0.6, x: 8 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.12 } }} transition={SPRING_TAB} className={inline ? 'pointer-events-auto' : 'absolute right-3 top-16 z-20'}>
            <motion.button onClick={() => toggle(true)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} transition={SPRING_TAB} className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-small font-semibold text-slate-800 shadow-lg ring-1 ring-black/5 backdrop-blur hover:bg-white" aria-label={UI.showSummary} title={UI.showSummary}>
              {title}
              <PanelRightOpen className="h-4 w-4 text-slate-600" />
            </motion.button>
          </motion.div>
        ))}
    </AnimatePresence>
  );
}

/** The right column of a map view: the question box on top, the summary (or its small tab) underneath. */
export function RightColumn({ children }: { children: ReactNode }) {
  // Wide screens: a column at the top right. Under 1100 px it starts below the top bar and narrows. On a phone it
  // becomes a sheet along the bottom (at most about half the screen), so the map stays visible above it.
  return (
    <div data-tour="right" className="pointer-events-none absolute bottom-3 right-3 top-3 z-20 flex w-[440px] flex-col items-end gap-2 max-[1099px]:top-[7.25rem] max-[1099px]:w-[380px] max-sm:inset-x-2 max-sm:bottom-2 max-sm:top-auto max-sm:max-h-[52vh] max-sm:w-auto">
      {children}
    </div>
  );
}
