// The project card of the Place page ("Test a project here", four questions) and its Compare places section, in Project Details & Sources: what they are (Overview), where their numbers
// come from (Data & method), their arithmetic (Calculations), their limits and what comes next. Loaded on demand in the
// online app only, like the cards themselves; figures are read from the same data files the cards use.
import type { ReactNode } from 'react';
import { DEMAND } from '../../lib/demand/data';
import { FAVORED_BY } from '../../lib/demand/order';
import { SIGNAL_LABEL, SIGNAL_MARGIN } from '../../lib/demand/signals';
import { DEFAULTS } from '../../lib/pencil/inputs';
import { TYPOLOGY_LABEL } from '../../lib/place/thresholds';
import type { Typology } from '../../lib/place/types';
import type { DetailsTab } from '../../lib/store';
import { CAPACITY, STANDARDS } from '../../lib/zoning/capacity';

const REPO = 'https://github.com/yezhanggg/Ye-Zhang-Vision-Pitts/blob/main/';
const doc = (path: string, label: string) => (
  <a href={REPO + path} target="_blank" rel="noreferrer" className="font-semibold text-violet-700 hover:underline">
    {label} →
  </a>
);
const usd = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;
const pts = (m: number) => `${Math.round(m * 100)} points`;

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-1.5 text-small text-slate-700">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="mb-1.5 text-small font-semibold text-slate-900">{title}</h4>
      {children}
    </section>
  );
}

const TILES = [
  { title: 'Who needs it', text: `Renter share, one-person, 65+ and large renter households in the tract and its ZIP code against the city (ACS ${DEMAND.acs}). Renter demand orders the suggested types and sets a unit mix, beside homes renting below what fits, a capture rate and the tax credit homes nearby.` },
  { title: 'What can be built', text: `Pittsburgh's zoning code, current through ${STANDARDS.current_through}, district by district: homes allowed by right on vacant lots and on lots holding fewer homes than allowed, the inclusionary housing overlay, and Try a lot: pick a district and a lot size to see the homes, height and building types allowed, the lot your project needs, and send the homes to the project.` },
  { title: 'Tax credit score', text: "Pennsylvania's selection criteria (PHFA), with the income-targeting, large-family and financing lines filled from the unit mix and the pencil, and the mix changes that would score." },
  { title: 'Does it pencil', text: "Sources and uses on your own numbers: tax credits under PHFA's caps (9%, or 4% with bonds) or a market-rate yield on cost, PHFA's gap tests and a sensitivity table. Example inputs are labeled as examples." },
];

