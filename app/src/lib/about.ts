// Text for the Details window (the project: what it holds, its limits, what comes next) and the About window
// (the author). Edit freely; nothing here feeds the scores.

/** The project in a couple of lines, and what it holds. Shown under Details (and, in two lines, at the foot of About). */
export const PROJECT = {
  name: 'VisionPitts',
  tagline: 'Great decisions need vision. We give you one.',
  lines: [
    'VisionPitts is a housing map of Pittsburgh and Allegheny County. Explore shows census figures for any tract, block group, ZIP code or municipality; Analysis matches five housing types to each city tract and says why.',
    'It was built for the AI Horizons 2026 AI for Housing Hackathon (Track 3: housing typology, equity and climate). Observed data and value judgments are kept apart and labeled, and no model computes a score.',
  ],
  has: [
    { title: 'Explore', text: '37 census variables for 2020–2024 with a 2014–2024 history, for city and county tracts, block groups, ZIP codes and 129 municipalities, plus the Analysis layers for city tracts.' },
    { title: 'Analysis', text: 'A matchmaker that ranks five housing types for each of the 128 city tracts from six public-data factors and the priorities you set, with a side-by-side view of two places or two sets of priorities.' },
    { title: 'Search and questions', text: 'One box finds a place or answers a question about it from the tool’s own figures. Searching is free; only questions go to the language model.' },
    { title: 'Open and portable', text: 'Every view is a link, the whole tool also runs as a single offline file, and the code and methods are public.' },
  ],
  links: [
    { label: 'Source code and methods (GitHub)', url: 'https://github.com/yezhanggg/Ye-Zhang-Vision-Pitts' },
    { label: 'Track 3 brief', url: 'https://ai-horizons-2026-ai-for-housing-hackathon.brandon831577.chatgpt.site/challenges/typology-equity-climate.html' },
  ],
  credits: '© 2026 Ye Zhang · AI Horizons 2026 · Track 3',
};

/** The person behind it. Facts as stated on the author's LinkedIn profile (read 2026-09-27). */
export const ABOUT = {
  name: 'Ye Zhang',
  headline: 'Real estate acquisitions · urban spatial analytics · AI and software development',
  place: 'University of Pennsylvania · Greater Philadelphia',
  summary: [
    'I am a dual master’s candidate at the University of Pennsylvania’s Weitzman School of Design, in City Planning and Urban Spatial Analytics, and a member of the Wharton Zell/Lurie Real Estate Center community.',
    'I work where real estate investment, spatial data and AI meet. On the investment side I underwrite multifamily acquisitions and build submarket research from Census, HUD and GIS data. On the build side I design and ship software products end to end: interface, logic and deployment.',
    'VisionPitts is a solo entry. I wrote the method, the data pipeline, the interface and the documentation during the hackathon weekend, with Claude Code as a pair programmer.',
  ],
  education: [
    { school: 'University of Pennsylvania, Weitzman School of Design', what: 'Master of City Planning and Master of Urban Spatial Analytics', when: '2025 – 2027' },
    { school: 'The Wharton School', what: 'Real Estate Design and Development Certificate', when: '2025 – 2027' },
    { school: 'University of Southern California', what: 'B.S. in Urban Studies and Planning, magna cum laude. Minors in Real Estate Development, Environmental Studies and Communication Design. USC Renaissance Scholar Prize.', when: '2021 – 2025' },
    { school: 'Harvard University Graduate School of Design', what: 'DDV 2024: integrated program in architecture, urban design and landscape architecture', when: '2024' },
  ],
  experience: [
    { role: 'Acquisition Analyst (intern)', org: 'Deepblue Capital Partners', when: '2024 – present', text: 'Underwrites multifamily acquisitions in the Dallas–Fort Worth and Houston markets, leads submarket research from CoStar, Census, HUD and GIS data, and built an AI-powered platform that automates the underwriting process.' },
    { role: 'Commercial Real Estate Analyst (intern)', org: 'Cushman & Wakefield', when: '2024', text: 'Financial modeling, market research and due diligence for commercial real estate projects in Beijing.' },
    { role: 'Research Assistant', org: 'USC Sol Price School of Public Policy', when: '2024', text: 'Climate and energy-market research: long-run temperature, wind, radiation and precipitation data, difference-in-differences and regression models.' },
    { role: 'City Planning Intern', org: 'Tsinghua University', when: '2024', text: 'Spatial and economic analysis for a regional urban plan, combining ArcGIS data with transport studies.' },
  ],
  contact: {
    email: 'yezhang1@upenn.edu',
    linkedin: { label: 'linkedin.com/in/yezhang03', url: 'https://www.linkedin.com/in/yezhang03' },
  },
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
      'School quality, and access to jobs and services beyond transit frequency. Asking rents from listings are shown as information (licensed Dewey aggregates) and never scored.',
      'The fit matrix and the presets are value judgments. Under Balanced weights senior housing ranks first in 40 of 114 tracts, largely because its fit row is short and strongly flood-averse. That is documented for review, not tuned to look better.',
    ],
  },
];

/** What comes next: planned work and improvements. */
export const NEXT: { title: string; items: string[] }[] = [
  {
    title: 'Future implementation',
    items: [
      'Hosted on Vercel with the AI explanation service on, and a Supabase store so saved scenarios can be shared by link and revisited.',
      'Score all 394 Allegheny County tracts, not only the 128 city tracts (Explore already browses every municipality, county tract and ZIP code).',
      'Zoning gate per tract from the City’s district layer: allowed by right, needs approval, not allowed, for each of the five types.',
      'HUD income limits so “≤50% AMI” reads as a dollar figure for a family of four; FEMA flood layer to validate the screening model.',
      'An access-to-opportunity factor (jobs, schools, everyday services) and policy toggles (density bonus, ADUs by right) as labeled value judgments with their own parity tests.',
      'Local spatial clusters of the recommendations, so a planner can see corridors rather than single tracts.',
    ],
  },
  {
    title: 'Improvements to what is here',
    items: [
      'Margins of error and reliability tags back as an optional layer in Explore, for readers who want them.',
      'Answers in the question box that point to the figure they quote, and questions that compare two selected places.',
      'A climate factor beyond flood screening, using the tree-cover data already collected for every tract.',
      'An editable fit matrix in the interface, so a reviewer can test a different value judgment without touching the config file.',
    ],
  },
];
