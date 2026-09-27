// Plain-language copy in one place so wording stays consistent and jargon stays out of the interface.
// Facts follow docs/data/factor_methods.md and config/scoring.json.

export interface FactorCopy {
  name: string;
  meaning: string;
  high: string;
  low: string;
  more: string;
  how: string;
}

export const FACTOR_COPY: Record<string, FactorCopy> = {
  need: {
    name: 'Affordability need',
    meaning: 'How many renter households here earn half the area median income or less.',
    high: 'many low-income renters',
    low: 'few low-income renters',
    more: 'more low-income renters',
    how: 'Counts renter households earning at most 50% of the area median income (HUD CHAS 2018–22). Tracts are ranked against every residential tract in the city, so 0.9 means more need than 90% of Pittsburgh tracts.',
  },
  market_strength: {
    name: 'Market strength',
    meaning: 'How strong the local housing market is: prices, vacancy, investment.',
    high: 'a strong housing market',
    low: 'a weaker housing market',
    more: 'a stronger housing market',
    how: 'Uses the Reinvestment Fund Market Value Analysis (2021): each market-type letter becomes a score from strongest (A) to weakest. A small part reflects whether the market got stronger or weaker since 2016. Tracts are then ranked city-wide.',
  },
  displacement_risk: {
    name: 'Displacement risk',
    meaning: 'How likely current residents are to be pushed out if costs rise.',
    high: 'high displacement risk',
    low: 'low displacement risk',
    more: 'higher displacement risk',
    how: 'Averages four ranked measures: CDC social vulnerability (30%), the share of low-income renters paying more than 30% of income on rent (30%), eviction filings per renter household (20%, spread from ZIP codes) and housing vouchers per renter (20%). Missing parts are skipped and the rest re-weighted.',
  },
  subsidy_eligible: {
    name: 'Subsidy eligibility',
    meaning: 'Whether federal or city programs can help pay for affordable homes here.',
    high: 'subsidy eligibility',
    low: 'no subsidy designation',
    more: 'subsidy eligibility',
    how: 'Yes if the tract is a low-income tax-credit area (QCT), a high-cost area (DDA), an Opportunity Zone, or a City of Pittsburgh community-development area (CDBG).',
  },
  transit_access: {
    name: 'Transit access',
    meaning: 'How often buses and the T leave from stops near here on a weekday.',
    high: 'frequent transit',
    low: 'little transit service',
    more: 'more frequent transit',
    how: 'Counts weekday departures from Pittsburgh Regional Transit stops within 400 m (about a quarter mile), divided by the tract’s land area, then ranks tracts city-wide. It measures the schedule, not reliability. Small dense tracts score very high.',
  },
  flood_exposure: {
    name: 'Flood exposure',
    meaning: 'How much of the land sits in low ground that could flood.',
    high: 'a lot of flood-prone land',
    low: 'little flood-prone land',
    more: 'more flood-prone land',
    how: 'Share of tract land inside a terrain-based flood screening model (height above the nearest drainage). It is not a FEMA floodplain and ignores stormwater, so check before citing.',
  },
};

export const factorName = (id: string, fallback?: string) => FACTOR_COPY[id]?.name ?? fallback ?? id;

export const GLOSSARY = {
  MVA: 'Housing market type (Reinvestment Fund)',
  SVI: 'Social vulnerability (CDC)',
  QCT: 'Low-income tax-credit area',
  DDA: 'High-cost development area (HUD)',
  OZ: 'Opportunity Zone',
  CDBG: 'City community-development area',
  AMI: '≤50% of area median income',
  HCV: 'Housing vouchers',
  CHAS: 'HUD income and housing-cost data',
  ETS: 'Eviction Lab filings tracker',
} as const;

export const PRESET_COPY: Record<string, string> = {
  balanced: 'Every factor counts the same.',
  anti_displacement: 'Protect current residents first.',
  market_led: 'Build where the market is strong.',
  transit_first: 'Put new homes near frequent transit.',
};

// ------------------------------------------------------------------ weights
export function weightWord(w: number): string {
  if (w <= 0.001) return 'Not a factor';
  if (w <= 0.5) return 'A little';
  if (w <= 1) return 'Some';
  if (w <= 2) return 'Important';
  return 'Top priority';
}

export function shareWords(share: number): string {
  if (share <= 0.001) return 'not counted';
  if (share >= 0.95) return 'the whole decision';
  if (share < 0.075) return 'a small part of the decision';
  const cands: [number, string][] = [
    [1 / 10, '1/10'], [1 / 8, '1/8'], [1 / 6, '1/6'], [1 / 5, '1/5'], [1 / 4, '1/4'], [1 / 3, '1/3'],
    [2 / 5, '2/5'], [1 / 2, '1/2'], [3 / 5, '3/5'], [2 / 3, '2/3'], [3 / 4, '3/4'],
  ];
  let best = cands[0];
  for (const c of cands) if (Math.abs(c[0] - share) < Math.abs(best[0] - share)) best = c;
  return `about ${best[1]} of the decision`;
}

