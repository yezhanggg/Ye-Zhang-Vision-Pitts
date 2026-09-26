import { useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { sectionOf, useApp } from '../lib/store';
import { cx } from '../lib/format';
import { UI } from '../lib/copy';
import Logo from './Logo';
import { AboutModal, LimitsModal } from './LandingModals';

type Section = ReturnType<typeof sectionOf>;

/** Header (About button · Explore | Analysis) above a body that each section fills. */
export default function AppShell({ children }: { children: ReactNode }) {
  const mode = useApp((s) => s.mode);
  const lastAnalysis = useApp((s) => s.lastAnalysis);
  const { setMode } = useApp.getState();
  const section = sectionOf(mode);
  const [panel, setPanel] = useState<'about' | 'limits' | null>(null);
  const nav: { id: Section; label: string; go: () => void }[] = [
    { id: 'explore', label: UI.explore, go: () => setMode('explore') },
    { id: 'analysis', label: UI.analysis, go: () => setMode(lastAnalysis) },
  ];
  return (
    <div className="flex h-full flex-col">
      <header className="relative z-30 grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-stone-200/80 bg-white/90 px-4 backdrop-blur">
        <button onClick={() => setPanel('about')} className="flex w-fit items-center gap-2.5 rounded-lg pr-2 text-left hover:bg-stone-100/80" title={UI.aboutTitle}>
          <Logo size={30} />
          <div className="leading-tight">
            <div className="font-display text-lead font-bold tracking-tight text-slate-900">VisionPitts</div>
            <div className="text-caption text-slate-600">Which housing fits where · City of Pittsburgh</div>
          </div>
        </button>
        <nav aria-label="Sections" className="flex rounded-xl bg-stone-100 p-1 ring-1 ring-stone-200/70">
          {nav.map((t) => (
            <button key={t.id} onClick={t.go} aria-current={section === t.id ? 'page' : undefined} className={cx('relative rounded-lg px-4 py-1.5 text-body font-semibold transition-colors', section === t.id ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900')}>
              {section === t.id && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-lg bg-white shadow-sm ring-1 ring-black/5" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </nav>
        <div />
      </header>
      <div className="relative min-h-0 flex-1">{children}</div>
      <AboutModal open={panel === 'about'} onClose={() => setPanel(null)} onLimits={() => setPanel('limits')} />
      <LimitsModal open={panel === 'limits'} onClose={() => setPanel(null)} />
    </div>
  );
}
