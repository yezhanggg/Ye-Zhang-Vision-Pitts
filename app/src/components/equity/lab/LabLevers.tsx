// The Policy lab's left panel, simple first (Ye, 2026-10-29): the test building, then six policies as on/off switches,
// at the top; everything else under More options. There: start from a package, set the test project, then the policies by the challenge's kinds
// (zoning, inclusionary housing and its bonus, tax breaks and funding, infrastructure), your values (the screens) and
// the assumptions. Each policy shows today's rule and its status (in force, proposed, idea to test); the (i) says how
// the lab uses it and where it comes from. A moved policy is marked with a violet edge. Online only.
import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '../../../lib/format';
import { placeById } from '../../../lib/place/data';
import { ABATEMENTS, EXAMPLES, LEVER_KEYS, moved, PACKAGES, SUBSIDIES, TEST_TYPES, TODAY, transitMiles, typeFor, type Ami, type HouseLots, type IzWhere, type LeverId, type Parking, type Policies, type Scenario, type TestType } from '../../../lib/policylab/lab';
import { Segmented } from '../../place/PlanInputs';
import { FIELD, n0, TYPE_SHORT, TYPE_TIP, YOURS } from './ui';

const TYPES = Object.keys(TEST_TYPES) as TestType[];

const INFO: Record<string, string> = {
  type: 'One building on paper, tested in every city tract with its asking rent (or HUD Small Area FMR) and its renters’ household sizes. Zoning is read from the tract’s lots: the districts whose use table allows the building, whose homes a lot hold it and whose height takes its stories.',
  houseLots: 'Today a house lot holds 1 (R1), 2 (R2) or 3 (R3) homes, and ADUs are allowed nowhere (no ADU overlay is mapped). The lab counts lived-in house lots (R1D, R1A, R2, R3) at or above the minimum lot size. + ADU: an accessory unit beside a single home. Up to 3 or 4: each lot may hold that many homes, so a duplex, triplex or fourplex is allowed by right there. It counts zoning room, not homes that will be built. From county lots and assessments; §903.03, §911.02, §912.08.',
  lots: 'In force since May 2025: Bill 2025-1579 cut the minimums: 8,000 → 6,000, 5,000 → 3,000, 3,200 → 2,400, 1,800 → 1,200 sq ft (very low to high density). The old very-high figure is not published; 1,200 is an assumption. Changes the homes allowed by right on vacant and house lots.',
  parking: 'In force: 1 space a home for 2 or more homes (§914.02); removing them citywide was proposed in 2024–25. Each required space adds the parking cost (Assumptions) to the project. None near transit: no minimum within ½ mile of frequent transit (an idea to test). Townhomes need none; senior housing needs a parking study, not costed.',
  iz: 'In force in the IZ-O (Lawrenceville, Bloomfield, Polish Hill, Oakland): 10% of homes at 50% AMI from 20 units (§907.04.A). Market-rate test projects of the minimum size or more rent that share of their homes at 30% of the income limit (HUD FY2026), less utilities, from the largest size first. Tracts more than half inside the IZ-O count as IZ-O.',
  bonus: 'Proposed (Bill 2025-1545): where no set-aside is required, 10, 15 or 20% of homes at 50% AMI earn 2, 4 or 6 performance points, 15 ft of height a point. The lab adds 10-ft floors and units in proportion; the developer takes it only where the taller building does better. An upper bound: the lot and the market must carry the height. Offered from the requirement’s minimum size (an assumption).',
  abatement: 'An idea to test, like Pittsburgh’s LERTA abatements; the amounts are examples. Property tax off the operating cost every year, for every home in the test project.',
  subsidy: 'An idea to test: public gap money, like the URA’s Housing Opportunity Fund. It enters the capital stack as other subsidy: the amount times the homes with an income limit.',
  plan: 'The adopted plan is in force; it matters only for tax credit projects. PHFA’s Qualified Allocation Plan sets the most 9% credits a project may get.',
  bus: 'Every route runs at least every 15 minutes, so a tract’s nearest stop counts as frequent (GTFS stops). It changes parking near transit, the transit screen and the climate count. Rents and land prices stay as they are: the lab does not model how the market responds.',
  bar: 'The developer’s money back over a 7-year hold, sale included, divided by the equity it put in. 1.5× is a common bar, not a rule. A project needing no equity works when its income covers the loan. Tax credit projects have no sale: they work when no gap is left and cash flow stays above zero for 15 years.',
};

