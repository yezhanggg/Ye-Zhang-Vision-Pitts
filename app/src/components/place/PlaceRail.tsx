// The Place tab's left panel online: wider than the offline one, every input flat and in view (place/flat), and every
// change waiting for Confirm. The panel edits a draft (lib/project/draft): the project, its mix and income, the site,
// the policies and screens, open space, the pencil, or the finder's form. Confirm applies it,
// and only then do the map, the suggestion and the right panel change.
// Loaded on demand; the offline single file keeps MatchView's own panel, which applies every change at once.
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { UI } from '../../lib/copy';
import { cx } from '../../lib/format';
import type { Recommendation } from '../../lib/place/recommend';
import { confirmDraft, pullLive, SIDE_DRAFT, useDraft } from '../../lib/project/draft';
import { SideContext } from '../../lib/project/side';
import { useApp } from '../../lib/store';
import type { TractProps } from '../../lib/types';
import { useViewport } from '../../lib/viewport';
import { FoldButton, SPRING_PANEL, SPRING_TAB } from '../primitives';
import FlatInputs from './flat/FlatInputs';
import { AreaSwitch } from './ZipPanel';

const WIDTH = 440;

function ConfirmBar() {
  const dirty = useDraft((s) => s.dirty);
  return (
    <div className="border-t border-stone-200/80 px-3 py-2.5" data-confirm-bar>
      <p className={cx('mb-2 text-caption leading-snug', dirty ? 'font-medium text-violet-800' : 'text-slate-500')}>{dirty ? 'Inputs changed. Confirm to update the map, the suggestion and the results on the right.' : 'The map and the results on the right match these inputs.'}</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={confirmDraft} disabled={!dirty} className="flex-1 rounded-lg bg-violet-600 px-2 py-1.5 text-small font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
          Confirm and update
        </button>
        {dirty && (
          <button type="button" onClick={pullLive} className="rounded-lg bg-white px-2 py-1.5 text-small font-medium text-slate-700 ring-1 ring-stone-300 hover:bg-stone-50">
            Discard
          </button>
        )}
      </div>
    </div>
  );
}

function Inputs({ t, rec }: { t: TractProps | null; rec: Recommendation | null }) {
  return (
    <SideContext.Provider value={SIDE_DRAFT}>
      <FlatInputs t={t} rec={rec} />
    </SideContext.Provider>
  );
}

export default function PlaceRail({ t, rec, zipMode, title, legend }: { t: TractProps | null; rec: Recommendation | null; zipMode: boolean; title: string; legend: ReactNode }) {
  const open = useApp((s) => s.ui.left);
  const setUi = useApp((s) => s.setUi);
  const phone = useViewport().phone;
  const width = phone ? undefined : WIDTH;
  return (
    <>
      <AnimatePresence initial={false} mode="popLayout">
        {open ? (
          <motion.aside key="rail" data-tour="rail" style={{ transformOrigin: 'top left', width }} initial={{ opacity: 0, scale: 0.9, x: -14, filter: 'blur(6px)' }} animate={{ opacity: 1, scale: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.92, x: -14, filter: 'blur(6px)', transition: { duration: 0.18, ease: 'easeIn' } }} transition={SPRING_PANEL} className="absolute left-3 top-16 z-20 flex max-h-[calc(100%-4.75rem-12.5rem)] flex-col rounded-2xl bg-white/95 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.25)] ring-1 ring-black/5 backdrop-blur max-[1099px]:top-[7.25rem] max-sm:right-3 max-sm:w-auto max-sm:!max-h-[40vh]" aria-label={title}>
            <div className="flex items-center justify-between px-3 pb-1 pt-2.5">
              <div className="font-display text-body font-bold text-slate-900">{title}</div>
              <FoldButton onClick={() => setUi({ left: false })} label={UI.hidePanel}>
                <PanelLeftClose className="h-4 w-4" />
              </FoldButton>
            </div>
            <div className="scroll-quiet relative min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 pb-3 pt-1">
              {zipMode ? <AreaSwitch /> : <Inputs t={t} rec={rec} />}
            </div>
            <ConfirmBar />
          </motion.aside>
        ) : (
          <motion.div key="rail-tab" style={{ transformOrigin: 'top left' }} initial={{ opacity: 0, scale: 0.6, x: -8 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.12 } }} transition={SPRING_TAB} className="absolute left-3 top-16 z-20 max-[1099px]:top-[7.25rem]">
            <motion.button onClick={() => setUi({ left: true })} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} transition={SPRING_TAB} className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-small font-semibold text-slate-800 shadow-lg ring-1 ring-black/5 backdrop-blur hover:bg-white" aria-label={UI.showPanel} title={UI.showPanel}>
              <PanelLeftOpen className="h-4 w-4 text-slate-600" />
              {title}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute bottom-3 left-3 z-20 max-sm:hidden" style={{ width }}>
        {legend}
      </div>
    </>
  );
}
