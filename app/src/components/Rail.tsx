import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { SECTION_LABELS, useApp, type SectionId } from '../lib/store';
import { UI } from '../lib/copy';
import { cx } from '../lib/format';
import { Explainer } from './primitives';

const BODY = 'scroll-quiet min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 pb-3 pt-1';

function RailHeader({ title, onHide }: { title: string; onHide: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 pb-1 pt-2.5">
      <div className="font-display text-body font-bold text-slate-900">{title}</div>
      <button onClick={onHide} className="rounded-lg p-1.5 text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-label={UI.hidePanel} title={UI.hidePanel}>
        <PanelLeftClose className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * The left panel. `float` (Explore, Match): a card floating over the map, removed entirely when hidden and
 * brought back from a small button. Docked (the compare views): an in-flow column that shrinks to a slim strip so
 * the content under the maps gets the width. Both follow `ui.left`, which persists per browser.
 */
export default function Rail({ children, title, float }: { children: ReactNode; title: string; float?: boolean }) {
  const open = useApp((s) => s.ui.left);
  const setUi = useApp((s) => s.setUi);
  const lite = useApp((s) => s.lite);
  if (float) {
    return (
      <AnimatePresence initial={false}>
        {open ? (
          <motion.aside key="rail" initial={lite ? false : { opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={lite ? undefined : { opacity: 0, x: -16 }} transition={{ type: 'spring', stiffness: 300, damping: 32 }} className="absolute bottom-3 left-3 top-16 z-20 flex w-[340px] flex-col rounded-2xl bg-white/95 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.25)] ring-1 ring-black/5 backdrop-blur xl:w-[360px]" aria-label={title}>
            <RailHeader title={title} onHide={() => setUi({ left: false })} />
            <div className={BODY}>{children}</div>
          </motion.aside>
        ) : (
          <motion.div key="rail-btn" initial={lite ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute left-3 top-16 z-20">
            <button onClick={() => setUi({ left: true })} className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-small font-semibold text-slate-800 shadow-lg ring-1 ring-black/5 backdrop-blur hover:bg-white" aria-label={UI.showPanel} title={UI.showPanel}>
              <PanelLeftOpen className="h-4 w-4 text-slate-600" />
              {title}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
  return (
    <aside className={cx('relative z-10 flex h-full shrink-0 flex-col border-r border-stone-200/80 bg-[#fbfaf8] transition-[width] duration-200', open ? 'w-[340px] xl:w-[360px]' : 'w-11')} aria-label={title}>
      {open ? (
        <>
          <RailHeader title={title} onHide={() => setUi({ left: false })} />
          <div className={BODY}>{children}</div>
        </>
      ) : (
        <button onClick={() => setUi({ left: true })} className="flex h-full w-full flex-col items-center gap-3 pt-3 text-slate-600 hover:bg-stone-100 hover:text-slate-900" aria-label={UI.showPanel} title={UI.showPanel}>
          <PanelLeftOpen className="h-4 w-4" />
          <span className="text-caption font-semibold [writing-mode:vertical-rl]">{title}</span>
        </button>
      )}
    </aside>
  );
}

/** One collapsible card of the left panel. Hidden sections render nothing; the Panels menu brings them back. */
export function RailSection({ id, title, children, right, sub }: { id: SectionId; title?: ReactNode; children: ReactNode; right?: ReactNode; sub?: ReactNode }) {
  const state = useApp((s) => s.ui.sections[id]);
  const setSection = useApp((s) => s.setSection);
  if (state === 'hidden') return null;
  return (
    <Explainer
      tone="card"
      open={state !== 'collapsed'}
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
