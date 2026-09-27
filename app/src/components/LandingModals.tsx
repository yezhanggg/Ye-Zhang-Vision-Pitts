import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Mail } from 'lucide-react';
import { ABOUT, PROJECT } from '../lib/about';
import { useApp } from '../lib/store';

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

/** The LinkedIn mark, drawn here because the icon set carries no brand marks. */
const LinkedInMark = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
    <rect width="24" height="24" rx="5" fill="#0a66c2" />
    <path d="M7.1 9.6h2.5v8H7.1zM8.35 5.9a1.45 1.45 0 1 1 0 2.9 1.45 1.45 0 0 1 0-2.9zM11.2 9.6h2.4v1.1c.4-.7 1.3-1.3 2.6-1.3 2.4 0 2.9 1.6 2.9 3.7v4.5h-2.5v-4c0-1 0-2.1-1.3-2.1s-1.6 1-1.6 2.1v4h-2.5z" fill="#fff" />
  </svg>
);

function Heading({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 text-caption font-semibold uppercase tracking-wide text-slate-500">{children}</h3>;
}

/** About: the author. Background, education, experience and how to get in touch; the project itself lives under Details. */
export function AboutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const openDetails = () => {
    useApp.getState().set({ sourcesOpen: true, detailsTab: 'overview' });
    onClose();
  };
  return (
    <InfoModal open={open} onClose={onClose} title="About">
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-violet-600 font-display text-title font-bold text-white">{ABOUT.name.split(' ').map((w) => w[0]).join('')}</div>
        <div className="min-w-0">
          <div className="font-display text-display font-bold leading-tight text-slate-900">{ABOUT.name}</div>
          <div className="mt-0.5 text-small text-slate-700">{ABOUT.headline}</div>
          <div className="text-small text-slate-500">{ABOUT.place}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={`mailto:${ABOUT.contact.email}`} className="flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-small font-semibold text-white transition hover:bg-slate-800">
          <Mail className="h-4 w-4" />
          {ABOUT.contact.email}
        </a>
        <a href={ABOUT.contact.linkedin.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-small font-semibold text-slate-800 ring-1 ring-stone-300 transition hover:ring-violet-300">
          <LinkedInMark />
          {ABOUT.contact.linkedin.label}
        </a>
      </div>
      <section>
        <Heading>Background</Heading>
        <div className="space-y-3 text-body leading-relaxed text-slate-800">
          {ABOUT.summary.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>
      <section>
        <Heading>Education</Heading>
        <ul className="space-y-2.5">
          {ABOUT.education.map((e) => (
            <li key={e.school} className="flex items-baseline justify-between gap-4">
              <span className="min-w-0">
                <span className="block text-body font-semibold text-slate-900">{e.school}</span>
                <span className="block text-small text-slate-700">{e.what}</span>
              </span>
              <span className="shrink-0 text-small text-slate-500 tnum">{e.when}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <Heading>Experience</Heading>
        <ul className="space-y-2.5">
          {ABOUT.experience.map((e) => (
            <li key={`${e.org}-${e.role}`} className="flex items-baseline justify-between gap-4">
              <span className="min-w-0">
                <span className="block text-body font-semibold text-slate-900">
                  {e.role} <span className="font-normal text-slate-600">· {e.org}</span>
                </span>
                <span className="block text-small text-slate-700">{e.text}</span>
              </span>
              <span className="shrink-0 text-small text-slate-500 tnum">{e.when}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200/80">
        <Heading>This project</Heading>
        <p className="text-small leading-relaxed text-slate-700">{PROJECT.lines[0]}</p>
        <button onClick={openDetails} className="mt-2 text-small font-semibold text-violet-700 hover:underline">
          Project details →
        </button>
      </section>
    </InfoModal>
  );
}
