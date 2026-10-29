// The Place tab's left panel online. At the top, the level (Parcel | Tract | ZIP code, place/levels) and its place
// picker: the address box for a parcel or a tract, the ZIP list for a ZIP code. Below, that level's inputs only, in
// numbered groups (place/levels/LevelInputs). Changes apply at once, as in Compare: the map, the suggestion and the
// right panel follow each edit; the finder re-ranks a moment after the last one.
// Loaded on demand; the offline single file keeps MatchView's own panel, which also applies every change at once.
import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { UI } from '../../lib/copy';
import { tractLabel } from '../../lib/data';
import { finderInputs, useFinder } from '../../lib/finder/store';
import { usePlan } from '../../lib/place/planStore';
import type { Recommendation } from '../../lib/place/recommend';
import { usePolicy } from '../../lib/policy/store';
import { SIDE_A, SideContext } from '../../lib/project/side';
import { useApp } from '../../lib/store';
import type { TractProps } from '../../lib/types';
import { useViewport } from '../../lib/viewport';
import { FoldButton, SPRING_PANEL, SPRING_TAB } from '../primitives';
import TractSearch from '../TractSearch';
import LevelInputs, { ZipPicker } from './levels/LevelInputs';
import LevelSwitch from './levels/LevelSwitch';
import { useBrowse } from './levels/browse';
import { cx } from '../../lib/format';
import { useZipView } from '../../lib/place/zipView';

const WIDTH = 440;
/** The finder ranks every tract, so it waits this long after the last edit. */
const FINDER_WAIT_MS = 400;

/** What used to happen on Confirm, now kept up as inputs change: the finder ranks on the form as it stands, and the
 *  flood screen is the planning input's flood limit (the panel no longer asks for that separately). */
function useLiveInputs() {
  const open = useFinder((s) => s.open);
  const inputs = useFinder((s) => s.inputs);
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => useFinder.setState((f) => ({ applied: finderInputs(f) })), FINDER_WAIT_MS);
    return () => window.clearTimeout(id);
  }, [open, inputs]);
  const flood = usePolicy((s) => s.flood);
  useEffect(() => {
    if (usePlan.getState().flood !== flood) usePlan.getState().setPlan({ flood });
  }, [flood]);
}

/** Browse a place (what it needs most) or test a project, at every level. */
function BrowseSwitch() {
  const mode = useBrowse((s) => s.mode);
  return (
    <div className="grid grid-cols-2 gap-0.5 rounded-lg bg-stone-100 p-0.5" role="radiogroup" aria-label="Browse or test" data-testid="place-mode">
      {(['browse', 'test'] as const).map((m) => (
        <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => useBrowse.getState().set(m)} title={m === 'browse' ? 'What this place needs most: incomes, rents, who rents, what zoning allows, the best fit' : 'Set a project and check it'} className={cx('rounded-md px-1.5 py-1 text-small font-medium transition-colors', mode === m ? 'bg-white text-slate-900 shadow-sm ring-1 ring-stone-200' : 'text-slate-600 hover:text-slate-900')}>
          {m === 'browse' ? 'Browse' : 'Test a project'}
        </button>
      ))}
    </div>
  );
}

export default function PlaceRail({ t, rec, zipMode, title, legend }: { t: TractProps | null; rec: Recommendation | null; zipMode: boolean; title: string; legend: ReactNode }) {
  const open = useApp((s) => s.ui.left);
  const setUi = useApp((s) => s.setUi);
  const selectedId = useApp((s) => s.selectedId);
  const phone = useViewport().phone;
  const width = phone ? undefined : WIDTH;
  const level = useZipView((s) => s.area);
  useLiveInputs();
  return (
    <>
      <AnimatePresence initial={false} mode="popLayout">
        {open ? (
          <motion.aside key="rail" data-tour="rail" style={{ transformOrigin: 'top left', width }} initial={{ opacity: 0, scale: 0.9, x: -14, filter: 'blur(6px)' }} animate={{ opacity: 1, scale: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.92, x: -14, filter: 'blur(6px)', transition: { duration: 0.18, ease: 'easeIn' } }} transition={SPRING_PANEL} className="absolute left-3 top-16 z-20 flex max-h-[calc(100%-4.75rem-12.5rem)] flex-col rounded-2xl bg-white/95 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.25)] ring-1 ring-black/5 backdrop-blur max-[1099px]:top-[7.25rem] max-sm:right-3 max-sm:w-auto max-sm:!max-h-[40vh]" aria-label={title}>
            <div className="space-y-2 px-3 pb-2 pt-2.5">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <LevelSwitch />
                </div>
                <FoldButton onClick={() => setUi({ left: false })} label={UI.hidePanel}>
                  <PanelLeftClose className="h-4 w-4" />
                </FoldButton>
              </div>
              <BrowseSwitch />
              {level === 'zip' ? <ZipPicker /> : <TractSearch dense pinned={false} value={selectedId} onChange={useApp.getState().select} showQuickPicks={false} label={level === 'parcel' ? 'Address' : 'Address or place'} placeholder={level === 'parcel' ? 'Search an address' : undefined} />}
            </div>
            <div className="scroll-quiet relative min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              <SideContext.Provider value={SIDE_A}>
                <LevelInputs t={zipMode ? null : t} rec={rec} />
              </SideContext.Provider>
            </div>
          </motion.aside>
        ) : (
          <motion.div key="rail-tab" style={{ transformOrigin: 'top left' }} initial={{ opacity: 0, scale: 0.6, x: -8 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.12 } }} transition={SPRING_TAB} className="absolute left-3 top-16 z-20 max-[1099px]:top-[7.25rem]">
            <motion.button onClick={() => setUi({ left: true })} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} transition={SPRING_TAB} className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-small font-semibold text-slate-800 shadow-lg ring-1 ring-black/5 backdrop-blur hover:bg-white" aria-label={UI.showPanel} title={UI.showPanel}>
              <PanelLeftOpen className="h-4 w-4 text-slate-600" />
              {t ? tractLabel(t) : title}
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
