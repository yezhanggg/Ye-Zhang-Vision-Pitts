import { useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { useApp, type Mode } from '../lib/store';
import { cx } from '../lib/format';
import { UI } from '../lib/copy';
import Logo from './Logo';

const TABS: { id: Mode; label: string }[] = [
  { id: 'explore', label: 'Explore' },
  { id: 'tracts', label: 'Compare tracts' },
  { id: 'scenarios', label: 'Compare scenarios' },
];

function Toggle({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: ReactNode; title: string }) {
  return (
    <button onClick={onClick} title={title} aria-pressed={on} className={cx('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-small font-semibold ring-1 transition', on ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-stone-300 hover:ring-stone-400')}>
      <span className={cx('h-2 w-2 rounded-full', on ? 'bg-emerald-400' : 'bg-stone-400')} />
      {children}
    </button>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const mode = useApp((s) => s.mode);
  const lite = useApp((s) => s.lite);
  const terrain = useApp((s) => s.terrain);
  const { set, setMode } = useApp.getState();
  const [copied, setCopied] = useState(false);
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* clipboard blocked on file:// in some browsers */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="flex h-full flex-col">
      <header className="relative z-30 flex h-14 shrink-0 items-center gap-4 border-b border-stone-200/80 bg-white/90 px-4 backdrop-blur">
        <button onClick={() => set({ view: 'landing' })} className="flex items-center gap-2.5 rounded-lg pr-2 text-left" title="Back to the VisionPitts home page">
          <Logo size={30} />
          <div className="leading-tight">
            <div className="font-display text-lead font-bold tracking-tight text-slate-900">VisionPitts</div>
            <div className="text-caption text-slate-600">Which housing fits where · City of Pittsburgh</div>
          </div>
        </button>
        <nav className="mx-auto flex rounded-xl bg-stone-100 p-1 ring-1 ring-stone-200/70">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setMode(t.id)} className={cx('relative rounded-lg px-3.5 py-1.5 text-body font-semibold transition-colors', mode === t.id ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900')}>
              {mode === t.id && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-lg bg-white shadow-sm ring-1 ring-black/5" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <Toggle on={terrain && !lite} onClick={() => set({ terrain: !terrain })} title={`${UI.terrainTip} (elevation © Mapterhorn · USGS 3DEP)`}>
            Terrain
          </Toggle>
          <Toggle on={lite} onClick={() => set({ lite: !lite, terrain: lite ? terrain : false })} title="Less motion: no camera flights, rotation or 3D terrain (also follows your system's reduce-motion setting)">
            Less motion
          </Toggle>
          <button onClick={share} className="rounded-lg bg-white px-2.5 py-1.5 text-small font-semibold text-slate-700 ring-1 ring-stone-300 hover:ring-stone-400">
            {copied ? 'Link copied ✓' : 'Share'}
          </button>
          <button onClick={() => set({ sourcesOpen: true })} className="rounded-lg bg-slate-900 px-3 py-1.5 text-small font-semibold text-white hover:bg-slate-800">
            Sources
          </button>
        </div>
      </header>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}