function Overview() {
  return (
    <section>
      <h3 className="mb-1 text-body font-semibold text-slate-900">Test a project here</h3>
      <p className="mb-2 text-small text-slate-600">Added October 2026 for developers and planners. Place works at three levels, picked at the top of the left panel; each asks only for its own inputs, in numbered groups applied at once, and the right panel answers them in the same order. Parcel tests one project on one real county lot (picked by address or on the map; its area, use, zoning, rough shape and sun fill in): whether zoning allows the type and size you set, a simple capital stack with seven years of operations and a sale, the tax credit score, open space and sun. Tract and ZIP code take the same inputs and read the project on a lot of the size it needs in a district there that allows it. Every answer starts with a verdict and a review that re-runs as you type: zoning, height, overlays, the fit with the area's renters and the money, with fixes to apply and an optional AI second opinion that only reads the findings. Compare places reads the project in both places the same way. Equity & policy is a Policy lab: pick a test building and Pittsburgh's housing policies (zoning, inclusionary and its bonus, tax breaks, a frequent bus) and see, tract by tract, where zoning allows it, whether it pencils and what each policy adds. Online only: the offline file has no room for them.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {TILES.map((t) => (
          <div key={t.title} className="rounded-xl bg-violet-50/60 p-3 ring-1 ring-violet-100">
            <div className="text-small font-semibold text-slate-900">{t.title}</div>
            <div className="mt-0.5 text-small text-slate-700">{t.text}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Method() {
  const margins = (Object.entries(SIGNAL_MARGIN) as [keyof typeof SIGNAL_MARGIN, number][]).map(([k, m]) => `${SIGNAL_LABEL[k].toLowerCase()} ${pts(m)}`).join('; ');
  const examples = Object.values(DEFAULTS.inputs).filter((v) => v.kind === 'example').length;
  return (
    <section className="space-y-4">
      <div>
        <h3 className="mb-1 text-body font-semibold text-violet-800">The project card: data and method</h3>
        <p className="text-small text-slate-600">Facts and opinions are kept apart here too: every threshold below is a value judgment, printed on the card that uses it. The sources are in the table above.</p>
      </div>
      <Card title="Who needs it">
        <List
          items={[
            `ACS ${DEMAND.acs}: renter households by size (B25009), age of householder (B25007) and income (B25118, B25119); renter homes by bedrooms (B25042), rent (B25068) and building size (B25032). Change since ${DEMAND.growth_years[0] - 4}–${String(DEMAND.growth_years[0]).slice(2)} from the ACS history files: renter households, median rent, and the median income of all households.`,
            `A signal counts only past its mark from the city and beyond the tract's 90% margin of error (${margins}). The tract is read first, its ZIP code when the tract's margin is too wide.`,
            <>
              Which signals favor which type:{' '}
              {(Object.entries(FAVORED_BY) as [Typology, { key: keyof typeof SIGNAL_MARGIN; dir: string }[]][]).map(([t, ws], i) => (
                <span key={t}>
                  {i > 0 && '; '}
                  {TYPOLOGY_LABEL[t]}: {ws.map((w) => `${SIGNAL_LABEL[w.key].toLowerCase()} ${w.dir === 'up' ? 'above' : 'below'} the city`).join(' and ')}
                </span>
              ))}
              . More signals go first among the types the rules allow; then the household type CHAS counts most of; then the published Balanced weights.
            </>,
            `Tax credit homes: HUD's property database (${DEMAND.lihtc.properties ?? ''} Allegheny County properties), property fields only.`,
            <>{doc('docs/data/demand.md', 'Method: docs/data/demand.md')} · assumptions §15</>,
          ]}
        />
      </Card>
      <Card title="What can be built">
        <List
          items={[
            `${STANDARDS.code}, current through ${STANDARDS.current_through}, read ${STANDARDS.read_on}: ${STANDARDS.sources.map((s) => s.section).join('; ')}. Every computed district names its section; ${Object.keys(STANDARDS.not_computed).length} districts are listed as not computed, each with its reason.`,
            STANDARDS.density_note,
            STANDARDS.contextual_note,
            `${STANDARDS.adu.rule} ${STANDARDS.adu.checked}`,
            STANDARDS.inclusionary.rule,
            'Only tract totals are published: no lot, parcel number, owner or address.',
            <>{doc('docs/data/zoning_capacity.md', 'Method: docs/data/zoning_capacity.md')} · assumptions §16</>,
          ]}
        />
      </Card>
      <Card title="Tax credit score">
        <List
          items={[
            'Lines the plan answers: homes at or below 50% AMI (B.1, 4.3.1), homes for large families (B.4, 4.3.4.a; not at 7 or more stories), private capital and soft debt (D.4.b) and the developer fee reinvested (4.5.9). Each shows its arithmetic; a typed entry always wins.',
            'Hints only: fully funded (D.4.a) and mixed income (A.2.c, A.2.i), because they need documents.',
            <>{doc('docs/data/lihtc.md', 'Method: docs/data/lihtc.md')} · assumptions §12</>,
          ]}
        />
      </Card>
      <Card title="Does it pencil">
        <List
          items={[
            `Sourced: ${Object.values(DEFAULTS.sources).map((s) => s.title).join('; ')}.`,
            `${examples} inputs are examples (cost a square foot, soft cost, land, home sizes, vacancy, operating cost, reserves, loan terms, credit price, ineligible cost, soft funds, target yield) and are labeled so on the card. No public source gives them for a site.`,
            <>{doc('docs/data/pencil.md', 'Method: docs/data/pencil.md')} · assumptions §17</>,
          ]}
        />
      </Card>
      <Card title="Three ways to pay for it, and Find places for a project">
        <List
          items={[
            'The same project is tested at a range of sizes: about ten sizes, then each edge of the sizes that close is found exactly. Closes = the gap PHFA counts (soft funds not yet committed are gap) is under half the developer fee and cash flow stays at or above zero in years 1–10; over PHFA’s limit = covered only by deferring more than half the fee; market rate closes at the target yield.',
            "The range is the person's own, cut by the homes zoning allows by right and, for tax credits, by market depth: renter households at or below 60% AMI within a mile (CHAS; 60% interpolated across the 50–80% band), less HUD tax credit homes within that mile, × a 10% capture rate (an example; 5% and 15% beside it).",
            'Paths and places are ordered by a printed rule, never a composite number: closes, then over PHFA’s limit, then gap; then the smaller gap a home; then PHFA points. The person decides.',
            'PHFA points carry a range: low drops lines still to confirm (parcel, partners, team), high adds every point still open as a choice (design, financing). Chance of award is not modeled: PHFA does not publish past scores.',
            <>{doc('docs/data/finder.md', 'Method: docs/data/finder.md')} · assumptions §18</>,
          ]}
        />
      </Card>
    </section>
  );
}

function Calculations() {
  const a = CAPACITY.assumptions;
  const f = DEFAULTS.phfa.fee;
  return (
    <section className="space-y-3">
      <h3 className="text-body font-semibold text-slate-900">The project card: the arithmetic</h3>
      <List
        items={[
          'Share = part ÷ total; its margin of error by the ACS proportion formula. A signal: |share − city| at least the mark and greater than the margin.',
          'Unit mix: homes of a size = homes × the share of renter households of that size (1–2 people → 1-bedroom or smaller, 3–4 → 2-bedroom, 5+ → 3+), by largest remainders so the parts add up.',
          'Capture rate = homes with an income limit ÷ (qualifying renter households − tax credit homes already there).',
          `Homes by right: R1D and R1A 1, R2 2, R3 3 on a lot of at least the minimum size; RM and mixed-use districts: (frontage − side setbacks) × (depth − front − rear) × stories, held to coverage and FAR, × ${Math.round(a.efficiency * 100)}% ÷ ${a.home_sqft} sq ft a home.`,
          'Tax credit rent = MTSP income limit at 1.5 persons a bedroom × 30% ÷ 12, rounded down, − utility allowance, never above the market rent for the size.',
          'Net operating income = rent × 12 × (1 − vacancy) − homes × (operating cost + reserves). Loan = net operating income ÷ coverage ÷ mortgage constant.',
          `Developer fee = ${Math.round(f.first * 100)}% of the first ${usd(f.first_upto)} + ${Math.round(f.after * 100)}% after, on the lesser of cost and PHFA's basis limit, then the cap.`,
          'Credits a year = eligible basis × 1.3 in a QCT or DDA × applicable fraction × 9% or 4%, held to PHFA\'s per-project cap; equity = credits × 10 years × price.',
          "Gap = development cost − loan − equity − soft funds; PHFA's feasibility test: gap under 50% of the developer fee; fully funded (D.4.a): under 25%.",
          'Market rate: yield on cost = net operating income ÷ development cost; break-even rent = (target yield × cost + operating cost) ÷ (1 − vacancy) ÷ 12 ÷ homes; land value = net operating income ÷ target yield − (hard + soft cost).',
          'Market depth = (renters ≤ 50% AMI + ⅓ × renters at 50–80% AMI, in the city tracts within a mile − tax credit homes within the mile) × 10%.',
          'Right size = the largest size that closes within your range, cut by homes by right and market depth; what holds it: your range, zoning, market depth, PHFA\'s credit cap, or the gap.',
        ]}
      />
    </section>
  );
}

const LIMITS = [
  'Tract margins of error are wide; the ZIP code that stands in covers a larger area, sometimes with suburbs.',
  `Zoning is a reading of the code, not a zoning determination: contextual setbacks, compatibility standards, slopes, parking and variances are not modeled, so homes on vacant lots are an upper bound.`,
  'ADUs need an Accessory Dwelling Unit Overlay District and none is mapped; the cards flag this rather than hide the type.',
  'The tax credit sheet is a self-score; PHFA scores every application, and the 2027/2028 plan was still a draft. Chance of award is not modeled.',
  'Find places ranks tracts, then you pick a lot there; market depth counts city tracts only, so places at the city edge read low.',
  'The pencil is arithmetic on your inputs, not an underwriting: no construction loan, lease-up, multi-year pro forma, abatement or subsidy, and the example inputs are not facts about a site.',
  'QCT and DDA status come from the tract; the inclusionary overlay and the district are read at the lot, its frontage and depth from its rough rectangle (docs/data/parcel_level.md).',
];

const NEXT = [
  'Decide whether zoning should demote ADUs while no ADU overlay exists.',
  'Read a lot’s slope and its neighbors (assembling touching lots).',
  'A year-by-year operating pro forma and construction financing.',
  'Re-read the tax credit sheet when PHFA adopts the 2027/2028 plan.',
  'Map tint for Find places (no room in the offline file for it yet).',
];

export default function ProjectCardsDetails({ tab }: { tab: DetailsTab }) {
  if (tab === 'overview') return <Overview />;
  if (tab === 'sources') return <Method />;
  if (tab === 'calc') return <Calculations />;
  return (
    <Card title="Test a project here (Place page and Compare places)">
      <List items={tab === 'limits' ? LIMITS : NEXT} />
    </Card>
  );
}
