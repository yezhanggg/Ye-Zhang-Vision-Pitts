// Text for the Details window (the project: what it holds, its limits, what comes next) and the About window
// (the author). Edit freely; nothing here feeds the scores.

/** The project in a couple of lines, and what it holds. Shown under Details (and, in two lines, at the foot of About). */
export const PROJECT = {
  name: 'VisionPitts',
  tagline: 'Great decisions need vision. We give you one.',
  lines: [
    'VisionPitts is a free map about housing in Pittsburgh and Allegheny County. It shows who lives in each neighborhood and what they pay for housing, and suggests which kinds of new homes could help renters with low incomes without pushing them out.',
    'It was built in one weekend for the AI Horizons 2026 AI for Housing Hackathon. Facts and opinions are kept apart and labeled, and no AI decides anything: the scores come from simple, published math.',
  ],
  has: [
    { title: 'Explore', text: 'Look around freely. Color the map by rent, income, land use, zoning and 30 more figures, for neighborhoods, ZIP codes or the 129 towns around the city, and see how things changed since 2014.' },
    { title: 'Analysis', text: 'For 114 ranked of 128 city tracts, see which of five housing types fits best from eight public-data factors and what you care about most, and compare two places side by side.' },
    { title: 'Search and questions', text: 'Type a place to find it, or ask a question in plain words. Answers use only the tool’s own numbers, and every number is checked.' },
    { title: 'Easy to share', text: 'Every view has its own link, the whole tool also works as one file without internet, and the code is public.' },
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
  summary: [
    "Dual Master's candidate at Penn's Weitzman School — City Planning and Urban Spatial Analytics — and a member of the Wharton Zell/Lurie Real Estate Center community.",
    'I work at the intersection of real estate investment, spatial data, and AI. On the investment side, I underwrite multifamily acquisitions and build submarket research from Census, HUD, and GIS data. On the build side, I design and ship full software products end to end — interface, logic, and deployment — using AI-native development, including a platform that automates the underwriting process.',
    'Turning data into decisions and space into strategy — because the story we choose to tell shapes the decision that follows.',
  ],
  education: [
    { school: 'University of Pennsylvania, Weitzman School of Design', what: 'Master of City Planning and Master of Urban Spatial Analytics', when: '2025 – 2027' },
    { school: 'The Wharton School', what: 'Real Estate Design and Development Certificate', when: '2025 – 2027' },
    { school: 'University of Southern California', what: 'B.S. in Urban Studies and Planning, magna cum laude. Minors in Real Estate Development, Environmental Studies and Communication Design. USC Renaissance Scholar Prize.', when: '2021 – 2025' },
  ],
  contact: {
    email: 'yezhang1@upenn.edu',
    linkedin: { label: 'linkedin.com/in/yezhang03', url: 'https://www.linkedin.com/in/yezhang03' },
    github: { label: 'github.com/yezhanggg', url: 'https://github.com/yezhanggg' },
  },
};

export const LIMITS: { title: string; items: string[] }[] = [
  {
    title: 'Built in one weekend',
    items: [
      'VisionPitts was built in about 36 hours. That was not enough time to find more data, clean it up and join it together as carefully as it deserves.',
      'With so little time, it was hard to organize everything and to study how the different measures relate to each other, which is where the most useful insights would come from.',
      'With more time, this tool could be a lot more powerful and much easier to use. What is here is a working start, not the finished version.',
    ],
  },
  {
    title: 'Where the numbers are rough',
    items: [
      'Eviction counts come by ZIP code and are split among neighborhoods by how many homes each has, so they are estimates. We lower our confidence where a neighborhood sits across several ZIP codes and none holds at least 80% of it.',
      'The government hides housing-voucher counts where 10 or fewer families hold one (33 of the 114 ranked tracts), so the risk of being pushed out rests on less information there.',
      'The housing-market study only tells us whether a market got stronger or weaker, not by how much, and 20 city neighborhoods have no market rating (mostly parks and industrial land).',
      'The flood measure looks at how low the ground is (a terrain screen, not FEMA maps); the Place panel also shows the share of land in the FEMA 100-year flood zone, and it misses flooding from storms and overflowing sewers. Our confidence is medium at best, and low in the 14 tracts where more than half the land reads as flooded.',
      'Transit counts how often buses and the T are scheduled nearby, not whether they run on time. To stop a nearly empty neighborhood from ranking first, households are floored at 400.',
      'The count of renters with low incomes includes students, and nothing adjusts for that. For a sense of scale: the 50% income limit for a family of four in the Pittsburgh area is $55,200 a year.',
      'The share of residents aged 65 and over shows where older people live now, not how many more homes they need.',
      'Census figures for small areas are estimates from a survey and can be off, especially for block groups and ZIP codes.',
      'Neighborhoods at the city edge are compared only with neighbors inside the city.',
      '3D buildings are drawn for eight example neighborhoods only; guessed heights are shown faded.',
    ],
  },
  {
    title: 'What the tool does not answer',
    items: [
      'Whether a specific lot can be built on, or exactly what zoning allows there. The zoning shown is our reading of the code and is marked as unverified.',
      'Roads, sewers and other infrastructure, building costs, or climate effects beyond flooding.',
      'School quality. Asking rents from online listings are shown for information only and never used in a score.',
      'The housing suggestions reflect stated priorities, which are opinions, and every one is published. Under Balanced weights senior housing ranks first in 17 of 114 tracts. Many picks are close calls, and the tool says so.',
    ],
  },
];

/** What comes next: planned work and improvements. */
export const NEXT: { title: string; items: string[] }[] = [
  {
    title: 'Next steps',
    items: [
      'Suggest housing types for all 394 neighborhoods in the county, not only the 128 in the city.',
      'Check each neighborhood against the zoning code: which housing types are allowed outright, which need approval, which are not allowed.',
      'Add access to jobs, schools and everyday services as a factor.',
      'Let people save and share their settings with a link.',
      'Show groups of neighborhoods that point the same way, so a planner can see whole corridors.',
    ],
  },
  {
    title: 'Improvements to what is here',
    items: [
      'An option to show how certain each census number is, for readers who want it.',
      'Answers in the question box that point to the number they quote, and questions that compare two places.',
      'A heat and tree-cover measure, using data already collected for every neighborhood.',
      'A way to change the housing-fit rules on screen, to test a different opinion.',
    ],
  },
];