// ------------------------------------------------------------------ stability
export type StabilityTone = 'solid' | 'likely' | 'close';
export function stabilityWords(share: number) {
  const n = Math.max(0, Math.min(10, Math.round(share * 10)));
  const tone: StabilityTone = n >= 8 ? 'solid' : n >= 6 ? 'likely' : 'close';
  const label = tone === 'solid' ? 'Solid pick' : tone === 'likely' ? 'Likely pick' : 'Close call';
  return { n, tone, label };
}
export const STABILITY_HOW =
  'We nudge your priority settings at random 200 times (small shifts in every direction) and re-score the tract each time. The count shows how often the same housing type stays on top. A “close call” means a small change in priorities could change the answer.';

// ------------------------------------------------------------------ scores and percentiles
export const matchText = (score: number | null | undefined) => (score == null ? 'No score' : `${Math.round(score * 100)} / 100 match`);

export function percentilePhrase(x: number | null | undefined): string {
  if (x == null || !Number.isFinite(x)) return 'No data';
  const n = Math.max(0, Math.min(99, Math.round(x * 100)));
  if (n <= 1) return 'Among the lowest in the city';
  return `Higher than ${n}% of city tracts`;
}
export const pctShort = (x: number | null | undefined) => (x == null || !Number.isFinite(x) ? '—' : `higher than ${Math.max(0, Math.min(99, Math.round(x * 100)))}%`);

export const SCORE_HOW =
  'Each housing type has a fit rule for every factor: for example, small apartments fit places with frequent transit, townhomes fit strong markets. The match score is the weighted average of those fits, using your priorities as the weights. 100 means the tract matches the type’s ideal on every factor you care about. The fit rules are a value judgment and are listed under Sources.';

export const PRESSURE_HOW =
  'Market pressure compares a tract’s housing-market strength with the average of its neighbors (tracts that share a border). Positive means the neighbors are stronger, so price pressure can spill in. The watch list is tracts in the top third for need whose own market has been rising since 2016. Neither enters the score; they are a lens for reading it.';

// ------------------------------------------------------------------ asking rents (information layer)
export const RENT_HOW =
  'Median asking rent for 2-bedroom listings scraped from rental platforms (Dewey Data), counted once per unit per month and pooled over 2025–26. Growth compares 2019–20 with 2025–26 for units in buildings that were already listed before 2019, so a new luxury building cannot read as repricing; the all-listings growth is kept as a second figure. Anything with fewer than 20 distinct units is hidden. Asking rents skew market-rate: subsidized and long-tenure units are absent. Information only; nothing here enters the score.';
export const RENT_CAVEAT = 'Licensed listing data (Dewey), market-rate skew. Information only, not scored.';
export const RENT_WHY_INFO =
  'Why information only: existing-stock rent growth has no positive relation to the market signals the score uses (Spearman 0.03 with market strength, −0.31 with the 2016→2021 market change), it exists for only a minority of ranked tracts because the 2019–20 scrape is thin, and the source is licensed, so scored factors stay public-data only.';

// ------------------------------------------------------------------ UI strings
export const UI = {
  searchPlaceholder: 'Search an address, neighborhood or tract',
  bestMatch: 'Best match here',
  howTypesCompare: 'How the 5 types compare',
  aboutPlace: 'About this place',
  pressure: 'Market pressure',
  dataBehind: 'The data behind it',
  dataLimits: 'Data limits',
  whyAuto: 'Why this ranking · written automatically from the scores',
  whyAI: (who: string) => `Why this ranking · written by ${who} from the scores, every number checked`,
  whatMatters: 'What matters most?',
  fineTune: 'Fine-tune',
  colorBy: 'Color the map by',
  saveCompare: 'Save & compare',
  howCalc: 'How this is calculated',
  outsideCity: 'That address is outside the City of Pittsburgh.',
  buildingsLegend: '3D buildings: solid = height from records · faded = height guessed',
  terrainTip: '3D hills and elevation lines',
  notRanked: 'Fewer than 25 households live here (park, river, campus or stadium land), so this tract is shown but not ranked.',
  rentLayer: 'Asking-rent growth, existing stock',
  rentLayerSub: 'Median 2BR asking rent, 2019–20 → 2025–26, buildings listed before 2019 · Dewey listings, information only',  // sections and the Analysis sub-tab bar
  explore: 'Explore',
  analysis: 'Analysis',
  matchTab: 'Match',
  compareTractsTab: 'Compare tracts',
  compareScenariosTab: 'Compare scenarios',
  copyLink: 'Copy link',
  linkCopied: 'Link copied ✓',
  aboutTitle: 'About VisionPitts',
  home: 'Home',
  homeTitle: 'Back to the start page',
  analysisCaption: 'Housing typology matchmaker · value judgments are labeled',
  // floating panels
  panels: 'Panels',
  panelsSub: 'Show or hide',
  leftPanel: 'Left panel',
  summaryPanel: 'Summary panel',
  resetLayout: 'Reset layout',
  hidePanel: 'Hide panel',
  showPanel: 'Show panel',
  hideSummary: 'Hide summary',
  showSummary: 'Show summary',
  summaryTab: 'Summary',
};

export function directionWord(d: string | null | undefined): string {
  return d === 'rising' ? 'getting stronger' : d === 'falling' ? 'getting weaker' : d === 'flat' ? 'about the same' : 'unknown';
}
