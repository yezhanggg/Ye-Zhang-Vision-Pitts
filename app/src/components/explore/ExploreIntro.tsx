import { useApp } from '../../lib/store';
import { EXPLORE_UI } from '../../lib/explore/copy';
import { remoteConfigured } from '../../lib/explore/remote';
import { Button } from '../primitives';

/** Right panel before anything is picked: three steps and the way into Analysis. */
export default function ExploreIntro() {
  const setMode = useApp((s) => s.setMode);
  const set = useApp((s) => s.set);
  return (
    <div className="space-y-5 p-5">
      <div>
        <div className="text-small font-semibold text-violet-700">{EXPLORE_UI.intro.kicker}</div>
        <h2 className="mt-1 font-display text-title font-bold text-slate-900">{EXPLORE_UI.intro.title}</h2>
        <ol className="mt-3 space-y-2 text-body text-slate-700">
          {EXPLORE_UI.intro.steps.map((s, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-900 text-caption font-bold text-white">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className="text-caption text-slate-600">
        {EXPLORE_UI.footer}
        {remoteConfigured() ? ' · county-wide values load online, the city subset is built in' : ' · city subset built in'} ·{' '}
        <button onClick={() => set({ sourcesOpen: true })} className="font-semibold text-violet-700 hover:underline">
          {EXPLORE_UI.sourcesLink}
        </button>
      </p>
      <div className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200">
        <div className="text-small text-slate-700">{EXPLORE_UI.intro.analysisSub}</div>
        <Button className="mt-2 w-full" onClick={() => setMode('match')}>
          {EXPLORE_UI.intro.analysis}
        </Button>
      </div>
    </div>
  );
}
