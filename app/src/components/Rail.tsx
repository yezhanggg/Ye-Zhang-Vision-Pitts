import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { SECTION_LABELS, useApp, type SectionId } from '../lib/store';
import { UI } from '../lib/copy';
import { cx } from '../lib/format';
import { Explainer, FoldButton, SPRING_PANEL, SPRING_TAB } from './primitives';

const BODY = 'scroll-quiet min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 pb-3 pt-1';

function RailHeader({ title, onHide }: { title: string; onHide: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 pb-1 pt-2.5">
      <div className="font-display text-body font-bold text-slate-900">{title}</div>
      <FoldButton onClick={onHide} label={UI.hidePanel}>
        <PanelLeftClose className="h-4 w-4" />
      </FoldButton>
    </div>
  );
}

/**
 * The left panel. `float` (Explore, Match): a card floating over the map, as tall as its open sections (it scrolls once
 * it reaches the bottom of the map), that folds into a small tab in its own corner, growing out of it and shrinking back into it. Docked (the compare views): an in-flow column that narrows
 * to a slim strip so the content under the maps gets the width. Both follow `ui.left`, which persists per browser.
 */
export default function Rail({ children, title, float, maxHeightClass }: { children: ReactNode; title: string; float?: boolean; /** Floating panel height cap (e.g. to leave room for a legend below it). */ maxHeightClass?: string }) {
  const open = useApp((s) => s.ui.left);
  const setUi = useApp((s) => s.setUi);
  if (float) {
    return (
      <AnimatePresence initial={false} mode="popLayout">
        {open ? (
          <motion.aside key="rail" data-tour="rail" style={{ transformOrigin: 'top left' }} initial={{ opacity: 0, scale: 0.9, x: -14, filter: 'blur(6px)' }} animate={{ opacity: 1, scale: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.92, x: -14, filter: 'blur(6px)', transition: { duration: 0.18, ease: 'easeIn' } }} transition={SPRING_PANEL} className={cx('absolute left-3 top-16 z-20 flex w-[340px] flex-col', maxHeightClass ?? 'max-h-[calc(100%-4.75rem)]', 'rounded-2xl bg-white/95 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.25)] ring-1 ring-black/5 backdrop-blur xl:w-[360px]')} aria-label={title}>
            <RailHeader title={title} onHide={() => setUi({ left: false })} />
            <div className={BODY}>{children}</div>
          </motion.aside>
        ) : (
          <motion.div key="rail-tab" style={{ transformOrigin: 'top left' }} initial={{ opacity: 0, scale: 0.6, x: -8 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.12 } }} transition={SPRING_TAB} className="absolute left-3 top-16 z-20">
            <motion.button onClick={() => setUi({ left: true })} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} transition={SPRING_TAB} className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-small font-semibold text-slate-800 shadow-lg ring-1 ring-black/5 backdrop-blur hover:bg-white" aria-label={UI.showPanel} title={UI.showPanel}>
              <PanelLeftOpen className="h-4 w-4 text-slate-600" />
              {title}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
  return (
    <motion.aside initial={false} animate={{ width: open ? 352 : 44 }} transition={SPRING_PANEL} className="relative z-10 flex h-full shrink-0 flex-col overflow-hidden border-r border-stone-200/80 bg-[#fbfaf8] pt-14" aria-label={title}>
      <AnimatePresence initial={false} mode="popLayout">
        {open ? (
          <motion.div key="open" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12, transition: { duration: 0.12 } }} transition={SPRING_PANEL} className="flex h-full w-[352px] flex-col">
            <RailHeader title={title} onHide={() => setUi({ left: false })} />
            <div className={BODY}>{children}</div>
          </motion.div>
        ) : (
          <motion.button key="closed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} onClick={() => setUi({ left: true })} className={cx('flex h-full w-11 flex-col items-center gap-3 pt-3 text-slate-600 hover:bg-stone-100 hover:text-slate-900')} aria-label={UI.showPanel} title={UI.showPanel}>
            <PanelLeftOpen className="h-4 w-4" />
            <span className="text-caption font-semibold [writing-mode:vertical-rl]">{title}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

/** One collapsible card of the left panel. (A section hidden by an older layout shows as collapsed: nothing can hide for good.) */
export function RailSection({ id, title, children, right, sub }: { id: SectionId; title?: ReactNode; children: ReactNode; right?: ReactNode; sub?: ReactNode }) {
  const state = useApp((s) => s.ui.sections[id]);
  const setSection = useApp((s) => s.setSection);
  return (
    <Explainer
      tone="card"
      open={state === 'open'}
      onToggle={(o) => setSection(id, o ? 'open' : 'collapsed')}
      right={right}
      title={
        <span>
          <span className="block">{title ?? SECTION_LABELS[id]}</span>
          {sub && <span className="block text-caption font-normal text-slate-600">{sub}</span>}
        </span>
      }
    >
      {children}
    </Explainer>
  );
}
