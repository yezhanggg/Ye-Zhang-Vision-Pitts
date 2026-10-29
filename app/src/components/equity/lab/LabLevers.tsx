// The Policy lab's left panel: start from a package, set the test project, then the policies by the challenge's kinds
// (zoning, inclusionary housing and its bonus, tax breaks and funding, infrastructure), your values (the screens) and
// the assumptions. Each policy shows today's rule and its status (in force, proposed, idea to test); the (i) says how
// the lab uses it and where it comes from. A moved policy is marked with a violet edge. Online only.
import { useMemo, type ReactNode } from 'react';
import { cx } from '../../../lib/format';
import { placeById } from '../../../lib/place/data';
import { ABATEMENTS, EXAMPLES, LEVER_KEYS, moved, PACKAGES, SUBSIDIES, TEST_TYPES, TODAY, transitMiles, typeFor, type Ami, type HouseLots, type IzWhere, type LeverId, type Parking, type Policies, type Scenario, type TestType } from '../../../lib/policylab/lab';
import { Segmented } from '../../place/PlanInputs';
import { FIELD, n0, TYPE_SHORT, TYPE_TIP, YOURS } from './ui';

const TYPES = Object.keys(TEST_TYPES) as TestType[];

const INFO: Record<string, string> = {
  type: 'One building on paper, tested in every city tract with its asking rent (or HUD Small Area FMR) and its renters’ household sizes. Zoning is read from the tract’s lots: the districts whose use table allows the building, whose homes a lot hold it and whose height takes its stories.',
  houseLots: 'On lived-in house lots (R1D, R1A, R2, R3) at or above the minimum lot size. + ADU: an accessory unit beside a single home. Up to 3 or 4: each lot may hold that many homes, so a duplex, triplex or fourplex is allowed by right there. It counts zoning room, not homes that will be built. From county lots and assessments; §903.03, §911.02, §912.08.',
  lots: 'Bill 2025-1579 cut the minimums: 8,000 → 6,000, 5,000 → 3,000, 3,200 → 2,400, 1,800 → 1,200 sq ft (very low to high density). The old very-high figure is not published; 1,200 is an assumption. Changes the homes allowed by right on vacant and house lots.',
  parking: 'Each required space adds the parking cost (Assumptions) to the project. None near transit: no minimum within ½ mile of frequent transit (an idea to test). Townhomes need none; senior housing needs a parking study, not costed.',
  iz: 'Market-rate test projects of the minimum size or more rent that share of their homes at 30% of the income limit (HUD FY2026), less utilities, from the largest size first. Tracts more than half inside the IZ-O count as IZ-O.',
  bonus: '10, 15 or 20% of homes at 50% AMI earn 2, 4 or 6 performance points, 15 ft of height a point. The lab adds 10-ft floors and units in proportion; the developer takes it only where the taller building does better. An upper bound: the lot and the market must carry the height. Offered from the requirement’s minimum size (an assumption).',
  abatement: 'Property tax off the operating cost every year, for every home in the test project.',
  subsidy: 'Enters the capital stack as other subsidy: the amount times the homes with an income limit.',
  plan: 'PHFA’s Qualified Allocation Plan sets the most 9% credits a project may get.',
  bus: 'Every route runs at least every 15 minutes, so a tract’s nearest stop counts as frequent (GTFS stops). It changes parking near transit, the transit screen and the climate count. Rents and land prices stay as they are: the lab does not model how the market responds.',
  bar: 'The developer’s money back over a 7-year hold, sale included, divided by the equity it put in. 1.5× is a common bar, not a rule. A project needing no equity works when its income covers the loan. Tax credit projects have no sale: they work when no gap is left and cash flow stays above zero for 15 years.',
};

/** A policy: its control, then today's rule and status. A violet edge marks one moved from today. */
function Lever({ on, line, children }: { on: boolean; line: ReactNode; children: ReactNode }) {
  return (
    <div style={{ borderLeft: `2px solid ${on ? YOURS : 'transparent'}`, paddingLeft: 8, marginLeft: -10 }}>
      {children}
      <p className="mt-1 text-caption leading-snug text-slate-500">{line}</p>
    </div>
  );
}

