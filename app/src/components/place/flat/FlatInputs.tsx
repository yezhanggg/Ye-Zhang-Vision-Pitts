// Every input of the Place tab in one list of sections, in the order a project is worked: the project, its unit mix
// and income, the site, the policies that apply, open space and sun, the tax credit entries and the pencil. Each
// section has a heading with its current value and folds on a click; chips at the top open one and jump to it. Reads
// and writes the side in context (lib/project/side): the Place tab's draft until Confirm, or a side of Compare places. Before a place is
// picked it holds the project, the income level, the policies and the finder's form.
// Loaded on demand; the offline single file keeps the earlier panel.
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { create } from 'zustand';
import { cx } from '../../../lib/format';
import { POLICIES, STATUS_WORD, type Policy, type PolicyStatus } from '../../../lib/policy/catalog';
import { policyRows, type PolicyContext, type PolicyRow } from '../../../lib/policy/applies';
import { DEFAULT_OPEN_SHARE, OPEN_TYPE_LABEL, openFit, type OpenType } from '../../../lib/policy/sun';
import type { OptionalId } from '../../../lib/policy/store';
import { FLOOD_LABEL, isSeniorAge, LEVEL_LABEL, PLAN_LEVELS, type FloodRisk, type PlanLevel } from '../../../lib/place/plan';
import { hud as hudTable, placeFor } from '../../../lib/place/data';
import type { Recommendation } from '../../../lib/place/recommend';
import type { HudTable, PlaceMeasures } from '../../../lib/place/types';
import type { Branch } from '../../../lib/pencil/inputs';
import { comparePaths, PATH_LABEL } from '../../../lib/project/paths';
import { setFinancingOn, useSide } from '../../../lib/project/side';
import { TIER_WORD } from '../../../lib/project/size';
import { EXAMPLE_HOMES, MIX_LEVELS, type MixLevel } from '../../../lib/project/store';
import { SHEET_FILE } from '../../../lib/lihtc/sheetState';
import { STANDARD_BY_CODE } from '../../../lib/zoning/capacity';
import { tractLabel } from '../../../lib/data';
import type { TractProps } from '../../../lib/types';
import { Segmented } from '../PlanInputs';
import TaxCreditSheet from '../TaxCreditSheet';
import { FinderInputs } from '../finder/FinderCard';
import { MixInputs } from '../project/DemandMix';
import { PencilInputs } from '../project/Pencil';
import { LotInputs, useLot } from '../project/TryLot';
import { useProjectModel, type ProjectModel } from '../project/useProjectModel';
import { AreaSwitch } from '../ZipPanel';
import { SPRING_FOLD, SPRING_TAB } from '../../primitives';

const FIELD = 'w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-small text-slate-900 tnum focus:border-violet-500 focus:outline-none';
const BRANCHES: Branch[] = ['nine', 'four', 'market'];
const STATUS_CLASS: Record<PolicyStatus, string> = {
  adopted: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  federal: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  draft: 'bg-amber-50 text-amber-900 ring-amber-200',
  proposed: 'bg-amber-50 text-amber-900 ring-amber-200',
  study: 'bg-violet-50 text-violet-800 ring-violet-200',
  unverified: 'bg-stone-100 text-slate-600 ring-stone-200',
  assumption: 'bg-stone-100 text-slate-600 ring-stone-200',
};
const DRAFT_SHEET = SHEET_FILE.sheets.find((x) => x.status === 'draft')?.id ?? null;
const ADOPTED_SHEET = SHEET_FILE.sheets.find((x) => x.status === 'adopted')?.id ?? SHEET_FILE.sheets[0].id;

export type SectionId = 'setup' | 'need' | 'build' | 'policy' | 'open' | 'score' | 'pencil' | 'finder';
const SECTION_TITLE: Record<SectionId, string> = { setup: 'Project', need: 'Unit mix and income', build: 'Site', policy: 'Policies that apply here', open: 'Open space and sun', score: 'Tax credit entries', pencil: 'Pencil inputs', finder: 'Find places for a project' };

