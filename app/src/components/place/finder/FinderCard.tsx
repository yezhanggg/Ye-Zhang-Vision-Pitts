// Find places for a project, on Analysis > Place before a place is picked (docs/data/finder.md). The project is the one
// on the left (development type, units, stories, income level, financing, capital), never a copy: every ranked tract is
// read with it as the Tract view reads it (finder/read) and listed by a rule printed under the list: ranks and words,
// no composite number. A row opens its tract at the Tract level with the same project, so the row and the place say the
// same; two shortlisted rows open in Compare places. The filters (FinderInputs) sit in the left panel; the list
// (FinderCard) in the right panel's start card.
// Loaded on demand and left out of the offline single file (MatchView imports this module lazily, never statically).
import { useEffect, useMemo, useState } from 'react';
import { rankedTracts } from '../../../lib/data';
import { finderInputs, useFinder, setInputs, toggleShortlist } from '../../../lib/finder/store';
import { altFor, findPlaces, pointsLine, projectWords, REASON_WORD, rowName, type FinderRow, type Points, type Reason } from '../../../lib/finder/rank';
import { cx } from '../../../lib/format';
import { useLihtc } from '../../../lib/lihtc/store';
import { hud, placeFor } from '../../../lib/place/data';
import { FLOOD_LIMIT_PCT, isSeniorAge } from '../../../lib/place/plan';
import { usePolicy } from '../../../lib/policy/store';
import { TRANSIT_SCREEN_MI } from '../../../lib/policy/compose';
import { usePlan } from '../../../lib/place/planStore';
import type { Recommendation } from '../../../lib/place/recommend';
import { TYPOLOGY_LABEL } from '../../../lib/place/thresholds';
import type { Branch } from '../../../lib/pencil/inputs';
import { devTypeOf, isHousing } from '../../../lib/project/devType';
import { branchFor, type ProjectBase } from '../../../lib/project/model';
import { PATH_LABEL } from '../../../lib/project/paths';
import { projectMix } from '../../../lib/project/plan';
import { setFinancingOn, useSide } from '../../../lib/project/side';
import { stamp, SCREENING_NOTE } from '../../../lib/project/stamp';
import { useProject } from '../../../lib/project/store';
import { verdictWord, type Verdict } from '../../../lib/review/review';
import { useApp } from '../../../lib/store';
import { capitalize } from '../../../lib/place/format';
import { Segmented } from '../PlanInputs';
import { SourceLine } from '../shared';
import { useBrowse } from '../levels/browse';
import { setLevel } from '../levels/LevelSwitch';
import { takeaways } from '../levels/ProjectResults';
import { AWARD_NOTE, usdShort } from '../project/summary';
import { readPlace, type PlaceRead } from './read';

