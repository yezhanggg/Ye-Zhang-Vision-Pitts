// "Policies that apply here" on Analysis > Place (online): every rule, incentive and screen the left panel offers, with
// the document behind it and its status. Binding rules come from the place's data and cannot be switched off; funding
// and incentives change points or money; "your screens" are tests whose cut points no document sets, off by default.
// Sources checked 2026-10-20 (docs/assumptions.md §14, "Policy basis"). Loaded on demand, never in the offline file.

export type PolicyKind = 'binding' | 'funding' | 'screen';
export type PolicyStatus = 'adopted' | 'federal' | 'draft' | 'proposed' | 'study' | 'unverified' | 'assumption';
export type PolicyId =
  | 'izo'
  | 'fpo'
  | 'adu'
  | 'phfa'
  | 'qct'
  | 'perf'
  | 'phfa_draft'
  | 'ahb'
  | 'hof'
  | 'abatement'
  | 'parking'
  | 'plan'
  | 'displacement'
  | 'transit'
  | 'flood'
  | 'market';

export interface Policy {
  id: PolicyId;
  label: string;
  kind: PolicyKind;
  status: PolicyStatus;
  /** The document, as a short citation. */
  source: string;
  url?: string;
  /** What it requires or offers, in one sentence. */
  rule: string;
}

export const STATUS_WORD: Record<PolicyStatus, string> = {
  adopted: 'adopted',
  federal: 'federal',
  draft: 'draft',
  proposed: 'proposed',
  study: 'study',
  unverified: 'terms unverified',
  assumption: 'your assumption',
};

export const KIND_WORD: Record<PolicyKind, string> = { binding: 'Binding rules', funding: 'Funding and incentives', screen: 'Your screens' };

const CODE = 'https://ecode360.com/PI6865';

