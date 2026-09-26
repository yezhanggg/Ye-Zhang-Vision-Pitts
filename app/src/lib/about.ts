// Text for the landing page's About and Limitations panels. Edit freely; nothing here feeds the scores.

export const ABOUT = {
  name: 'Ye Zhang',
  role: 'Builder of VisionPitts · solo entry, AI Horizons 2026 · AI for Housing Hackathon, Track 3',
  bio: [
    'I work at the intersection of urban spatial analytics and real estate, and I build decision tools for the people who decide what gets built: city planners, community development corporations and mission-driven developers.',
    'VisionPitts started from one question about Pittsburgh: after the city swapped mandatory inclusionary zoning for a voluntary bonus, where should the bonus be encouraged first so that new homes reach the lowest-income renters without pushing them out? Everything in the tool exists to make that trade-off legible: observed data on one side, value judgments on the other, and a map that is honest about what it does not know.',
    'Method, data pipeline, interface and documentation were written during the hackathon weekend, with Claude Code as a pair programmer. No model computes a score.',
  ],
  links: [
    { label: 'Source code and methods (GitHub)', url: 'https://github.com/yezhanggg/Ye-Zhang-Vision-Pitts' },
    { label: 'Track 3 brief', url: 'https://ai-horizons-2026-ai-for-housing-hackathon.brandon831577.chatgpt.site/challenges/typology-equity-climate.html' },
  ],
};

export const LIMITS: { title: string; items: string[] }[] = [
  {
    title: 'What the data cannot tell you yet',
    items: [
      'Eviction filings are apportioned from ZIP codes to tracts by housing units. They are an estimate, not a tract observation, and every use of them drops the confidence tag one level.',
      'HUD suppresses voucher counts where 10 or fewer households hold one (47 ranked tracts), so those tracts’ displacement score rests on fewer parts.',
      'Market change is direction only: the 2016 and 2021 market-type letters are not comparable one to one, and 20 city tracts have no classification at all (mostly non-residential land).',
      'Flood exposure comes from a terrain screening model (height above nearest drainage), not a FEMA floodplain; it ignores stormwater and flash flooding.',
      'Transit access measures the schedule, not reliability, and the 400 m buffer crosses tract lines, so small dense tracts score very high.',
      'Need counts households, not fit: student-heavy tracts rank high on the count and nothing adjusts for that.',
      'The city is the universe. Neighbors outside the city limits are not in the market-pressure computation, so edge tracts have fewer neighbors.',
      '3D buildings exist for the eight demo tracts only; guessed heights are drawn faded and counted in each tract’s data-limits panel.',
    ],
  },
  {
    title: 'What the tool does not claim to answer',
    items: [
      'Zoning and what is buildable by right, parcel availability and site feasibility.',
      'Infrastructure capacity, embodied carbon and vehicle miles travelled.',
      'Asking rents from listings, school quality, and access to jobs and services beyond transit frequency.',
      'The fit matrix and the presets are value judgments. Under Balanced weights senior housing ranks first in 40 of 114 tracts, largely because its fit row is short and strongly flood-averse. That is documented for review, not tuned to look better.',
    ],
  },
  {
    title: 'Future implementation',
    items: [
      'Hosted on Vercel with the Claude explanation service on, and a Supabase store so saved scenarios can be shared by link and revisited.',
      'Expand from the City of Pittsburgh to all 394 Allegheny County tracts, with municipality search.',
      'Zoning gate per tract from the City’s district layer: allowed by right, needs approval, not allowed, for each of the five types.',
      'HUD income limits so “≤50% AMI” reads as a dollar figure for a family of four; FEMA flood layer to validate the screening model.',
      'An access-to-opportunity factor (jobs, schools, everyday services) and policy toggles (density bonus, ADUs by right) as labeled value judgments with their own parity tests.',
      'Local spatial clusters of the recommendations, so a planner can see corridors rather than single tracts.',
    ],
  },
];