const FIELD = 'w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-small text-slate-900 tnum focus:border-violet-500 focus:outline-none';
const TONE: Record<Verdict, string> = { works: 'text-emerald-700', changes: 'text-amber-900', no: 'text-rose-700', unknown: 'text-slate-900' };
const LINE = 'mt-0.5 block text-caption leading-snug text-slate-600';
/** The project is read in every tract, so the list waits this long after the last change on the left. */
const SETTLE_MS = 300;
const num = (v: string): number | null => (v.trim() === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/** `v` once it has held still for `ms`. */
function useSettled<T>(v: T, ms: number): T {
  const [s, set] = useState(v);
  useEffect(() => {
    if (s === v) return;
    const id = window.setTimeout(() => set(v), ms);
    return () => window.clearTimeout(id);
  }, [v, s, ms]);
  return s;
}

/** Open the finder: the list here, ranked on the filters as they stand; the filters in the left panel. */
function openFinder() {
  const f = useFinder.getState();
  useFinder.setState({ open: true, applied: f.applied ?? finderInputs(f) });
  if (!useApp.getState().ui.left) useApp.getState().setUi({ left: true });
}

/** Open a place as the row read it: its tract at the Tract level, testing the same project. */
function openPlace(geoid: string) {
  setLevel('tract');
  useBrowse.getState().set('test');
  useApp.getState().select(geoid);
}

/** "4% + bonds instead: Gap to fill $6.9M · 10 points, 120 needed". */
function altWords(alt: { read: PlaceRead; points: Points | null }): string {
  const tk = takeaways(alt.read, alt.read.m, alt.read.devType, 'tract');
  const p = alt.points;
  const pts = p ? ` · ${p.total} points${p.threshold != null ? (p.total >= p.threshold ? `, meets ${p.threshold}` : `, ${p.threshold} needed`) : ''}` : '';
  return `${PATH_LABEL.four} instead: ${tk.capital.value}${pts}`;
}

function Row({ n, row, alt, rec, picked, samePoints }: { n: number; row: FinderRow; alt: { read: PlaceRead; points: Points | null } | null; rec: Recommendation | undefined; picked: boolean; samePoints: string | null }) {
  const r = row.read;
  const tk = takeaways(r, r.m, r.devType, 'tract');
  const res = r.run.result;
  const lihtc = res.sources.find((s) => s.label === 'LIHTC equity')?.value ?? 0;
  const lead = rec?.lead ? capitalize(TYPOLOGY_LABEL[rec.lead]) : null;
  const zoning = tk.zoning.sub.startsWith('on ') ? `${tk.zoning.value} ${tk.zoning.sub}` : `${tk.zoning.value} · ${tk.zoning.sub}`;
  const fix = row.points ? row.fix.filter((x) => x !== 'Tax credit score') : row.fix;
  return (
    <div className={cx('py-2.5', picked && 'bg-violet-50/60')} data-finder-row={row.geoid}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-semibold text-violet-800 tnum">{n}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <button type="button" onClick={() => openPlace(row.geoid)} title="Open this tract at the Tract level with the same project" className="text-left text-small font-semibold text-slate-900 hover:text-violet-800">
              {rowName(row.geoid)}
            </button>
            <span className={cx('shrink-0 text-small font-semibold', TONE[row.verdict])}>{verdictWord(row.verdict)}</span>
          </span>
          <span className={LINE}>{zoning}</span>
          <span className={cx(LINE, 'tnum')}>
            Capital: {tk.capital.value} · {tk.capital.sub}
            {res.creditsCould != null && ` · LIHTC ${usdShort(lihtc)} of the ${usdShort(res.creditsCould)} it could claim`} · {usdShort(row.costPerUnit)} a unit
          </span>
          {row.points && pointsLine(r.m.branch, row.points) !== samePoints && <span className={cx(LINE, 'tnum')}>{pointsLine(r.m.branch, row.points)}.</span>}
          {alt && <span className={cx(LINE, 'tnum')}>{altWords(alt)}.</span>}
          {fix.length > 0 && <span className={LINE}>To fix: {fix.join(' · ')}</span>}
          {row.drivers.length > 0 && <span className="mt-0.5 block text-caption leading-snug text-slate-500">{row.drivers.join(' · ')}</span>}
          <span className="mt-1 flex items-baseline justify-between gap-2">
            <span className="text-caption text-slate-500">{lead ? `Stance suggests: ${lead}` : 'No type suggested'}</span>
            <label className="flex shrink-0 items-center gap-1.5 text-caption text-slate-600">
              <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={picked} onChange={() => toggleShortlist(row.geoid)} />
              Shortlist
            </label>
          </span>
        </span>
      </div>
    </div>
  );
}

export default function FinderCard({ suggestions }: { suggestions: Map<string, Recommendation> }) {
  const f = useFinder();
  const level = usePlan((s) => s.level);
  const homes = usePlan((s) => s.homes);
  const senior = usePlan((s) => isSeniorAge(s.age));
  const project = useProject();
  const entries = useLihtc();
  const inputs = f.applied;
  const policy = usePolicy();
  const now = useMemo(() => ({ level, homes, senior, project, entries }), [level, homes, senior, project, entries]);
  const p = useSettled(now, SETTLE_MS);
  // Your screens filter the list: the flood screen sets the most flood-zone land, the transit screen drops places
  // beyond ½ mile of frequent transit.
  const result = useMemo(() => {
    if (!f.open || !inputs || !hud) return null;
    const devType = devTypeOf(p.project, p.level, p.senior);
    if (!isHousing(devType)) return 'commercial' as const;
    const table = hud;
    const read = (geoid: string, place: NonNullable<ReturnType<typeof placeFor>>, branch: Branch | null = null) => readPlace({ geoid, place, hud: table, level: p.level, homes: p.homes, project: p.project, entries: p.entries, devType }, branch);
    const r = findPlaces({ geoids: rankedTracts.map((t) => t.GEOID), placeFor, read }, { ...inputs, maxFlood: FLOOD_LIMIT_PCT[policy.flood] });
    const near = (g: string) => {
      const d = placeFor(g)?.transit?.freq_dist_mi;
      return typeof d === 'number' && d <= TRANSIT_SCREEN_MI;
    };
    const rows = policy.transit ? r.rows.filter((x) => near(x.geoid)) : r.rows;
    const shown = rows.slice(0, Math.max(1, inputs.top));
    // The 4% path, only for the rows shown.
    const alts = new Map(shown.map((row) => [row.geoid, altFor(row, read)]));
    // The tax credit line most rows share, once above the rows; a row prints its own only when it differs.
    const count = new Map<string, number>();
    for (const row of shown) if (row.points) count.set(pointsLine(row.read.m.branch, row.points), (count.get(pointsLine(row.read.m.branch, row.points)) ?? 0) + 1);
    const [top, n] = [...count].sort((x, y) => y[1] - x[1])[0] ?? ['', 0];
    const samePoints = n >= 2 && n * 2 > shown.length ? top : null;
    return { ...r, rows, shown, alts, samePoints, farTransit: r.rows.length - rows.length };
  }, [f.open, inputs, p, policy.flood, policy.transit]);

  if (!f.open || !inputs) {
    return (
      <div className="border-t border-stone-200/80 pt-3">
        <button type="button" onClick={openFinder} className="rounded-full bg-white px-3 py-1 text-small font-medium text-slate-800 ring-1 ring-stone-300 hover:bg-violet-50 hover:text-violet-800 hover:ring-violet-200">
          Or find places for a project
        </button>
      </div>
    );
  }

  const list = result && result !== 'commercial' ? result : null;
  const left = list ? (Object.entries(list.excluded) as [Reason, number][]).filter(([, v]) => v > 0) : [];
  const [a, b] = f.shortlist;

  return (
    <section className="border-t border-stone-200/80" data-finder>
      <div className="pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-body font-semibold text-slate-900">Find places for a project</h3>
          <button type="button" onClick={() => useFinder.setState({ open: false })} className="text-caption text-slate-500 hover:text-violet-800">
            Close
          </button>
        </div>
        <p className="mt-0.5 text-caption leading-snug text-slate-600">
          {list?.project ? `${projectWords(list.project)}. ` : ''}Your project on the left, read in each place as the Tract view reads it. Change the project; the list follows.
        </p>
      </div>

      {result === 'commercial' && <p className="mt-3 text-caption leading-snug text-slate-600">Commercial gets a zoning check only, so there is no money to rank places by. Pick a housing type on the left.</p>}

      {list && (
        <>
          <p className="mt-3 text-caption leading-snug text-slate-600">
            <b className="font-semibold text-slate-900">{list.rows.length}</b> of {list.tested} places fit every filter{list.rows.length > list.shown.length ? `; the first ${list.shown.length} shown` : ''}.
            {(left.length > 0 || list.farTransit > 0) && ` Left out: ${[...left.map(([r, v]) => `${v} ${REASON_WORD[r]}${list.relax[r] && list.relax[r]! < v ? ` (${list.relax[r]} by that alone)` : ''}`), ...(list.farTransit > 0 ? [`${list.farTransit} beyond ½ mile of frequent transit`] : [])].join(', ')}.`}
          </p>
          {list.samePoints && <p className="mt-1.5 text-caption leading-snug text-slate-600 tnum">Unless a row says otherwise: {list.samePoints}.</p>}
          <div className="mt-2 divide-y divide-stone-200/70 border-y border-stone-200/80">
            {list.shown.map((row, k) => (
              <Row key={row.geoid} n={k + 1} row={row} alt={list.alts.get(row.geoid) ?? null} rec={suggestions.get(row.geoid)} picked={f.shortlist.includes(row.geoid)} samePoints={list.samePoints} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 py-2.5">
            <span className="text-caption text-slate-600">{f.shortlist.length === 2 ? 'Two places shortlisted.' : 'Shortlist two places to compare them.'}</span>
            <button
              type="button"
              disabled={!a || !b}
              onClick={() => {
                useApp.setState({ selectedId: a, compareId: b });
                useApp.getState().setMode('tracts');
              }}
              className="rounded-full bg-white px-3 py-1 text-small font-medium text-slate-800 ring-1 ring-stone-300 hover:bg-violet-50 hover:text-violet-800 hover:ring-violet-200 disabled:opacity-50"
            >
              Compare these two
            </button>
          </div>
          <SourceLine>
            Each place is read with your project as set, on a lot the size it needs in a district there that allows it by right (the Tract view’s site read), with the same zoning check, capital stack and review; a row opens that reading. Order: works, then works with changes, then doesn’t work as is (the review’s verdict); on tax credit paths, places where PHFA’s minimum is within your design and financing choices, then those that also need the site, partner and team lines, then those out of reach; then fewer things to fix; then less money a unit still to find (tax credits: the gap after every source; market rate: the equity a 1.5× return would not pay back); then more PHFA points from the place; then the lower cost a unit. The 4% path is shown where 9% credits need more than your choices. Costs and rents beyond the place’s own data are the Capital inputs’ suggested values. {AWARD_NOTE} {stamp()}. {SCREENING_NOTE}
          </SourceLine>
        </>
      )}
    </section>
  );
}

/** The finder's filters, for the left panel (shown before a place is picked). The project is the group above it. */
export function FinderInputs() {
  const f = useFinder();
  const side = useSide();
  const inputs = finderInputs(f);
  const project = side.project();
  const level = side.plan((s) => s.level);
  const homes = side.plan((s) => s.homes);
  const senior = side.plan((s) => isSeniorAge(s.age));
  const entries = side.lihtc();
  const devType = devTypeOf(project, level, senior);
  // The financing in force, by the project model's own rule (the pick, else tax credits when units carry an income limit).
  const branch = isHousing(devType) ? branchFor({ project, entries } as Pick<ProjectBase, 'project' | 'entries'> as ProjectBase, projectMix(project, level, homes, null, null)).branch : null;
  if (!isHousing(devType)) return <p className="text-small text-slate-600">Commercial: zoning check only, so places are not ranked.</p>;
  return (
    <div data-finder-inputs>
      <p className="text-caption leading-snug text-slate-600">Every place is read with the project above.</p>
      {branch && branch !== 'market' && (
        <div className="mt-2">
          <Segmented label="Low-income housing tax credit (LIHTC)" options={['nine', 'four'] as const} value={branch === 'four' ? 'four' : 'nine'} onChange={(v) => setFinancingOn(side, v)} text={(v) => (v === 'nine' ? '9% credits' : '4% credits + bonds')} cols={2} />
        </div>
      )}
      <div className="mt-2 space-y-1.5">
        <label className="flex items-center gap-1.5 text-caption text-slate-700">
          <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={inputs.byRight} onChange={(e) => setInputs({ byRight: e.target.checked })} />
          Allowed by right on a lot here
        </label>
        <p className="text-caption leading-snug text-slate-500">The Tract view’s zoning check: a lot the size the project needs, in a district here that allows it. Downtown, riverfront and some mixed-use districts are not computed.</p>
        <label className="flex items-center gap-1.5 text-caption text-slate-700">
          <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={inputs.hearingOk} disabled={!inputs.byRight} onChange={(e) => setInputs({ hearingOk: e.target.checked })} />
          Count a hearing (conditional use, special exception) as allowed
        </label>
        <label className="flex items-center gap-1.5 text-caption text-slate-700">
          <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={inputs.qctOrDda} onChange={(e) => setInputs({ qctOrDda: e.target.checked })} />
          QCT or DDA only (130% basis)
        </label>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <label className="block min-w-0">
          <span className="text-caption text-slate-600">Inclusionary overlay</span>
          <select className={cx(FIELD, 'mt-0.5')} value={inputs.overlay} onChange={(e) => setInputs({ overlay: e.target.value as 'any' | 'inside' | 'outside' })} aria-label="Inclusionary overlay">
            <option value="any">Any</option>
            <option value="inside">Inside</option>
            <option value="outside">Outside</option>
          </select>
        </label>
        <label className="block min-w-0">
          <span className="text-caption text-slate-600">Least market depth</span>
          <input type="number" min={0} className={cx(FIELD, 'mt-0.5')} value={inputs.minDepth ?? ''} placeholder="no limit" onChange={(e) => setInputs({ minDepth: num(e.target.value) })} aria-label="Fewest homes of market depth" />
        </label>
        <label className="block min-w-0">
          <span className="text-caption text-slate-600">Most cost a unit</span>
          <input type="number" min={0} step={10000} className={cx(FIELD, 'mt-0.5')} value={inputs.maxCost ?? ''} placeholder="no limit" onChange={(e) => setInputs({ maxCost: num(e.target.value) })} aria-label="Most total cost a unit" />
        </label>
        <label className="block min-w-0">
          <span className="text-caption text-slate-600">Show top</span>
          <input type="number" min={1} className={cx(FIELD, 'mt-0.5')} value={inputs.top} onChange={(e) => setInputs({ top: Math.max(1, num(e.target.value) ?? 1) })} aria-label="Places shown" />
        </label>
      </div>
    </div>
  );
}