export const POLICIES: Policy[] = [
  {
    id: 'izo',
    label: 'Inclusionary overlay (IZ-O)',
    kind: 'binding',
    status: 'adopted',
    source: 'Pittsburgh Code §907.04.A',
    url: 'https://ecode360.com/45475368',
    rule: '20 or more new homes in the overlay: at least 10% (rounded up) at or below 50% AMI to rent, or 80% to own, for 35 years. A bill held in Council (2025-1545) would add a sunset clause.',
  },
  {
    id: 'fpo',
    label: 'Floodplain overlay (FP-O)',
    kind: 'binding',
    status: 'adopted',
    source: 'Pittsburgh Code §906.02',
    url: 'https://pittsburghpa.gov/Business-Development/Zoning/Plan-Reviews-and-Notices/Environmental-Review/Floodplain',
    rule: "Land in FEMA's 1%-a-year flood zone: a new building must be elevated or flood-proofed 18 inches above the base flood elevation. Read here from the tract's flood-zone land; the site itself needs a survey.",
  },
  {
    id: 'adu',
    label: 'ADU overlay',
    kind: 'binding',
    status: 'adopted',
    source: 'Pittsburgh Code §912.08',
    url: 'https://ecode360.com/45477942',
    rule: 'An accessory dwelling unit is allowed only inside an ADU overlay district. None is mapped on the City’s overlay layer (read 2026-10-15), so an ADU is not suggested anywhere.',
  },
  {
    id: 'phfa',
    label: 'PHFA tax credit plan 2025/2026',
    kind: 'funding',
    status: 'adopted',
    source: 'PHFA Qualified Allocation Plan 2025–2026',
    url: 'https://www.phfa.org/forms/multifamily_program_notices/qap/2025_and_2026/2025-2026-lihtc-qap.pdf',
    rule: 'Scores 9% tax credit applications (minimum 125); counted when the project uses credits. The score sheet is under Tax credit score, on the right.',
  },
  {
    id: 'qct',
    label: 'QCT / DDA basis boost',
    kind: 'funding',
    status: 'federal',
    source: 'Internal Revenue Code §42(d)(5)(B); HUD QCT and DDA lists',
    url: 'https://www.huduser.gov/portal/datasets/qct.html',
    rule: 'Tax credit projects in a Qualified Census Tract or Difficult Development Area get a 130% eligible basis. HUD’s 2027 lists (published 2026-10-06) apply to allocations and bond issues after 2026-12-31, unless HUD’s 730-day rule keeps an earlier list for a complete application; the pencil uses the 2027 list.',
  },
  {
    id: 'perf',
    label: 'Height bonus for affordable homes',
    kind: 'funding',
    status: 'adopted',
    source: 'Pittsburgh Code §915.07.D.4 (performance points)',
    url: CODE,
    rule: 'In RIV, UPR, UC-E, R-MU and UC-MU districts, affordable homes earn performance points; each point allows up to 15 ft more height.',
  },
  {
    id: 'phfa_draft',
    label: 'PHFA tax credit plan 2027/2028',
    kind: 'funding',
    status: 'draft',
    source: 'PHFA draft QAP 2027–2028 (board-approved draft, July 2026)',
    url: 'https://www.phfa.org/forms/multifamily_news/news/2026/2027-2028-draft-qap.pdf',
    rule: 'On by default: the next 9% round (applications due Feb 17, 2027) runs under this plan once PHFA adopts it. Sets the score sheet and the pencil’s credit caps, developer fees and pools. Switch it off to use the adopted 2025/2026 plan.',
  },
  {
    id: 'ahb',
    label: 'Affordable Housing Bonus (Bill 2025-1545)',
    kind: 'funding',
    status: 'proposed',
    source: 'City Council Bill 2025-1545 (June 2026 draft)',
    url: 'https://engage.pittsburghpa.gov/implementing-the-housing-needs-assessment/affordable-housing-bonus-program',
    rule: 'If adopted: 10–20% of homes at or below 50% AMI to rent (80% to own) for 20 years earn 2, 4 or 6 points, each up to 15 ft more height, in districts that allow 4+ unit buildings. The same bill would also sunset the IZ-O, amend performance points and remove minimum off-street parking. Held in Council (record last changed 2026-10-21).',
  },
  {
    id: 'hof',
    label: 'URA Housing Opportunity Fund',
    kind: 'funding',
    status: 'adopted',
    source: 'URA Housing Opportunity Fund, 2026 Annual Allocation Plan (approved Nov 2025)',
    url: 'https://www.ura.org/pages/hof',
    rule: 'Gap funding for affordable rental homes (Rental Gap program). Income targets vary by program; enter it under Pencil inputs as soft funds applied for or expected, and as committed once you hold an award letter.',
  },
  {
    id: 'abatement',
    label: 'Tax abatement (Act 42 / LERTA)',
    kind: 'funding',
    status: 'unverified',
    source: 'City of Pittsburgh residential abatement guidelines (combined programs since July 2020)',
    rule: 'Citywide abatements with extra incentives for affordable homes. Current residential terms are not verified here: check the City’s guidelines before counting any.',
  },
  {
    id: 'parking',
    label: 'Parking reduction near transit',
    kind: 'funding',
    status: 'unverified',
    source: 'Pittsburgh Code §914.07.G',
    url: CODE,
    rule: 'The code allows parking reductions for transit proximity. The percentages and distance are not verified here, and parking reform is in progress.',
  },
  {
    id: 'plan',
    label: 'Neighborhood plan',
    kind: 'funding',
    status: 'adopted',
    source: 'City of Pittsburgh Neighborhood Plan Guide (2020)',
    url: 'https://www.pittsburghpa.gov/Business-Development/City-Planning/Neighborhood-Planning/Neighborhood-Plan-Guide',
    rule: 'An adopted neighborhood plan becomes City policy for its area. Check whether one covers the site; the app does not map plan areas.',
  },
  {
    id: 'displacement',
    label: 'Displacement risk',
    kind: 'screen',
    status: 'study',
    source: 'Housing Needs Assessment, HR&A for the City (Jan 2022), a study, not adopted policy',
    url: 'https://pittsburghpa.gov/files/assets/city/v/1/dcp/documents/21887_pittsburgh_hna_final_report.pdf',
    rule: 'Where the displacement score is 0.67 or more, only homes added without demolition (2–4 unit conversions; new buildings only on vacant land), for households at or below 50% AMI. The 0.67 and 0.33 cut points are your assumption.',
  },
  {
    id: 'transit',
    label: 'Frequent transit within ½ mile',
    kind: 'screen',
    status: 'study',
    source: 'PHFA QAP transit points and the Housing Needs Assessment both use ½ mile',
    url: 'https://www.phfa.org/forms/multifamily_program_notices/qap/2025_and_2026/2025-2026-lihtc-qap.pdf',
    rule: 'The nearest stop with a bus or T every 15 minutes (64 weekday departures) is within ½ mile of where the average resident lives. The 64-departure mark is your assumption.',
  },
  {
    id: 'flood',
    label: 'Most flood-zone land',
    kind: 'screen',
    status: 'assumption',
    source: 'Your own limit; the binding rule is the floodplain overlay above',
    rule: "No suggestion where more of the tract's land than this sits in FEMA's 1%-a-year flood zone.",
  },
  {
    id: 'market',
    label: 'Market check',
    kind: 'screen',
    status: 'assumption',
    source: 'Your assumption: asking rents (Dewey) and Small Area Fair Market Rents (HUD)',
    rule: 'Always shown: whether listings ask more than the rent that fits at your income level. At market rate, no suggestion unless the 2-bedroom asking rent is at or above the Fair Market Rent and home values are at or above the city median.',
  },
];

export const POLICY_BY_ID = new Map(POLICIES.map((p) => [p.id, p]));

/** Districts where §915.07.D.4's affordable housing points apply (by code prefix). */
export const PERF_DISTRICTS = ['RIV', 'UPR', 'UC-E', 'UC-MU', 'R-MU'];