type Status = 'law' | 'proposed' | 'idea' | 'value';
const STATUS: Record<Status, { word: string; cls: string }> = {
  law: { word: 'In force', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  proposed: { word: 'Proposed', cls: 'bg-amber-50 text-amber-900 ring-amber-200' },
  idea: { word: 'Idea', cls: 'bg-violet-50 text-violet-800 ring-violet-200' },
  value: { word: 'Your value', cls: 'bg-stone-100 text-slate-600 ring-stone-200' },
};

/** A policy: its control, then its status and today's rule in a few words (the (i) has the rest). A violet edge marks
 *  one moved from today. */
function Lever({ on, status, line, children }: { on: boolean; status: Status; line: ReactNode; children: ReactNode }) {
  return (
    <div style={{ borderLeft: `2px solid ${on ? YOURS : 'transparent'}`, paddingLeft: 8, marginLeft: -10 }}>
      {children}
      <p className="mt-1 flex items-center gap-1.5 text-caption leading-snug text-slate-500">
        <span className={cx('shrink-0 rounded px-1 py-px text-[10px] font-semibold ring-1', STATUS[status].cls)}>{STATUS[status].word}</span>
        <span className="min-w-0">{line}</span>
      </p>
    </div>
  );
}

function Group({ title, changed, children }: { title: string; changed?: number; children: ReactNode }) {
  return (
    <section className="border-t border-stone-200/80 pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-small font-bold uppercase tracking-wide text-violet-700">{title}</h3>
        {!!changed && <span className="text-caption font-medium text-violet-700">{changed} changed</span>}
      </div>
      <div className="space-y-3 pt-2">{children}</div>
    </section>
  );
}

function NumberField({ label, value, onChange, step = 1, min = 0 }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number }) {
  return (
    <label className="block min-w-0">
      <span className="text-caption text-slate-600">{label}</span>
      <input type="number" step={step} min={min} className={cx(FIELD, 'mt-0.5')} value={value} onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))} aria-label={label} />
    </label>
  );
}

/** The policies at the top, each one on/off: on sets the value shown, off puts the policy back to today's. */
const SIMPLE: { id: LeverId; label: string; on: Partial<Policies> }[] = [
  { id: 'houseLots', label: 'Up to 3 homes on house lots', on: { houseLots: 'three' } },
  { id: 'parking', label: 'No parking minimums', on: { parking: 'remove' } },
  { id: 'iz', label: 'Affordable set-aside citywide', on: { izWhere: 'citywide' } },
  { id: 'bonus', label: 'Height bonus for affordable homes', on: { bonus: 0.2 } },
  { id: 'subsidy', label: '$50k gap subsidy per affordable home', on: { subsidy: 50000 } },
  { id: 'frequentBus', label: 'Frequent bus on every line', on: { frequentBus: true } },
];
const backToToday = (id: LeverId) => Object.fromEntries(LEVER_KEYS[id].map((k) => [k, TODAY[k]])) as Partial<Policies>;

function SimpleSwitch({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-left text-small text-slate-900 hover:bg-stone-50">
      <span aria-hidden className={cx('relative inline-block h-4 w-7 shrink-0 rounded-full transition-colors', on ? 'bg-violet-600' : 'bg-stone-300')}>
        <span className="absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all" style={{ left: on ? 14 : 2 }} />
      </span>
      <span className={cx('min-w-0 flex-1', on && 'font-semibold')}>{label}</span>
    </button>
  );
}