function Group({ title, line, changed, children }: { title: string; line: string; changed?: number; children: ReactNode }) {
  return (
    <section className="border-t border-stone-200/80 pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-small font-bold uppercase tracking-wide text-violet-700">{title}</h3>
        {!!changed && <span className="text-caption font-medium text-violet-700">{changed} changed</span>}
      </div>
      <p className="text-caption leading-snug text-slate-500">{line}</p>
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

const samePolicies = (s: Scenario, p: Partial<Policies>) => (Object.keys(TODAY) as (keyof Policies)[]).every((k) => s[k] === ({ ...TODAY, ...p } as Policies)[k]);

export default function LabLevers({ s, set }: { s: Scenario; set: (p: Partial<Scenario>) => void }) {
  const count = (ids: LeverId[]) => ids.filter((id) => moved(s, id)).length;
  const near = useMemo(() => {
    const ps = [...placeById.values()];
    return { all: ps.length, now: ps.filter((p) => (transitMiles(p, false) ?? Infinity) <= EXAMPLES.nearMi).length, bus: ps.filter((p) => (transitMiles(p, true) ?? Infinity) <= EXAMPLES.nearMi).length };
  }, []);
  const on = (id: LeverId) => moved(s, id);
  const setType = (t: TestType) => set({ type: t, units: TEST_TYPES[t].units, stories: TEST_TYPES[t].stories, devType: TEST_TYPES[t].devType });
  return (
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

      <Group title="Test project" line="One building, tested in every city tract.">
        <Segmented label="Type" options={TYPES} value={s.type} onChange={setType} text={(t) => TYPE_SHORT[t]} cols={4} tip={(t) => TYPE_TIP[t]} info={INFO.type} />
        <Segmented label="Financing" options={['market', 'affordable'] as const} value={s.devType} onChange={(v) => set({ devType: v })} text={(v) => (v === 'market' ? 'Market rate' : 'Affordable (9% credits)')} cols={2} tip={(v) => (v === 'affordable' ? `Every home at ${EXAMPLES.creditAmi}% AMI, with 9% tax credits` : 'Every home at the tract’s asking rent, less any set-aside')} />
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Units" value={s.units} min={2} onChange={(v) => set({ units: Math.max(2, Math.round(v)), type: typeFor(s.type, Math.max(2, Math.round(v))) })} />
          <NumberField label="Stories" value={s.stories} min={1} onChange={(v) => set({ stories: Math.max(1, Math.round(v)) })} />
        </div>
      </Group>

      <Group title="Zoning" line="What the code lets you build by right, and what it asks for." changed={count(['houseLots', 'lots', 'parking'])}>
        <Lever on={on('houseLots')} line="Idea to test. Today a house lot holds 1 (R1), 2 (R2) or 3 (R3) homes, and ADUs are allowed nowhere (no ADU overlay is mapped).">
          <Segmented label="More homes on house lots" options={['today', 'adu', 'three', 'four'] as HouseLots[]} value={s.houseLots} onChange={(v) => set({ houseLots: v })} text={(v) => ({ today: 'Today', adu: '+ ADU', three: 'Up to 3', four: 'Up to 4' })[v]} cols={4} info={INFO.houseLots} />
        </Lever>
        <Lever on={on('lots')} line="In force since May 2025 (Bill 2025-1579). Before, lots had to be larger.">
          <Segmented label="Minimum lot sizes" options={['today', 'pre2025'] as const} value={s.lots} onChange={(v) => set({ lots: v })} text={(v) => (v === 'today' ? 'Today’s' : 'Before May 2025')} cols={2} info={INFO.lots} />
        </Lever>
        <Lever on={on('parking')} line="In force: 1 space a home for 2 or more homes (§914.02). Removing them citywide was proposed in 2024–25.">
          <Segmented label="Parking minimums" options={['keep', 'transit', 'remove'] as Parking[]} value={s.parking} onChange={(v) => set({ parking: v })} text={(v) => ({ keep: 'Keep', transit: 'None near transit', remove: 'None' })[v]} cols={3} info={INFO.parking} />
        </Lever>
      </Group>

      <Group title="Inclusionary and bonus" line="Affordable homes asked of market-rate buildings: required, or rewarded with height." changed={count(['iz', 'bonus'])}>
        <Lever on={on('iz')} line="In force in the IZ-O (Lawrenceville, Bloomfield, Polish Hill, Oakland): 10% of homes at 50% AMI from 20 units (§907.04.A).">
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
        <Lever on={on('bonus')} line="Proposed (Bill 2025-1545): where no set-aside is required, affordable homes at 50% AMI earn extra height. Taken only where it pays.">
          <Segmented label="Affordable-housing bonus" options={[0, 0.1, 0.15, 0.2]} value={s.bonus} onChange={(v) => set({ bonus: v })} text={(v) => (v ? `${Math.round(v * 100)}%: +${({ 0.1: 30, 0.15: 60, 0.2: 90 } as Record<number, number>)[v]} ft` : 'Off')} cols={4} info={INFO.bonus} />
        </Lever>
      </Group>

      <Group title="Tax breaks and funding" line="Money that lowers the cost or fills the gap." changed={count(['abatement', 'subsidy', 'plan'])}>
        <Lever on={on('abatement')} line="Idea to test, like Pittsburgh’s LERTA abatements. The amounts are examples.">
          <Segmented label="Tax abatement, a home a year" options={ABATEMENTS} value={s.abatement} onChange={(v) => set({ abatement: v })} text={(v) => (v ? `$${n0(v)}` : 'Off')} cols={3} info={INFO.abatement} />
        </Lever>
        <Lever on={on('subsidy')} line="Idea to test: public gap money (like the URA’s Housing Opportunity Fund) for each home with an income limit.">
          <Segmented label="Gap subsidy, a home with an income limit" options={SUBSIDIES} value={s.subsidy} onChange={(v) => set({ subsidy: v })} text={(v) => (v ? `$${v / 1000}k` : 'None')} cols={4} info={INFO.subsidy} />
        </Lever>
        <Lever on={on('plan')} line="In force: the adopted plan. Matters only for tax credit projects.">
          <Segmented label="PHFA tax credit plan" options={['adopted', 'draft'] as const} value={s.plan} onChange={(v) => set({ plan: v })} text={(v) => (v === 'adopted' ? 'Adopted 2025/26' : 'Draft 2027/28')} cols={2} info={INFO.plan} />
        </Lever>
      </Group>

      <Group title="Infrastructure" line="Public investment that changes where building makes sense." changed={count(['frequentBus'])}>
        <Lever on={on('frequentBus')} line={`Idea to test. Today ${near.now} of ${near.all} tracts are within ½ mile of frequent transit; with it, ${near.bus}.`}>
          <Segmented label="Frequent bus on every line" options={['today', 'on'] as const} value={s.frequentBus ? 'on' : 'today'} onChange={(v) => set({ frequentBus: v === 'on' })} text={(v) => (v === 'on' ? 'Every 15 minutes' : 'Today')} cols={2} info={INFO.bus} />
        </Lever>
      </Group>

      <Group title="Your values" line="Where you would not build. Choices, not data; none apply today." changed={count(['screens'])}>
        <Lever on={s.displacement} line="Leaves out market-rate projects with no income-limited homes in tracts at high displacement risk.">
          <Segmented label="Displacement risk" options={['off', 'on'] as const} value={s.displacement ? 'on' : 'off'} onChange={(v) => set({ displacement: v === 'on' })} text={(v) => (v === 'on' ? 'Avoid market-only' : 'No screen')} cols={2} />
        </Lever>
        <Lever on={s.transitMi != null} line="Leaves out tracts farther from frequent transit.">
          <Segmented label="Frequent transit within" options={['none', '0.5', '1'] as const} value={s.transitMi == null ? 'none' : (String(s.transitMi) as '0.5')} onChange={(v) => set({ transitMi: v === 'none' ? null : Number(v) })} text={(v) => (v === 'none' ? 'Any' : v === '0.5' ? '½ mile' : '1 mile')} cols={3} />
        </Lever>
        <Lever on={s.flood} line={`Leaves out tracts with over ${EXAMPLES.floodPct}% of their land in FEMA’s 1%-a-year flood zone.`}>
          <Segmented label="Flood zone" options={['off', 'on'] as const} value={s.flood ? 'on' : 'off'} onChange={(v) => set({ flood: v === 'on' })} text={(v) => (v === 'on' ? `Avoid over ${EXAMPLES.floodPct}%` : 'No screen')} cols={2} />
        </Lever>
      </Group>

      <Group title="Assumptions" line="Examples, not data. They apply to today’s rules and to yours alike.">
        <Segmented label="A project works at" options={[1.25, 1.5, 2]} value={s.bar} onChange={(v) => set({ bar: v })} text={(v) => `${v}× equity`} cols={3} info={INFO.bar} />
        <Segmented label="Building cost a sq ft" options={[250, 300, 350]} value={s.hardPerSf} onChange={(v) => set({ hardPerSf: v })} text={(v) => `$${v}`} cols={3} tip={(v) => (v === 300 ? 'The pencil’s example for new construction' : '')} />
        <Segmented label="Cost of a parking space" options={[5000, 15000, 30000]} value={s.parkingSpace} onChange={(v) => set({ parkingSpace: v })} text={(v) => ({ 5000: '$5k surface', 15000: '$15k mixed', 30000: '$30k garage' } as Record<number, string>)[v]} cols={3} />
      </Group>

      <button type="button" onClick={() => set({ ...TODAY })} disabled={(Object.keys(LEVER_KEYS) as LeverId[]).every((id) => !moved(s, id))} className="text-caption font-medium text-violet-700 hover:text-violet-800">
        Back to today’s rules
      </button>
    </div>
  );
}