/** Sections folded by the person (all open at first); kept while the session lasts, shared by both Compare strips. */
const useFolded = create<{ closed: Partial<Record<SectionId, boolean>> }>(() => ({ closed: {} }));
const setFolded = (ids: SectionId[], closed: boolean) => useFolded.setState((s) => ({ closed: { ...s.closed, ...Object.fromEntries(ids.map((i) => [i, closed])) } }));

/** A section of the panel: its heading in capitals and in color, with its current value; click it to fold the section. */
function Section({ id, summary, children }: { id: SectionId; summary?: ReactNode; children: ReactNode }) {
  const open = !useFolded((s) => s.closed[id]);
  return (
    <section data-edit={id} className="border-t border-stone-200/80 pt-3">
      <button type="button" aria-expanded={open} onClick={() => setFolded([id], open)} className="flex w-full items-center gap-1.5 text-left text-violet-700 hover:text-violet-900">
        <motion.svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" initial={false} animate={{ rotate: open ? 90 : 0 }} transition={SPRING_TAB} aria-hidden>
          <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
        <h3 className="text-small font-bold uppercase tracking-wide">{SECTION_TITLE[id]}</h3>
        {summary && <span className="ml-auto min-w-0 truncate text-caption text-slate-500">{summary}</span>}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0, transition: { ...SPRING_FOLD, opacity: { duration: 0.12 } } }} transition={SPRING_FOLD} className="overflow-hidden">
            <div className="space-y-2 pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Badge({ status }: { status: PolicyStatus }) {
  return <span className={cx('rounded px-1 py-px text-[10px] font-semibold ring-1', STATUS_CLASS[status])}>{STATUS_WORD[status]}</span>;
}

// ------------------------------------------------------------------------------------------------------- Project

function Residents() {
  const side = useSide();
  const senior = side.plan((s) => isSeniorAge(s.age));
  const pick = (v: boolean) => {
    side.plan.getState().setPlan({ age: v ? 'senior62' : 'any' });
    if (!side.own) side.lihtc.setState((e) => ({ setup: { ...e.setup, occupancy: v ? 'senior' : 'general' } }));
  };
  return <Segmented label="Residents" options={['general', 'senior']} value={senior ? 'senior' : 'general'} onChange={(v) => pick(v === 'senior')} text={(v) => (v === 'senior' ? 'Senior 62+' : 'General')} cols={2} tip={(v) => (v === 'senior' ? 'Age-restricted homes for 62 and older: allows senior housing and scores the PHFA sheet for seniors.' : 'Homes for any age: senior housing is not suggested.')} />;
}

function HomesField({ m, lotHomes }: { m: ProjectModel | null; lotHomes: number | null }) {
  const side = useSide();
  const homes = side.plan((s) => s.homes);
  const mine = m?.mix.mode === 'mine';
  const set = (n: number | null) => side.plan.getState().setPlan({ homes: n });
  return (
    <label className="block min-w-0">
      <span className="text-caption text-slate-600">Homes</span>
      <input
        type="number"
        min={1}
        step={1}
        className={cx(FIELD, 'mt-0.5')}
        value={mine ? m!.mix.homes : (homes ?? '')}
        placeholder={String(EXAMPLE_HOMES)}
        disabled={mine}
        title={mine ? 'Your own mix sets the homes: edit it under Unit mix' : undefined}
        onChange={(e) => set(e.target.value === '' ? null : Math.max(1, Math.round(Number(e.target.value))))}
        aria-label="Homes in the project"
      />
      {!mine && lotHomes != null && lotHomes > 0 && lotHomes !== (homes ?? EXAMPLE_HOMES) && (
        <button type="button" onClick={() => set(lotHomes)} className="mt-0.5 text-caption font-medium text-violet-700 hover:text-violet-800">
          Use {lotHomes} (by right on your lot)
        </button>
      )}
    </label>
  );
}

