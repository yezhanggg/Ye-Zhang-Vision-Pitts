// Find places for a project, on Analysis > Place before a place is picked (docs/data/finder.md). The person describes
// the project once; every ranked tract is tested with the same model as "Test a project here" (lib/finder/rank) and
// listed by a rule printed under the list: ranks and words, no composite number. A row opens the place; two
// shortlisted rows open in Compare places. The form (FinderInputs) sits in the left panel; the list (FinderCard) in the
// right panel's start card.
// Loaded on demand and left out of the offline single file (MatchView imports this module lazily, never statically).
import { useMemo } from 'react';
import { rankedTracts, tractById, tractLabel } from '../../../lib/data';
import { finderInputs, useFinder, setInputs, toggleShortlist } from '../../../lib/finder/store';
import { useSide } from '../../../lib/project/side';
import { findPlaces, REASON_WORD, type Financing, type FinderRow, type Reason } from '../../../lib/finder/rank';
import { cx } from '../../../lib/format';
import { useLihtc } from '../../../lib/lihtc/store';
import { hud, placeFor } from '../../../lib/place/data';
import { FLOOD_LIMIT_PCT, LEVEL_LABEL } from '../../../lib/place/plan';
import { usePolicy } from '../../../lib/policy/store';
import { TRANSIT_SCREEN_MI } from '../../../lib/policy/compose';
import { usePlan } from '../../../lib/place/planStore';
import type { Recommendation } from '../../../lib/place/recommend';
import { TYPOLOGY_LABEL } from '../../../lib/place/thresholds';
import type { Typology } from '../../../lib/place/types';
import { PATH_LABEL } from '../../../lib/project/paths';
import { closesWords, TIER_WORD } from '../../../lib/project/size';
import { stamp, SCREENING_NOTE } from '../../../lib/project/stamp';
import { useProject } from '../../../lib/project/store';
import { useApp } from '../../../lib/store';
import { tractCapacity } from '../../../lib/zoning/capacity';
import { capitalize } from '../../../lib/place/format';
import { SourceLine } from '../shared';
import { AWARD_NOTE, pointsWords, sizeWords, usdShort } from '../project/summary';

