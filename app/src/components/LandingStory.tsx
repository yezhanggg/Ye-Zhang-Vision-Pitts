// The landing page online: the Central Business District story (map → Downtown → VisionPitts Chat answering the rent
// gap) fills the left of the page edge to edge, fading into the page, with the three doors beside it. The offline file
// keeps LandingPage (the moving 3D map). Loaded on demand; styles are inline or reuse classes the app already has, so
// the offline file's CSS is unchanged.
import { useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useApp } from '../lib/store';
import { AboutModal } from './LandingModals';
import { enter, Tile } from './LandingPage';

/** Layout rules that need a breakpoint; plain CSS so no new utility classes reach the offline file. */
const CSS = `
.ls-page{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(380px,1fr);height:100%;overflow:hidden}
.ls-video{position:relative;height:100%;min-height:0;overflow:hidden;background:#f1f0ee}
.ls-fade{position:absolute;pointer-events:none;top:0;bottom:0;right:0;width:18%;background:linear-gradient(90deg,rgba(251,250,248,0),#fbfaf8)}
.ls-aside{display:flex;flex-direction:column;justify-content:center;gap:28px;min-width:0;overflow-y:auto;padding:40px 44px 24px 12px;position:relative}
.ls-foot{position:absolute;left:12px;right:44px;bottom:16px}
.ls-tiles>button{padding-top:16px;padding-bottom:16px}
.ls-tiles>button:not(:first-child){padding-top:12px;padding-bottom:12px}
@media (max-width:900px){
 .ls-page{display:flex;flex-direction:column;overflow-y:auto}
 .ls-video{height:auto;aspect-ratio:16/9;flex-shrink:0}
 .ls-fade{top:auto;left:0;width:auto;height:22%;background:linear-gradient(180deg,rgba(251,250,248,0),#fbfaf8)}
 .ls-aside{padding:8px 16px 16px;overflow:visible}
 .ls-foot{position:static;margin-top:8px}
}
`;

/** 2160p on high-density or tall screens (the video fills the page's height), 1440p otherwise. */
const storySrc = () => {
  if (typeof window === 'undefined') return '/landing/cbd-story-1440.mp4?v=2';
  return window.innerHeight * (window.devicePixelRatio || 1) > 1500 ? '/landing/cbd-story-2160.mp4?v=2' : '/landing/cbd-story-1440.mp4?v=2';
};

function StoryVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [src] = useState(storySrc);
  const [playing, setPlaying] = useState(true);
  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };
  return (
    <div className="ls-video">
      <video
        ref={ref}
        src={src}
        poster="/landing/cbd-story.jpg"
        autoPlay
        muted
        loop
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        preload="auto"
        aria-label="Video: the VisionPitts map flies into Downtown Pittsburgh, then VisionPitts Chat answers the rent gap in the Central Business District"
      />
      <div className="ls-fade" />
      <span className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 text-caption font-semibold text-slate-700 shadow-sm backdrop-blur">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
        Downtown Pittsburgh · asked and answered
      </span>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause the video' : 'Play the video'}
        title={playing ? 'Pause' : 'Play'}
        className="absolute grid place-items-center rounded-full bg-white/85 text-slate-700 shadow-sm backdrop-blur hover:bg-white"
        style={{ left: 20, bottom: 20, width: 36, height: 36 }}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function LandingStory() {
  const [about, setAbout] = useState(false);
  const set = useApp((s) => s.set);

  return (
    <div className="ls-page bg-[#fbfaf8] text-foreground">
      <style>{CSS}</style>
        <StoryVideo />
        <div className="ls-aside">
          <div>
            <p className="font-display font-semibold leading-tight text-slate-900" style={{ fontSize: 'clamp(28px, 2.6vw, 42px)' }}>
              Great decisions need vision.
              <br />
              <span className="text-violet-700">We give you one.</span>
            </p>
            <p className="mt-3 text-body text-slate-600">Housing data for Pittsburgh, on a map you can ask questions of.</p>
          </div>
          <div className="ls-tiles space-y-3">
            <Tile primary title="Open VisionPitts" sub="Browse the census, then match housing types to places." onClick={enter} />
            <Tile title="Project Details & Sources" sub="What the project has, its data and method, its limits and what comes next." onClick={() => set({ sourcesOpen: true, detailsTab: 'overview' })} />
            <Tile title="About Author" sub="Who built this, and how to get in touch." onClick={() => setAbout(true)} />
          </div>
          <div className="ls-foot text-caption text-slate-500">© 2026 Ye Zhang · VisionPitts · AI Horizons 2026 · AI for Housing Hackathon</div>
        </div>
      <AboutModal open={about} onClose={() => setAbout(false)} />
    </div>
  );
}