function ProjectSection({ t, m, lotHomes }: { t: TractProps | null; m: ProjectModel | null; lotHomes: number | null }) {
  const side = useSide();
  const stories = side.project((s) => s.stories);
  const paths = useMemo(() => (m ? comparePaths(m.base, m.mix.homes, stories) : []), [m, stories]);
  const tier = (b: Branch) => paths.find((p) => p.branch === b)?.yours.tier;
  const homesWord = m ? `${m.mix.homes} homes${m.mix.example ? ' (example)' : ''}` : 'homes';
  return (
    <Section id="setup" summary={m ? `${homesWord} · ${stories ?? '?'} stories · ${PATH_LABEL[m.branch]}` : undefined}>
      <div className="grid grid-cols-2 gap-2">
        <HomesField m={m} lotHomes={lotHomes} />
        {t && (
          <label className="block min-w-0">
            <span className="text-caption text-slate-600">Stories</span>
            <input type="number" min={1} step={1} className={cx(FIELD, 'mt-0.5')} value={stories ?? ''} onChange={(e) => side.project.setState({ stories: e.target.value === '' ? null : Math.max(1, Math.round(Number(e.target.value))) })} aria-label="Stories" />
          </label>
        )}
      </div>
      <Residents />
      {m && (
        <label className="block">
          <span className="text-caption text-slate-600">Financing</span>
          <select className={cx(FIELD, 'mt-0.5')} value={m.branch} onChange={(e) => setFinancingOn(side, e.target.value as Branch)} aria-label="Financing">
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {PATH_LABEL[b]}
                {tier(b) ? ` · ${TIER_WORD[tier(b)!]} at your homes` : ''}
              </option>
            ))}
          </select>
        </label>
      )}
    </Section>
  );
}

// ------------------------------------------------------------------------------------------------------ Unit mix

/** The deepest income level a mix holds, as a planning level (60% reads as ≤80%, the level that contains it). */
const levelOfMix = (counts: Record<MixLevel, number[]>): PlanLevel | null => {
  const l = MIX_LEVELS.find((x) => counts[x].some((n) => n > 0));
  return l == null ? null : l === '30' ? 30 : l === '50' ? 50 : l === 'mkt' ? 'market' : 80;
};

function MixSection({ m }: { m: ProjectModel | null }) {
  const side = useSide();
  const level = side.plan((s) => s.level);
  const mine = m?.mix.mode === 'mine';
  const fromMix = mine ? levelOfMix(m!.mix.counts) : null;
  // With your own mix, the income level the suggestion reads is the mix's deepest.
  useEffect(() => {
    if (fromMix != null && fromMix !== side.plan.getState().level) side.plan.getState().setPlan({ level: fromMix });
  }, [fromMix, side]);
  return (
    <Section id="need" summary={`${LEVEL_LABEL[level]}${m ? ` · ${mine ? 'your mix' : "renters' split"}` : ''}`}>
      {mine ? (
        <p className="text-small text-slate-800">Income level: {LEVEL_LABEL[level]} (from your mix)</p>
      ) : (
        <div>
          <Segmented label="Income level" options={PLAN_LEVELS} value={level} onChange={(v) => side.plan.getState().setPlan({ level: v })} text={(v) => LEVEL_LABEL[v]} cols={2} />
        </div>
      )}
      {m && <MixInputs mix={m.mix} />}
    </Section>
  );
}

// ---------------------------------------------------------------------------------------------------------- Policies

/** One policy on one line: its switch, its name and status, and (for rules read from the data) whether it applies here.
 *  The rule, what it means here and the source sit in the tooltip; the right panel spells them out. */
