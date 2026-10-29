// What the right panel shows before a place is picked, by level: at a parcel, how to pick a site and Find places for
// a project (it ranks places by whether the project pencils, so it belongs with the money); at a tract, the
// neighborhoods to tap. Online only: loaded on demand.
import { focusTracts, tractLabel } from '../../../lib/data';
import type { Recommendation } from '../../../lib/place/recommend';
import { useApp } from '../../../lib/store';
import FinderCard from '../finder/FinderCard';
import { setLevel } from './LevelSwitch';

export function ParcelStart({ suggestions }: { suggestions: Map<string, Recommendation> }) {
  return (
    <div className="space-y-3 p-5" data-parcel-start>
      <div className="text-small font-semibold text-violet-700">Parcel</div>
      <p className="font-display text-lead font-semibold leading-snug text-slate-900">Pick a site: search an address, or zoom into the map and click a lot.</p>
      <p className="text-small leading-snug text-slate-600">Lots show as you zoom in; vacant lots are tinted. Not sure where? Describe the project on the left and find the places where it could pencil.</p>
      <FinderCard suggestions={suggestions} />
    </div>
  );
}

export function TractStart() {
  const select = useApp((s) => s.select);
  return (
    <div className="space-y-3 p-5" data-tract-start>
      <div className="text-small font-semibold text-violet-700">Tract</div>
      <p className="font-display text-lead font-semibold leading-snug text-slate-900">Pick a neighborhood: tap one below, search for one, or click the map.</p>
      <div className="flex flex-wrap gap-1.5">
        {focusTracts.map((t) => (
          <button key={t.GEOID} onClick={() => select(t.GEOID)} className="rounded-full bg-white px-3 py-1 text-small font-medium text-slate-800 ring-1 ring-stone-300 hover:bg-violet-50 hover:text-violet-800 hover:ring-violet-200">
            {tractLabel(t)}
          </button>
        ))}
      </div>
      <p className="text-small leading-snug text-slate-600">
        To test a specific site and its money, or to find where a project pencils, switch to{' '}
        <button type="button" onClick={() => setLevel('parcel')} className="font-medium text-violet-700 underline hover:text-violet-900">
          Parcel
        </button>
        .
      </p>
    </div>
  );
}
