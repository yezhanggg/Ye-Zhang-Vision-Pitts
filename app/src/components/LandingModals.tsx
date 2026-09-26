import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ABOUT, LIMITS } from '../lib/about';
import Logo from './Logo';

export function InfoModal({ open, title, sub, onClose, children }: { open: boolean; title: string; sub?: string; onClose: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[3000] grid place-items-center bg-slate-900/30 p-6 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div initial={{ y: 16, scale: 0.98, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 8, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }} onClick={(e) => e.stopPropagation()} className="scroll-quiet max-h-[86vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-white/95 px-6 py-4 backdrop-blur">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">{title}</h2>
                {sub && <p className="text-small text-slate-600">{sub}</p>}
              </div>
              <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-label="Close">
                <svg viewBox="0 0 20 20" className="h-4 w-4">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="space-y-6 px-6 py-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function LimitsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <InfoModal open={open} onClose={onClose} title="Limitations & future implementation" sub="Said out loud, per tract in the app and in one place here.">
      {LIMITS.map((s) => (
        <section key={s.title}>
          <h3 className="mb-2 text-body font-semibold text-slate-900">{s.title}</h3>
          <ul className="space-y-1.5 text-small text-slate-700">
            {s.items.map((it, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </InfoModal>
  );
}

export function AboutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <InfoModal open={open} onClose={onClose} title="About" sub="Who built this, and why.">
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-violet-600 font-display text-xl font-bold text-white">{ABOUT.name.split(' ').map((w) => w[0]).join('')}</div>
        <div>
          <div className="font-display text-title font-bold text-slate-900">{ABOUT.name}</div>
          <div className="text-small text-slate-600">{ABOUT.role}</div>
        </div>
      </div>
      <div className="space-y-3 text-body leading-relaxed text-slate-800">
        {ABOUT.bio.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <ul className="space-y-1 text-small">
        {ABOUT.links.map((l) => (
          <li key={l.url}>
            <a href={l.url} target="_blank" rel="noreferrer" className="font-semibold text-violet-700 hover:underline">
              {l.label} →
            </a>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 border-t border-stone-100 pt-3 text-caption text-slate-500">
        <Logo size={16} /> VisionPitts · Great decisions need vision. We give you one.
      </div>
    </InfoModal>
  );
}