function PolicyLine({ row, control, auto = false }: { row: Pick<PolicyRow, 'policy' | 'applies' | 'note' | 'on'>; control?: ReactNode; auto?: boolean }) {
  const p = row.policy;
  const state = p.kind === 'binding' ? (row.applies ? 'applies here' : row.applies === false ? 'not here' : null) : auto ? (row.on ? 'counted' : row.applies === false ? 'not here' : null) : null;
  return (
    <div className="flex items-center gap-2 py-1.5" title={`${p.rule}\n\n${row.note}\n\nSource: ${p.source}${p.url ? ` (${p.url})` : ''}`}>
      <span className="flex w-4 shrink-0 justify-center">{control}</span>
      <span className="min-w-0 flex-1 truncate text-small text-slate-900">{p.label}</span>
      <Badge status={p.status} />
      {state && <span className={cx('w-24 shrink-0 text-right text-caption', state === 'not here' ? 'text-slate-400' : 'font-semibold text-violet-800')}>{state}</span>}
    </div>
  );
}

const Check = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />;

function PoliciesSection({ ctx }: { ctx: PolicyContext | null }) {
  const side = useSide();
  const pol = side.policy();
  const sheet = side.lihtc((e) => e.sheet);
  const rows = ctx ? policyRows({ ...ctx, draftSheet: sheet === DRAFT_SHEET }, pol) : null;
  const rowOf = (id: Policy['id']): Pick<PolicyRow, 'policy' | 'applies' | 'note' | 'on'> => rows?.find((r) => r.policy.id === id) ?? { policy: POLICIES.find((p) => p.id === id)!, applies: null, note: 'Pick a place to see whether it applies.', on: false };
  const setOn = (id: OptionalId, v: boolean) => side.policy.setState((s) => ({ on: { ...s.on, [id]: v } }));
  const screens = [pol.displacement && 'displacement', pol.transit && 'transit ½ mi', pol.flood !== 'any' && `flood ${FLOOD_LABEL[pol.flood]}`].filter(Boolean);
  return (
    <Section id="policy" summary={screens.length ? `screens: ${screens.join(', ')}` : 'no screens on'}>
      <div>
        <div className="text-caption font-semibold uppercase tracking-wide text-slate-600">Binding rules</div>
        <div className="divide-y divide-stone-100">
          {(['izo', 'fpo', 'adu'] as const).map((id) => (
            <PolicyLine key={id} row={rowOf(id)} auto />
          ))}
        </div>
      </div>
      <div>
        <div className="text-caption font-semibold uppercase tracking-wide text-slate-600">Funding and incentives</div>
        <div className="divide-y divide-stone-100">
          <PolicyLine row={rowOf('phfa')} auto />
          <PolicyLine row={rowOf('qct')} auto />
          <PolicyLine row={rowOf('perf')} auto />
          {DRAFT_SHEET && <PolicyLine row={rowOf('phfa_draft')} control={<Check checked={sheet === DRAFT_SHEET} onChange={(v) => side.lihtc.setState({ sheet: v ? DRAFT_SHEET : ADOPTED_SHEET })} label="Score on the 2027/2028 draft sheet" />} />}
          {(['ahb', 'hof', 'abatement', 'parking'] as const).map((id) => (
            <PolicyLine key={id} row={rowOf(id)} control={<Check checked={!!pol.on[id]} onChange={(v) => setOn(id, v)} label={POLICIES.find((p) => p.id === id)!.label} />} />
          ))}
          <PolicyLine row={rowOf('plan')} />
        </div>
      </div>
      <div>
        <div className="text-caption font-semibold uppercase tracking-wide text-slate-600">Your screens</div>
        <div className="divide-y divide-stone-100">
          <PolicyLine row={rowOf('displacement')} control={<Check checked={pol.displacement} onChange={(v) => side.policy.setState({ displacement: v })} label="Displacement risk screen" />} />
          <PolicyLine row={rowOf('transit')} control={<Check checked={pol.transit} onChange={(v) => side.policy.setState({ transit: v })} label="Frequent transit screen" />} />
          <div>
            <PolicyLine row={rowOf('flood')} control={<Check checked={pol.flood !== 'any'} onChange={(v) => side.policy.setState({ flood: v ? 'le5' : 'any' })} label="Flood-zone screen" />} />
            {pol.flood !== 'any' && (
              <div className="pb-1.5" style={{ paddingLeft: 24 }}>
                <Segmented label="Most flood-zone land in the tract" options={['none', 'le5', 'le15'] as FloodRisk[]} value={pol.flood} onChange={(v) => side.policy.setState({ flood: v })} text={(v) => FLOOD_LABEL[v]} cols={3} />
              </div>
            )}
          </div>
          <PolicyLine row={rowOf('market')} />
        </div>
      </div>
    </Section>
  );
}