const samePolicies = (s: Scenario, p: Partial<Policies>) => (Object.keys(TODAY) as (keyof Policies)[]).every((k) => s[k] === ({ ...TODAY, ...p } as Policies)[k]);

export default function LabLevers({ s, set }: { s: Scenario; set: (p: Partial<Scenario>) => void }) {
  const count = (ids: LeverId[]) => ids.filter((id) => moved(s, id)).length;
  const near = useMemo(() => {
    const ps = [...placeById.values()];
    return { all: ps.length, now: ps.filter((p) => (transitMiles(p, false) ?? Infinity) <= EXAMPLES.nearMi).length, bus: ps.filter((p) => (transitMiles(p, true) ?? Infinity) <= EXAMPLES.nearMi).length };
  }, []);
  const on = (id: LeverId) => moved(s, id);
  const setType = (t: TestType) => set({ type: t, units: TEST_TYPES[t].units, stories: TEST_TYPES[t].stories, devType: TEST_TYPES[t].devType });
  const [more, setMore] = useState(false);
  return (
    <div className="space-y-3">
      <section>
        <h3 className="text-small font-bold uppercase tracking-wide text-violet-700">Test building</h3>
        <div className="space-y-2 pt-2">
          <Segmented label="Type" options={TYPES} value={s.type} onChange={setType} text={(t) => TYPE_SHORT[t]} cols={4} tip={(t) => TYPE_TIP[t]} />
          <Segmented label="Financing" options={['market', 'affordable'] as const} value={s.devType} onChange={(v) => set({ devType: v })} text={(v) => (v === 'market' ? 'Market rate' : 'Tax credits (9%)')} cols={2} />
        </div>
      </section>
      <section className="border-t border-stone-200/80 pt-3">
        <h3 className="text-small font-bold uppercase tracking-wide text-violet-700">Policies</h3>
        <div className="mt-1">
          {SIMPLE.map((x) => (
            <SimpleSwitch key={x.id} label={x.label} on={on(x.id)} onChange={(v) => set(v ? { ...backToToday(x.id), ...x.on } : backToToday(x.id))} />
          ))}
        </div>
      </section>
      <button type="button" onClick={() => set({ ...TODAY })} disabled={(Object.keys(LEVER_KEYS) as LeverId[]).every((id) => !moved(s, id))} className="text-caption font-medium text-violet-700 hover:text-violet-800 disabled:opacity-50">
        Back to today’s rules
      </button>
      <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="flex w-full items-center justify-between border-t border-stone-200/80 pt-3 text-left text-small font-semibold text-slate-700 hover:text-slate-900">
        More options: packages, details, assumptions
        <ChevronDown className={cx('h-4 w-4 text-slate-500 transition-transform', more && 'rotate-180')} />
      </button>
      {more && (
      <div className="space-y-3">
      <section>
        <h3 className="text-small font-bold uppercase tracking-wide text-violet-700">Start from</h3>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {PACKAGES.map((p) => {
            const now = samePolicies(s, p.set);
            return (
              <button key={p.id} type="button" onClick={() => set({ ...TODAY, ...p.set, ...p.project })} aria-pressed={now} className="rounded-lg px-2 py-1.5 text-left transition-colors" style={{ background: now ? '#f5f3ff' : '#fff', boxShadow: `inset 0 0 0 1px ${now ? '#c4b5fd' : '#e7e5e4'}` }}>
                <span className="block text-small font-semibold text-slate-900">{p.label}</span>
                <span className="block text-caption leading-snug text-slate-600">{p.line}</span>
              </button>
            );
          })}
        </div>
      </section>

      <Group title="Test building size">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Units" value={s.units} min={2} onChange={(v) => set({ units: Math.max(2, Math.round(v)), type: typeFor(s.type, Math.max(2, Math.round(v))) })} />
          <NumberField label="Stories" value={s.stories} min={1} onChange={(v) => set({ stories: Math.max(1, Math.round(v)) })} />
        </div>
      </Group>

      <Group title="Zoning" changed={count(['houseLots', 'lots', 'parking'])}>
        <Lever on={on('houseLots')} status="idea" line="Today 1–3 homes, no ADUs">
          <Segmented label="Homes on house lots" options={['today', 'adu', 'three', 'four'] as HouseLots[]} value={s.houseLots} onChange={(v) => set({ houseLots: v })} text={(v) => ({ today: 'Today', adu: '+ ADU', three: 'Up to 3', four: 'Up to 4' })[v]} cols={4} info={INFO.houseLots} />
        </Lever>
        <Lever on={on('lots')} status="law" line="Smaller since May 2025">
          <Segmented label="Minimum lot sizes" options={['today', 'pre2025'] as const} value={s.lots} onChange={(v) => set({ lots: v })} text={(v) => (v === 'today' ? 'Today’s' : 'Before May 2025')} cols={2} info={INFO.lots} />
        </Lever>
        <Lever on={on('parking')} status="law" line="1 space a home (2+ homes)">
          <Segmented label="Parking minimums" options={['keep', 'transit', 'remove'] as Parking[]} value={s.parking} onChange={(v) => set({ parking: v })} text={(v) => ({ keep: 'Keep', transit: 'None near transit', remove: 'None' })[v]} cols={3} info={INFO.parking} />
        </Lever>
      </Group>

      <Group title="Affordable homes asked" changed={count(['iz', 'bonus'])}>
        <Lever on={on('iz')} status="law" line="10% at 50% AMI, 20+ units, IZ-O">
          <Segmented label="Inclusionary requirement" options={['off', 'izo', 'citywide'] as IzWhere[]} value={s.izWhere} onChange={(v) => set({ izWhere: v })} text={(v) => ({ off: 'Off', izo: 'IZ-O', citywide: 'Citywide' })[v]} cols={3} info={INFO.iz} />
          {s.izWhere !== 'off' && (
            <div className="space-y-2 pt-2">
              <label className="block">
                <span className="text-caption text-slate-600">
                  Set-aside: <b className="font-semibold text-slate-900 tnum">{Math.round(s.izShare * 100)}%</b> of homes
                </span>
                <input type="range" min={5} max={30} step={1} value={Math.round(s.izShare * 100)} onChange={(e) => set({ izShare: Number(e.target.value) / 100 })} className="w-full accent-violet-600" aria-label="Set-aside share" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="From units" value={s.izMin} min={1} onChange={(v) => set({ izMin: Math.max(1, Math.round(v)) })} />
                <label className="block min-w-0">
                  <span className="text-caption text-slate-600">At AMI</span>
                  <select className={cx(FIELD, 'mt-0.5')} value={s.izAmi} onChange={(e) => set({ izAmi: Number(e.target.value) as Ami })} aria-label="Set-aside income level">
                    {[30, 50, 60, 80].map((a) => (
                      <option key={a} value={a}>
                        {a}%
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}
        </Lever>
        <Lever on={on('bonus')} status="proposed" line="Height for homes at 50% AMI">
          <Segmented label="Height bonus" options={[0, 0.1, 0.15, 0.2]} value={s.bonus} onChange={(v) => set({ bonus: v })} text={(v) => (v ? `${Math.round(v * 100)}% +${({ 0.1: 30, 0.15: 60, 0.2: 90 } as Record<number, number>)[v]} ft` : 'Off')} cols={4} info={INFO.bonus} />
        </Lever>
      </Group>

      <Group title="Money" changed={count(['abatement', 'subsidy', 'plan'])}>
        <Lever on={on('abatement')} status="idea" line="Like LERTA; example amounts">
          <Segmented label="Tax abatement per home, yearly" options={ABATEMENTS} value={s.abatement} onChange={(v) => set({ abatement: v })} text={(v) => (v ? `$${n0(v)}` : 'Off')} cols={3} info={INFO.abatement} />
        </Lever>
        <Lever on={on('subsidy')} status="idea" line="Like the URA’s Housing Opportunity Fund">
          <Segmented label="Gap subsidy per affordable home" options={SUBSIDIES} value={s.subsidy} onChange={(v) => set({ subsidy: v })} text={(v) => (v ? `$${v / 1000}k` : 'None')} cols={4} info={INFO.subsidy} />
        </Lever>
        <Lever on={on('plan')} status="law" line="Tax credit projects only">
          <Segmented label="PHFA tax credit plan" options={['adopted', 'draft'] as const} value={s.plan} onChange={(v) => set({ plan: v })} text={(v) => (v === 'adopted' ? 'Adopted 25/26' : 'Draft 27/28')} cols={2} info={INFO.plan} />
        </Lever>
      </Group>

      <Group title="Transit" changed={count(['frequentBus'])}>
        <Lever on={on('frequentBus')} status="idea" line={`Tracts near frequent transit: ${near.now} → ${near.bus}`}>
          <Segmented label="Frequent bus on every line" options={['today', 'on'] as const} value={s.frequentBus ? 'on' : 'today'} onChange={(v) => set({ frequentBus: v === 'on' })} text={(v) => (v === 'on' ? 'Every 15 minutes' : 'Today')} cols={2} info={INFO.bus} />
        </Lever>
      </Group>

      <Group title="Where not to build" changed={count(['screens'])}>
        <Lever on={s.displacement} status="value" line="Skip market-only at high risk">
          <Segmented label="Displacement risk" options={['off', 'on'] as const} value={s.displacement ? 'on' : 'off'} onChange={(v) => set({ displacement: v === 'on' })} text={(v) => (v === 'on' ? 'Avoid market-only' : 'No screen')} cols={2} />
        </Lever>
        <Lever on={s.transitMi != null} status="value" line="Skip tracts far from transit">
          <Segmented label="Frequent transit within" options={['none', '0.5', '1'] as const} value={s.transitMi == null ? 'none' : (String(s.transitMi) as '0.5')} onChange={(v) => set({ transitMi: v === 'none' ? null : Number(v) })} text={(v) => (v === 'none' ? 'Any' : v === '0.5' ? '½ mile' : '1 mile')} cols={3} />
        </Lever>
        <Lever on={s.flood} status="value" line={`Skip tracts over ${EXAMPLES.floodPct}% in FEMA’s flood zone`}>
          <Segmented label="Flood zone" options={['off', 'on'] as const} value={s.flood ? 'on' : 'off'} onChange={(v) => set({ flood: v === 'on' })} text={(v) => (v === 'on' ? `Avoid over ${EXAMPLES.floodPct}%` : 'No screen')} cols={2} />
        </Lever>
      </Group>

      <Group title="Assumptions (examples)">
        <Segmented label="A project works at" options={[1.25, 1.5, 2]} value={s.bar} onChange={(v) => set({ bar: v })} text={(v) => `${v}× equity`} cols={3} info={INFO.bar} />
        <Segmented label="Building cost a sq ft" options={[250, 300, 350]} value={s.hardPerSf} onChange={(v) => set({ hardPerSf: v })} text={(v) => `$${v}`} cols={3} tip={(v) => (v === 300 ? 'The pencil’s example for new construction' : '')} />
        <Segmented label="Cost of a parking space" options={[5000, 15000, 30000]} value={s.parkingSpace} onChange={(v) => set({ parkingSpace: v })} text={(v) => ({ 5000: '$5k surface', 15000: '$15k mixed', 30000: '$30k garage' } as Record<number, string>)[v]} cols={3} />
      </Group>

      </div>
      )}
    </div>
  );
}
