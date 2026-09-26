import { AnimatePresence, motion } from 'motion/react';
import type { IntroPhase } from './MapView';

export default function IntroOverlay({ phase, onSkip }: { phase: IntroPhase; onSkip: () => void }) {
  return (
    <>
      <AnimatePresence>
        {phase === 'spin' && (
          <motion.div key="title" className="pointer-events-none absolute inset-0 z-30 grid place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.8 } }} transition={{ duration: 0.6 }}>
            <motion.div initial={{ y: 12 }} animate={{ y: 0 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} className="relative text-center">
              <div className="absolute -inset-x-16 -inset-y-10 -z-10 rounded-[50%] bg-white/75 blur-2xl" />
              <div className="mb-3 text-small font-bold uppercase tracking-[0.3em] text-violet-700">VisionPitts</div>
              <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 drop-shadow-[0_1px_12px_rgba(255,255,255,0.9)]">Great decisions need vision.</h1>
              <p className="mt-2 font-display text-xl text-slate-600 drop-shadow-[0_1px_8px_rgba(255,255,255,0.9)]">Which housing fits each Pittsburgh place, and why.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {phase !== 'done' && (
          <motion.button key="skip" onClick={onSkip} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-small font-semibold text-slate-800 shadow-lg ring-1 ring-black/5 backdrop-blur hover:bg-white">
            Skip intro →
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
