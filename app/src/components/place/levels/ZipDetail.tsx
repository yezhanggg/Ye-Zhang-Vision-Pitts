// The right panel at the ZIP code level: the project read as at the other levels (place/levels/ProjectResults: the
// verdict, the takeaways, the review, the fit with the ZIP's renters, the capital stack), run on the ZIP's main tract
// with the most renters, its mix split by the ZIP's renters and its own asking rent, and the zoning read on each
// tract's typical lot; then which types fit across its tracts, and, folded, who needs homes, the policies across its
// tracts and its profile. Online only: loaded on demand.
import type { ReactNode } from 'react';
import { tractById, tractLabel, typologyById } from '../../../lib/data';
import { demandZip } from '../../../lib/demand/data';
import { fits2br } from '../../../lib/equity/measures';
import { zipById, zipCoverage, zipName } from '../../../lib/equity/zip';
import { fmtDollars, fmtHouseholds, fmtMiles, isNum } from '../../../lib/place/format';
import { amiOf, LEVEL_LABEL, type PlanLevel } from '../../../lib/place/plan';
import { usePlan } from '../../../lib/place/planStore';
import type { Recommendation } from '../../../lib/place/recommend';
import type { HudTable } from '../../../lib/place/types';
import { placeZips, useZipView, zipExtra, zipLevelKey, zipTracts } from '../../../lib/place/zipView';
import { POLICIES } from '../../../lib/policy/catalog';
import { zipPolicyCounts, zipPolicyWords } from '../../../lib/policy/zipCounts';
import { projectMix } from '../../../lib/project/plan';
import { useProject } from '../../../lib/project/store';
import { useApp } from '../../../lib/store';
import { Dot, Explainer } from '../../primitives';
import { isSeniorAge } from '../../../lib/place/plan';
import { devTypeOf } from '../../../lib/project/devType';
import ProjectResults from './ProjectResults';
import { useZipModel } from './useReview';
import Overview from './Overview';
import { useBrowse } from './browse';
import ZipDemand from '../project/ZipDemand';
import { mixWords } from '../project/summary';
import { setLevel } from './LevelSwitch';

const B = ({ children }: { children: ReactNode }) => <b className="font-semibold text-slate-900">{children}</b>;
const H = ({ n, children }: { n: number; children: ReactNode }) => (
  <h3 className="flex items-center gap-1.5 text-small font-semibold text-slate-900">
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-semibold text-violet-800 tnum">{n}</span>
    {children}
  </h3>
);
const Row = ({ k, children, title }: { k: string; children: ReactNode; title?: string }) => (
  <div className="flex items-baseline justify-between gap-3 px-2.5 py-1.5" title={title}>
    <dt className="text-slate-700">{k}</dt>
    <dd className="text-right text-slate-800">{children}</dd>
  </div>
);
const CARD = 'rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200';

