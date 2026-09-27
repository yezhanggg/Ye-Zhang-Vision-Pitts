import { AnimatePresence, motion } from 'motion/react';
import { Compass, X } from 'lucide-react';
import { TOUR_COPY as T, useTour } from '../../lib/tour';
import { useApp } from '../../lib/store';

/** "New here? Take the quick tour": shown on every fresh open until it is started or closed. */
export default function TourNotice({ show }: { show: boolean }) {
  const lite = useApp((s) => s.lite);
  const { start, closeNotice } = useTour.getState();
  return (
    <AnimatePresence>
      {show && (
        <motion.div key="tour-notice" initial={lite ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute left-1/2 top-16 z-20 -translate-x-1/2" role="status">
          <div className="flex items-center gap-2 rounded-full bg-slate-900/90 py-1.5 pl-3.5 pr-1.5 text-small font-medium text-white shadow-lg backdrop-blur">
            <Compass className="h-4 w-4 shrink-0 text-violet-200" />
            <span className="whitespace-nowrap">{T.notice}</span>
            <button onClick={start} className="rounded-full bg-white px-3 py-1 text-caption font-semibold text-slate-900 hover:bg-violet-50">
              {T.start}
            </button>
            <button onClick={closeNotice} className="grid h-6 w-6 place-items-center rounded-full text-white/70 hover:bg-white/15 hover:text-white" aria-label={T.close} title={T.close}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
