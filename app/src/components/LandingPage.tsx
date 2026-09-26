import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { scoring } from '../lib/data';
import { allResults } from '../lib/derived';
import { buildPaint } from '../lib/paint';
import { HERO_VIEW } from '../lib/mapStyle';
import { presetWeights, useApp } from '../lib/store';
import MapView from './MapView';
import Logo from './Logo';
import { AboutModal, LimitsModal } from './LandingModals';

function HeroMap() {
  const lite = useApp((s) => s.lite);
  const paint = useMemo(() => buildPaint({ kind: 'top' }, allResults(presetWeights(scoring.presets[0]?.id ?? 'balanced'))), []);
  return <MapView paint={paint} selectedId={null} lite={lite} terrain terrainAlways interactive={false} autoOrbit initialView={HERO_VIEW} fillOpacity={0.38} />;
}

function Tile({ title, sub, onClick, primary }: { title: string; sub: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={
        primary
          ? 'group flex w-full items-center justify-between gap-4 rounded-2xl bg-primary px-6 py-7 text-left text-white shadow-lg shadow-violet-500/30 transition hover:bg-violet-700 md:py-9'
          : 'group flex w-full items-center justify-between gap-4 rounded-2xl bg-white px-5 py-4 text-left ring-1 ring-stone-200 transition hover:ring-violet-300 hover:shadow-md'
      }
    >
      <span className="min-w-0">
        <span className={primary ? 'block font-display text-2xl font-bold leading-tight md:text-3xl' : 'block font-display text-lead font-bold text-slate-900'}>{title}</span>
        <span className={primary ? 'mt-1 block text-body text-violet-100' : 'mt-0.5 block text-small text-slate-600'}>{sub}</span>
      </span>
      <ChevronRight className={primary ? 'size-7 shrink-0 transition group-hover:translate-x-0.5' : 'size-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-violet-600'} />
    </button>
  );
}

export default function LandingPage() {
  const [panel, setPanel] = useState<'limits' | 'about' | null>(null);
  const set = useApp((s) => s.set);
  const enter = () => {
    const s = useApp.getState();
    useApp.setState({ view: 'app', mode: 'explore', introNonce: s.introNonce + 1, introDone: false });
  };

  return (
    <div className="grid h-full grid-rows-[48vh_1fr] bg-[#fbfaf8] text-foreground md:grid-cols-[minmax(0,1.35fr)_minmax(400px,1fr)] md:grid-rows-1">
      {/* the moving map */}
      <div className="relative min-h-0 overflow-hidden">
        <HeroMap />
        <span className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 text-caption font-semibold text-slate-700 shadow-sm backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Live 3D map · Downtown Pittsburgh
        </span>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-slate-950/60 to-transparent" />
        <p className="pointer-events-none absolute bottom-7 left-7 right-7 font-display text-3xl font-semibold leading-tight text-white drop-shadow md:text-5xl">
          Great decisions need vision.
          <br />
          <span className="text-violet-200">We give you one.</span>
        </p>
      </div>

      {/* the four doors */}
      <div className="scroll-quiet flex min-h-0 flex-col overflow-y-auto border-l border-stone-200/70 px-6 py-6 md:px-12 md:py-10">
        <div className="flex items-center gap-2.5">
          <Logo size={30} />
          <span className="font-display text-title font-bold tracking-tight text-slate-900">VisionPitts</span>
        </div>

        <div className="my-auto space-y-3 py-10">
          <Tile primary title="Open VisionPitts" sub="Search a place, set your priorities, compare." onClick={enter} />
          <Tile title="Sources" sub="Every dataset, its vintage, geography and caveats." onClick={() => set({ sourcesOpen: true })} />
          <Tile title="Limitations & future implementation" sub="What the data cannot tell you yet, and what comes next." onClick={() => setPanel('limits')} />
          <Tile title="About" sub="Who built this, and why." onClick={() => setPanel('about')} />
        </div>

        <div className="text-caption text-slate-500">© 2026 Ye Zhang · VisionPitts · AI Horizons 2026 · AI for Housing Hackathon</div>
      </div>

      <LimitsModal open={panel === 'limits'} onClose={() => setPanel(null)} />
      <AboutModal open={panel === 'about'} onClose={() => setPanel(null)} />
    </div>
  );
}