function ZipPick() {
  const set = useZipView((s) => s.set);
  return (
    <div className="space-y-3 p-5">
      <div className="text-small font-semibold text-violet-700">ZIP code</div>
      <p className="font-display text-lead font-semibold leading-snug text-slate-900">Pick a ZIP code on the map, in the list on the left, or below.</p>
      <div className="flex flex-wrap gap-1.5">
        {[...placeZips].sort().map((z) => (
          <button key={z} onClick={() => set({ zip: z })} className="rounded-full bg-white px-2.5 py-0.5 text-small font-medium text-slate-800 ring-1 ring-stone-300 tnum hover:bg-violet-50 hover:text-violet-800 hover:ring-violet-200">
            {z}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ZipDetail({ suggestions, hud, level }: { suggestions: Map<string, Recommendation>; hud: HudTable | null; level: PlanLevel }) {
  const zip = useZipView((s) => s.zip);
  const set = useZipView((s) => s.set);
  const project = useProject();
  const homes = usePlan((s) => s.homes);
  const senior = usePlan((s) => isSeniorAge(s.age));
  const m = useZipModel(zip);
  const browse = useBrowse((s) => s.mode) === 'browse';
  const r = zip ? zipById.get(zip) : undefined;
  if (!zip || !r) return <ZipPick />;
  const devType = devTypeOf(project, level, senior);
  const { main, partly } = zipTracts(zip);
  const lead = (g: string) => suggestions.get(g)?.types[0]?.typology ?? null;
  const tally = new Map<string, number>();
  for (const g of main) tally.set(lead(g) ?? 'none', (tally.get(lead(g) ?? 'none') ?? 0) + 1);
  const tallyWords = [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k === 'none' ? 'No suggestion' : typologyById.get(k)?.label ?? k} in ${n} ${n === 1 ? 'tract' : 'tracts'}`);
  const mix = projectMix(project, level, homes, null, demandZip(zip));
  const counts = zipPolicyCounts(zip);
  const key = zipLevelKey(level);
  const renters = zipExtra.get(zip)?.renters[key] ?? null;
  const burdened = r.burdened[key] ?? null;
  const market = level === 'market';
  const fits = market ? null : (fits2br(hud, amiOf(level))?.rent ?? null);
  const gap = r.asking != null && isNum(fits) ? r.asking - fits : null;
  const levelWord = market ? 'above 80% AMI' : LEVEL_LABEL[level];
  const open = (g: string) => {
    setLevel('tract');
    useApp.getState().select(g);
  };
  const policyIds = ['izo', 'fpo', 'adu', 'qct', 'perf'] as const;
  return (
    <div data-zip-detail>
      <div className="sticky top-0 z-10 border-b border-stone-100 bg-white/95 px-5 pb-3 pt-4 backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-small font-semibold text-violet-700">ZIP code</div>
            <h2 className="truncate font-display text-title font-bold text-slate-900">{zipName(zip)}</h2>
            <div className="text-small text-slate-600 tnum">{zipCoverage(zip)}</div>
          </div>
          <button onClick={() => set({ zip: null })} className="rounded-lg p-1.5 text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-label="Clear ZIP">
            <svg viewBox="0 0 20 20" className="h-4 w-4">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="space-y-3 p-5">
        {browse && hud ? <Overview scope="zip" geoid={null} zip={zip} place={null} demand={demandZip(zip)} hud={hud} suggestions={suggestions} /> : m && hud && <ProjectResults scope="zip" t={null} place={null} hud={hud} m={m} devType={devType} zip={zip} name={zipName(zip)} />}
        <section className={CARD}>
          <H n={1}>Types suggested in its tracts</H>
          <p className="mt-1 text-small leading-snug text-slate-800">{main.length ? `${tallyWords.join(' · ')}, at ${levelWord}.` : 'No city tract has most of its homes in this ZIP.'}</p>
          {main.length > 0 && (
            <ul className="mt-2 divide-y divide-stone-100 overflow-hidden rounded-xl bg-white ring-1 ring-stone-200" data-testid="zip-tracts">
              {main.map((id) => {
                const t = tractById.get(id);
                const ty = lead(id) ? typologyById.get(lead(id)!) : null;
                return (
                  <li key={id}>
                    <button type="button" onClick={() => open(id)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-violet-50">
                      <span className="min-w-0 flex-1 truncate text-small font-semibold text-slate-900">{tractLabel(t)}</span>
                      <span className="flex shrink-0 items-center gap-1.5 text-small text-slate-700">
                        {ty ? (
                          <>
                            <Dot color={ty.color} size={9} />
                            {ty.label}
                          </>
                        ) : (
                          <span className="text-slate-500">No suggestion</span>
                        )}
                        <span aria-hidden className="text-slate-400">›</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {partly.length > 0 && <p className="mt-2 text-caption leading-snug text-slate-500">{partly.length} more {partly.length === 1 ? 'tract has' : 'tracts have'} some homes here but most in another ZIP.</p>}
        </section>

        <Explainer title="Who needs homes, policies and profile">
        <div className="space-y-3">
        <section className={CARD}>
          <H n={2}>Who needs it and the unit mix</H>
          <p className="mt-1 text-small leading-snug text-slate-800">
            <B>{renters != null ? fmtHouseholds(renters) : 'n/a'}</B> renter households {levelWord}, <B>{burdened != null ? fmtHouseholds(burdened) : 'n/a'}</B> of them paying over 30%.
          </p>
          <p className="mt-1 text-small leading-snug text-slate-800">
            Unit mix for {mix.homes} units{mix.example ? ' (example)' : ''}: <B>{mixWords(mix)}</B>
            {mix.mode === 'mine' ? ' (your mix)' : mix.from === 'zip' ? ", split like the ZIP's renter households by size" : ''}.
          </p>
        </section>
        <ZipDemand zip={zip} />

        <section className={CARD}>
          <H n={3}>Policies across its tracts</H>
          <dl className="mt-1 divide-y divide-stone-100 overflow-hidden rounded-xl bg-white text-small ring-1 ring-stone-200/80">
            {policyIds.map((id) => (
              <Row key={id} k={POLICIES.find((p) => p.id === id)?.label ?? id}>
                {zipPolicyWords(counts, id) ?? '—'}
              </Row>
            ))}
          </dl>
          <p className="mt-1 text-caption leading-snug text-slate-500">Your screens and the optional incentives are on the left; each tract's own reading is at the Tract level.</p>
        </section>

        <section className={CARD}>
          <H n={4}>Profile</H>
          <dl className="mt-1 divide-y divide-stone-100 overflow-hidden rounded-xl bg-white text-small ring-1 ring-stone-200/80" data-testid="zip-profile">
            <Row k="Rent gap" title={`The ZIP's median 2-bedroom asking rent (2025–26 listings, the whole ZIP) minus what a 3-person household ${levelWord} can pay for a 2-bedroom.`}>
              {r.asking == null ? 'asking rent not available' : market || gap == null ? `asks ${fmtDollars(r.asking)}` : gap > 0 ? `asks ${fmtDollars(r.asking)} · gap ${fmtDollars(gap)}/mo` : `asks ${fmtDollars(r.asking)} · ${fmtDollars(-gap)} under`}
            </Row>
            <Row k="Transit">{r.transit != null ? `${fmtMiles(r.transit)} to frequent transit` : 'n/a'}</Row>
            <Row k="Jobs · services">{r.jobs != null ? fmtHouseholds(r.jobs) : 'n/a'} jobs · {r.services != null ? r.services.toFixed(1) : 'n/a'} services</Row>
            <Row k="In the city">
              {Math.round(r.share * 100)}% of its homes{r.edge ? ' · city part only' : ''}
            </Row>
          </dl>
        </section>
        </div>
        </Explainer>
      </div>
    </div>
  );
}
