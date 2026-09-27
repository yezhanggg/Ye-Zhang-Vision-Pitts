import { useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Check, Link2, PanelRightOpen, RotateCcw, Settings2, ZapOff } from 'lucide-react';
import { SECTIONS_FOR_MODE, SECTION_LABELS, defaultUi, sectionOf, useApp, type AnalysisMode, type Mode } from '../lib/store';
import { cx } from '../lib/format';
import { UI } from '../lib/copy';
import Logo from './Logo';
import { AboutModal, LimitsModal } from './LandingModals';

type Section = ReturnType<typeof sectionOf>;
const SUBTABS: { id: AnalysisMode; label: string }[] = [
  { id: 'match', label: UI.matchTab },
  { id: 'tracts', label: UI.compareTractsTab },
  { id: 'scenarios', label: UI.compareScenariosTab },
];
/** Modes with a right-hand summary panel. */
const HAS_SUMMARY: Mode[] = ['explore', 'match'];

/** A small floating control. */
function Chip({ onClick, icon, label, pressed, title }: { onClick: () => void; icon: ReactNode; label: string; pressed?: boolean; title?: string }) {
  return (
    <button onClick={onClick} aria-pressed={pressed} title={title ?? label} className={cx('flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-small font-semibold shadow-lg ring-1 backdrop-blur transition', pressed ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white/95 text-slate-700 ring-black/5 hover:bg-white hover:text-slate-900')}>
      <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

function Pill<T extends string>({ items, value, onPick, ariaLabel, layoutId, size = 'md' }: { items: { id: T; label: string }[]; value: T; onPick: (id: T) => void; ariaLabel: string; layoutId: string; size?: 'md' | 'sm' }) {
  return (
    <nav aria-label={ariaLabel} className={cx('pointer-events-auto flex rounded-xl bg-white/95 shadow-lg ring-1 ring-black/5 backdrop-blur', size === 'md' ? 'p-1' : 'p-0.5')}>
      {items.map((t) => {
        const on = value === t.id;
        return (
          <button key={t.id} onClick={() => onPick(t.id)} aria-current={on ? 'page' : undefined} className={cx('relative rounded-lg font-semibold transition-colors', size === 'md' ? 'px-4 py-1.5 text-body' : 'px-3 py-1 text-small', on ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900')}>
            {on && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-lg bg-stone-100 ring-1 ring-black/5" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
            <span className="relative">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/** Show / hide the panels and the sections of the left panel for the current mode. */
function PanelsMenu({ mode }: { mode: Mode }) {
  const ui = useApp((s) => s.ui);
  const { setSection, setUi } = useApp.getState();
  const [open, setOpen] = useState(false);
  const ids = SECTIONS_FOR_MODE[mode];
  const Row = ({ checked, onChange, label }: { checked: boolean; onChange: (on: boolean) => void; label: string }) => (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-small text-slate-800 hover:bg-stone-50">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-3.5 w-3.5 accent-violet-600" />
      {label}
    </label>
  );
  return (
    <div className="relative">
      <Chip onClick={() => setOpen((o) => !o)} icon={<Settings2 />} label={UI.panels} pressed={open} />
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 top-full z-40 mt-1.5 w-60 rounded-xl bg-white p-2 shadow-xl ring-1 ring-black/5" role="group" aria-label={UI.panels}>
            <div className="px-2 pb-1 text-caption font-semibold uppercase tracking-wide text-slate-500">{UI.panelsSub}</div>
            <Row checked={ui.left} onChange={(on) => setUi({ left: on })} label={UI.leftPanel} />
            {HAS_SUMMARY.includes(mode) && <Row checked={ui.right} onChange={(on) => setUi({ right: on })} label={UI.summaryPanel} />}
            <div className="my-1.5 border-t border-stone-200" />
            {ids.map((id) => (
              <Row key={id} checked={ui.sections[id] !== 'hidden'} onChange={(on) => setSection(id, on ? 'open' : 'hidden')} label={SECTION_LABELS[id]} />
            ))}
            <div className="my-1.5 border-t border-stone-200" />
            <button
              onClick={() => {
                setUi(defaultUi());
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-small font-semibold text-slate-700 hover:bg-stone-50 hover:text-slate-900"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {UI.resetLayout}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * No fixed bars: the map fills the window and every control floats on it. Top-left: About and the Panels menu.
 * Top-center: Explore | Analysis, then the Analysis views. Top-right: Copy link, Sources, Reduce motion, and the
 * button that brings the summary panel back.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const mode = useApp((s) => s.mode);
  const lastAnalysis = useApp((s) => s.lastAnalysis);
  const ui = useApp((s) => s.ui);
  const lite = useApp((s) => s.lite);
  const layers = useApp((s) => s.layers);
  const { setMode, setUi, set } = useApp.getState();
  const section = sectionOf(mode);
  const [panel, setPanel] = useState<'about' | 'limits' | null>(null);
  const [copied, setCopied] = useState(false);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* clipboard blocked on file:// in some browsers; the hash is still in the address bar */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  const toggleLite = () => (lite ? set({ lite: false }) : set({ lite: true, layers: { ...layers, terrain: false } }));
  const sections: { id: Section; label: string }[] = [
    { id: 'explore', label: UI.explore },
    { id: 'analysis', label: UI.analysis },
  ];

  return (
    <div className="relative h-full">
      <div className="absolute inset-0">{children}</div>
      <div className="absolute left-3 top-3 z-30 flex items-center gap-1.5">
        <button onClick={() => setPanel('about')} title={UI.aboutTitle} className="flex items-center gap-2 rounded-xl bg-white/95 py-1.5 pl-1.5 pr-3 shadow-lg ring-1 ring-black/5 backdrop-blur hover:bg-white">
          <Logo size={26} />
          <span className="font-display text-body font-bold tracking-tight text-slate-900">VisionPitts</span>
        </button>
        <PanelsMenu mode={mode} />
      </div>
      <div className="pointer-events-none absolute left-1/2 top-3 z-30 flex -translate-x-1/2 flex-col items-center gap-1.5">
        <Pill items={sections} value={section} onPick={(id) => setMode(id === 'explore' ? 'explore' : lastAnalysis)} ariaLabel="Sections" layoutId="tab-pill" />
        {section === 'analysis' && <Pill items={SUBTABS} value={mode as AnalysisMode} onPick={(id) => setMode(id)} ariaLabel="Analysis views" layoutId="subtab-pill" size="sm" />}
      </div>
      <div className="absolute right-3 top-3 z-30 flex items-center gap-1.5">
        <Chip onClick={copyLink} icon={copied ? <Check /> : <Link2 />} label={copied ? UI.linkCopied : UI.copyLink} />
        <Chip onClick={() => set({ sourcesOpen: true })} icon={<BookOpen />} label={UI.sourcesShort} />
        <Chip onClick={toggleLite} icon={<ZapOff />} label={UI.reduceMotion} pressed={lite} />
        {!ui.right && HAS_SUMMARY.includes(mode) && <Chip onClick={() => setUi({ right: true })} icon={<PanelRightOpen />} label={UI.showSummary} />}
      </div>
      <AboutModal open={panel === 'about'} onClose={() => setPanel(null)} onLimits={() => setPanel('limits')} />
      <LimitsModal open={panel === 'limits'} onClose={() => setPanel(null)} />
    </div>
  );
}