// ------------------------------------------------------------------------------------------------ Open space and sun

function OpenSection({ m, lot }: { m: ProjectModel; lot: { lotSqft: number; maxCoverage: number | null } | null }) {
  const side = useSide();
  const share = side.project((s) => s.openShare ?? DEFAULT_OPEN_SHARE);
  const type = side.project((s) => s.openType ?? 'shared');
  const stories = side.project((s) => s.stories);
  const fit = lot ? openFit(m.mix.counts, m.mix.homes, stories ?? 1, m.args.inputs.unitSf, m.args.inputs.efficiency, lot.lotSqft, share, lot.maxCoverage) : null;
  return (
    <Section id="open" summary={`${Math.round(share * 100)}% of the lot · ${OPEN_TYPE_LABEL[type].toLowerCase()}`}>
      <div className="grid grid-cols-2 gap-x-3">
        <label className="block min-w-0">
          <span className="text-caption text-slate-600">Open space, % of lot</span>
          <input type="number" min={0} max={90} step={5} className={cx(FIELD, 'mt-0.5')} value={Math.round(share * 100)} onChange={(e) => side.project.setState({ openShare: Math.min(0.9, Math.max(0, Number(e.target.value) / 100 || 0)) })} aria-label="Open space as a percent of the lot" />
        </label>
        <label className="block min-w-0">
          <span className="text-caption text-slate-600">Who uses it</span>
          <select className={cx(FIELD, 'mt-0.5')} value={type} onChange={(e) => side.project.setState({ openType: e.target.value as OpenType })} aria-label="Who uses the open space">
            {(Object.keys(OPEN_TYPE_LABEL) as OpenType[]).map((k) => (
              <option key={k} value={k}>
                {OPEN_TYPE_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {fit && (
        <p className={cx('text-small', fit.fits ? 'text-emerald-700' : 'text-rose-700')} title={fit.formula}>
          {fit.fits ? 'Fits on the lot' : `Too big for the lot: about ${fit.homesThatFit} homes fit`}
        </p>
      )}
    </Section>
  );
}

// ------------------------------------------------------------------------------------------------------------- Panel

/** Chips that open a section and bring it into view, and one switch to fold or open them all. */
function Jump({ ids, root }: { ids: SectionId[]; root: React.RefObject<HTMLDivElement | null> }) {
  const closed = useFolded((s) => s.closed);
  const allOpen = ids.every((i) => !closed[i]);
  const go = (id: SectionId) => {
    setFolded([id], false);
    window.setTimeout(() => root.current?.querySelector(`[data-edit="${id}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 60);
  };
  return (
    <div className="flex flex-wrap items-center gap-1" aria-label="Jump to a section">
      {ids.map((id) => (
        <button key={id} type="button" onClick={() => go(id)} className="rounded-full bg-white px-2 py-0.5 text-caption text-slate-700 ring-1 ring-stone-300 hover:bg-violet-50">
          {SECTION_TITLE[id].replace(' that apply here', '').replace(' and income', '')}
        </button>
      ))}
      <button type="button" onClick={() => setFolded(ids, allOpen)} className="ml-auto text-caption font-medium text-violet-700 hover:text-violet-800">
        {allOpen ? 'Fold all' : 'Open all'}
      </button>
    </div>
  );
}

/** The lot set under Site, for the homes link and the open space check (none until a place is picked). */
function useSiteLot(t: TractProps | null, m: ProjectModel | null, rec: Recommendation | null) {
  const cap = m?.cap ?? null;
  const lot = useLot({ geoid: t?.GEOID ?? '', cap: cap ?? EMPTY_CAP, lead: rec?.lead ?? null, homes: m?.mix.homes ?? 0, homesExample: !!m?.mix.example });
  if (!t || !cap) return null;
  return { homes: lot.calc.homes, lotSqft: lot.lotSqft, maxCoverage: STANDARD_BY_CODE.get(lot.district)?.max_coverage ?? null };
}
const EMPTY_CAP = { lots: 0, vacant: { lots: 0, acres: 0, median_sqft: null, computed: 0, below_min: 0, homes: 0, by_family: {}, largest: null }, gentle: { lots: 0, homes: 0 }, districts: {}, izo_share: null };

export function FlatInputsFor({ t, place, hud, rec, area = false, only }: { t: TractProps | null; place: PlaceMeasures | null; hud: HudTable | null; rec: Recommendation | null; area?: boolean; /** Show only these sections (Compare's side B when it shares A's settings). */ only?: SectionId[] }) {
  const side = useSide();
  const root = useRef<HTMLDivElement>(null);
  const m = useProjectModel(t?.GEOID, place, hud);
  const site = useSiteLot(t, m, rec);
  const homes = side.plan((s) => s.homes);
  const show = (id: SectionId) => !only || only.includes(id);
  const ctx: PolicyContext | null = t && m ? { label: tractLabel(t), place, cap: m.cap, homes: m.mix.homes, branch: m.branch, qctOrDda: m.qctOrDda, score: m.sheet.score, draftSheet: false } : null;
  const ids: SectionId[] = (t ? (['setup', 'need', 'build', 'policy', 'open', 'score', 'pencil'] as SectionId[]) : (['setup', 'need', 'policy', 'finder'] as SectionId[])).filter(show);
  return (
    <div ref={root} className="space-y-3" data-flat-inputs>
      {area && <AreaSwitch />}
      {ids.length > 2 && <Jump ids={ids} root={root} />}
      {show('setup') && <ProjectSection t={t} m={m} lotHomes={site?.homes ?? null} />}
      {show('need') && <MixSection m={m} />}
      {t && show('build') && (
        <Section id="build" summary={site ? `${site.lotSqft.toLocaleString('en-US')} sq ft · ${site.homes} by right` : undefined}>
          {m?.cap ? <LotInputs geoid={t.GEOID} cap={m.cap} lead={rec?.lead ?? null} homes={m.mix.homes} homesExample={m.mix.example} /> : <p className="text-small text-slate-600">No zoning capacity was computed for this tract.</p>}
        </Section>
      )}
      {show('policy') && <PoliciesSection ctx={ctx ?? (t ? null : null)} />}
      {t && m && show('open') && <OpenSection m={m} lot={site} />}
      {t && m && place && show('score') && (
        <Section id="score" summary={`${m.sheet.score.total} of ${m.sheet.score.max} points${m.sheet.score.threshold != null ? ` · minimum ${m.sheet.score.threshold}` : ''}`}>
          <TaxCreditSheet t={t} place={place} plan={m.facts} state={m.sheet} market={m.branch === 'market'} part="edit" />
        </Section>
      )}
      {t && m && show('pencil') && (
        <Section id="pencil" summary={`${m.exampleCount} examples`}>
          <PencilInputs args={m.args} kinds={m.kinds} branch={m.branch} qctOrDda={m.qctOrDda} />
        </Section>
      )}
      {!t && show('finder') && (
        <Section id="finder" summary={homes != null ? `around ${homes} homes` : undefined}>
          <FinderInputs />
        </Section>
      )}
    </div>
  );
}

/** The Place tab's flat inputs for the picked place (or none yet). */
export default function FlatInputs({ t, rec }: { t: TractProps | null; rec: Recommendation | null }) {
  const place = t ? placeFor(t.GEOID) : null;
  return <FlatInputsFor t={t} place={place} hud={hudTable} rec={rec} area />;
}