const FIELD = 'w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-small text-slate-900 tnum focus:border-violet-500 focus:outline-none';
const TONE = { closes: 'text-emerald-700', close: 'text-slate-900', gap: 'text-rose-700' } as const;
const FINANCING: { value: Financing; label: string }[] = [
  { value: 'either', label: '9% or 4%' },
  { value: 'nine', label: '9% credits' },
  { value: 'four', label: '4% + bonds' },
  { value: 'market', label: 'Market rate' },
];
const TYPES: Typology[] = ['small_apartment', 'townhome', 'duplex_triplex', 'senior'];
const num = (v: string): number | null => (v.trim() === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const izo = (g: string) => tractCapacity(g)?.izo_share ?? null;

/** Open the finder: the list here, ranked on the form as it stands; its form in the left panel. */
function openFinder() {
  const f = useFinder.getState();
  useFinder.setState({ open: true, applied: f.applied ?? finderInputs(f, usePlan.getState().homes) });
  if (!useApp.getState().ui.left) useApp.getState().setUi({ left: true });
}

function Row({ n, row, rec, picked, either }: { n: number; row: FinderRow; rec: Recommendation | undefined; picked: boolean; either: boolean }) {
  const t = tractById.get(row.geoid);
  const lead = rec?.lead ? capitalize(TYPOLOGY_LABEL[rec.lead]) : null;
  const s = row.sweep;
  return (
    <div className={cx('py-2.5', picked && 'bg-violet-50/60')} data-finder-row>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-semibold text-violet-800 tnum">{n}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <button type="button" onClick={() => useApp.getState().select(row.geoid)} className="text-left text-small font-semibold text-slate-900 hover:text-violet-800">
              {t ? tractLabel(t) : row.geoid}
            </button>
            <span className={cx('shrink-0 text-small font-semibold tnum', TONE[row.tier])}>{TIER_WORD[row.tier]}</span>
          </span>
          <span className="mt-0.5 block text-caption leading-snug text-slate-600">
            {either && `${PATH_LABEL[s.branch]} · `}
            {capitalize(closesWords(s))}
            {s.cut && ` (above ${s.cut === 'zoning' ? 'by-right homes' : 'market depth'})`} · at {s.best.homes}: {sizeWords(s.best)} · {usdShort(row.costPerHome)} a home
          </span>
          {row.points && <span className="mt-0.5 block text-caption leading-snug text-slate-600 tnum">PHFA: {pointsWords(row.points)}</span>}
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
  const project = useProject();
  const entries = useLihtc();
  const inputs = f.applied;
  const policy = usePolicy();
  // Your screens filter the list: the flood screen sets the most flood-zone land, the transit screen drops places
  // beyond ½ mile of frequent transit.
  const result = useMemo(() => {
    if (!f.open || !inputs || !hud) return null;
    const r = findPlaces({ geoids: rankedTracts.map((t) => t.GEOID), placeFor, hud, level, project, entries }, { ...inputs, maxFlood: FLOOD_LIMIT_PCT[policy.flood] }, izo);
    if (!policy.transit) return { ...r, farTransit: 0 };
    const near = (g: string) => {
      const d = placeFor(g)?.transit?.freq_dist_mi;
      return typeof d === 'number' && d <= TRANSIT_SCREEN_MI;
    };
    const rows = r.rows.filter((x) => near(x.geoid));
    return { ...r, rows, farTransit: r.rows.length - rows.length };
  }, [f.open, inputs, level, project, entries, policy.flood, policy.transit]);

  if (!f.open || !inputs) {
    return (
      <div className="border-t border-stone-200/80 pt-3">
        <button type="button" onClick={openFinder} className="rounded-full bg-white px-3 py-1 text-small font-medium text-slate-800 ring-1 ring-stone-300 hover:bg-violet-50 hover:text-violet-800 hover:ring-violet-200">
          Or find places for a project
        </button>
      </div>
    );
  }

  const shown = result ? result.rows.slice(0, Math.max(1, inputs.top)) : [];
  const left = result ? (Object.entries(result.excluded) as [Reason, number][]).filter(([, v]) => v > 0) : [];
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
          {inputs.min}–{inputs.max} homes · {FINANCING.find((x) => x.value === inputs.financing)?.label} · {LEVEL_LABEL[level]}
          {inputs.type ? ` · ${TYPOLOGY_LABEL[inputs.type]}` : ''}. Change the project under Find places for a project on the left, then Confirm.
        </p>
      </div>

      {result && (
        <>
          <p className="mt-3 text-caption leading-snug text-slate-600">
            <b className="font-semibold text-slate-900">{result.rows.length}</b> of {result.tested} places fit every filter{result.rows.length > shown.length ? `; the first ${shown.length} shown` : ''}.
            {(left.length > 0 || result.farTransit > 0) && ` Left out: ${[...left.map(([r, v]) => `${v} ${REASON_WORD[r]}`), ...(result.farTransit > 0 ? [`${result.farTransit} beyond ½ mile of frequent transit`] : [])].join(', ')}.`}
          </p>
          <div className="mt-2 divide-y divide-stone-200/70 border-y border-stone-200/80">
            {shown.map((row, k) => (
              <Row key={row.geoid} n={k + 1} row={row} rec={suggestions.get(row.geoid)} picked={f.shortlist.includes(row.geoid)} either={inputs.financing === 'either'} />
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
            Order: places that close first (gap under half the developer fee and cash flow at or above zero in years 1–10, PHFA’s feasibility tests), then those over PHFA’s limit (covered only by deferring more than half the fee), then gaps; within each, places whose size range zoning and market depth leave whole, then the smaller gap a home, then more PHFA points from the place, then the lower cost a home. Each place is swept across your homes, cut by the homes zoning allows by right and, for tax credits, market depth (renters at or below 60% AMI within a mile, less tax credit homes there, × 10%). Costs and rents beyond the place’s own data are the project card’s example inputs. {AWARD_NOTE} {stamp()}. {SCREENING_NOTE}
          </SourceLine>
        </>
      )}
    </section>
  );
}

/** The finder's form, for the left panel (shown before a place is picked). Opening it runs the finder. */
export function FinderInputs() {
  const f = useFinder();
  const plan = useSide().plan;
  const inputs = finderInputs(f, plan((s) => s.homes));
  return (
    <div>
      <div data-finder-inputs>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <label className="block min-w-0">
            <span className="text-caption text-slate-600">Homes, from</span>
            <input type="number" min={1} className={cx(FIELD, 'mt-0.5')} value={inputs.min} onChange={(e) => setInputs({ min: Math.max(1, num(e.target.value) ?? 1), max: Math.max(inputs.max, num(e.target.value) ?? 1) })} aria-label="Fewest homes" />
          </label>
          <label className="block min-w-0">
            <span className="text-caption text-slate-600">to</span>
            <input type="number" min={1} className={cx(FIELD, 'mt-0.5')} value={inputs.max} onChange={(e) => setInputs({ min: inputs.min, max: Math.max(inputs.min, num(e.target.value) ?? inputs.min) })} aria-label="Most homes" />
          </label>
          <label className="block min-w-0">
            <span className="text-caption text-slate-600">Financing</span>
            <select className={cx(FIELD, 'mt-0.5')} value={inputs.financing} onChange={(e) => setInputs({ financing: e.target.value as Financing })} aria-label="Financing">
              {FINANCING.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="text-caption text-slate-600">Building type</span>
            <select className={cx(FIELD, 'mt-0.5')} value={inputs.type ?? ''} onChange={(e) => setInputs({ type: (e.target.value || null) as Typology | null })} aria-label="Building type">
              <option value="">Any</option>
              {TYPES.map((x) => (
                <option key={x} value={x}>
                  {capitalize(TYPOLOGY_LABEL[x])}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="text-caption text-slate-600">Most cost a home</span>
            <input type="number" min={0} step={10000} className={cx(FIELD, 'mt-0.5')} value={inputs.maxCost ?? ''} placeholder="no limit" onChange={(e) => setInputs({ maxCost: num(e.target.value) })} aria-label="Most total cost a home" />
          </label>
          <label className="block min-w-0">
            <span className="text-caption text-slate-600">Show top</span>
            <input type="number" min={1} className={cx(FIELD, 'mt-0.5')} value={inputs.top} onChange={(e) => setInputs({ top: Math.max(1, num(e.target.value) ?? 1) })} aria-label="Places shown" />
          </label>
        </div>
        {(
          <div className="mt-2 space-y-1.5">
            <label className="flex items-center gap-1.5 text-caption text-slate-700">
              <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={inputs.byRight} onChange={(e) => setInputs({ byRight: e.target.checked })} />
              Allowed by right on at least 5% of the land (unverified table)
            </label>
            <label className="flex items-center gap-1.5 text-caption text-slate-700">
              <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={inputs.conditionalOk} disabled={!inputs.byRight} onChange={(e) => setInputs({ conditionalOk: e.target.checked })} />
              Count a conditional use as allowed
            </label>
            <label className="flex items-center gap-1.5 text-caption text-slate-700">
              <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={inputs.qctOrDda} onChange={(e) => setInputs({ qctOrDda: e.target.checked })} />
              QCT or DDA only (130% basis)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
