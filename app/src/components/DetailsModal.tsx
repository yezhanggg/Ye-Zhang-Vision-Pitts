import { AnimatePresence, motion } from 'motion/react';
import { LIMITS, NEXT, PROJECT } from '../lib/about';
import { FMR_2BR, activeFactorIds, askingRents, hasAskingRents, meta, scoring, sources } from '../lib/data';
import { FACTOR_COPY, GLOSSARY, PRESSURE_HOW, RENT_HOW, RENT_WHY_INFO, SCORE_HOW, factorName } from '../lib/copy';
import { useApp, type DetailsTab } from '../lib/store';
import { cx, fmtInt, fmtMoney, fmtSignedPct } from '../lib/format';
import PlanningInputsDetails from './place/PlanningInputsDetails';
import { RELIABILITY, catalogue, groups, hasBrowser, levelMeta, variables, variablesByGroup } from '../lib/explore/catalog';

const WEB_SERVICES = [
  { id: 'openfreemap', name: 'OpenFreeMap / OpenStreetMap basemap', url: 'https://openfreemap.org', use: 'Streets, labels and background 3D buildings' },
  { id: 'mapterhorn', name: 'Mapterhorn elevation tiles (USGS 3DEP in the US)', url: 'https://mapterhorn.com', use: '3D terrain, hillshade, elevation lines and the ground-height readout (AWS Terrain Tiles as fallback)' },
  { id: 'photon', name: 'Photon geocoder (komoot, OpenStreetMap data)', url: 'https://photon.komoot.io', use: 'Search-as-you-type for addresses and places' },
  { id: 'census_geocoder', name: 'US Census Geocoder', url: 'https://geocoding.geo.census.gov/geocoder/', use: 'Street address → census tract (on Enter)' },
  { id: 'nominatim', name: 'Nominatim (OpenStreetMap)', url: 'https://nominatim.openstreetmap.org', use: 'Last-resort address lookup, at most one request per second' },
];

/** Numerator stems joined with " + "; three or more consecutive stems of one table collapse to "B01001_003…006". Shares end in " / den". */
function formula(num: string[], den: string | null): string {
  const runs: string[] = [];
  for (let i = 0; i < num.length; ) {
    const [table, start] = num[i].split('_');
    let j = i;
    while (j + 1 < num.length) {
      const [t, n] = num[j + 1].split('_');
      if (t !== table || Number(n) !== Number(num[j].split('_')[1]) + 1) break;
      j++;
    }
    runs.push(j - i >= 2 ? `${table}_${start}…${num[j].split('_')[1]}` : num.slice(i, j + 1).join(' + '));
    i = j + 1;
  }
  const lhs = runs.join(' + ');
  if (!den) return lhs;
  return `${runs.length > 1 || num.length > 1 ? `(${lhs})` : lhs} / ${den}`;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

const TABS: { id: DetailsTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'sources', label: 'Data & method' },
  { id: 'limits', label: 'Limitations' },
  { id: 'next', label: 'What comes next' },
];

function Bullets({ groups }: { groups: { title: string; items: string[] }[] }) {
  return (
    <>
      {groups.map((g) => (
        <section key={g.title}>
          <h3 className="mb-2 text-body font-semibold text-slate-900">{g.title}</h3>
          <ul className="space-y-1.5 text-small text-slate-700">
            {g.items.map((it, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function Overview() {
  return (
    <>
      <div>
        <p className="font-display text-display font-bold leading-tight tracking-tight text-slate-900">{PROJECT.tagline}</p>
        <div className="mt-2 space-y-2 text-body leading-relaxed text-slate-800">
          {PROJECT.lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      </div>
      <section>
        <h3 className="mb-2 text-body font-semibold text-slate-900">What it has</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {PROJECT.has.map((h) => (
            <div key={h.title} className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200/80">
              <div className="text-small font-semibold text-slate-900">{h.title}</div>
              <div className="mt-0.5 text-small text-slate-700">{h.text}</div>
            </div>
          ))}
        </div>
      </section>
      <ul className="space-y-1 text-small">
        {PROJECT.links.map((l) => (
          <li key={l.url}>
            <a href={l.url} target="_blank" rel="noreferrer" className="font-semibold text-violet-700 hover:underline">
              {l.label} →
            </a>
          </li>
        ))}
      </ul>
      <p className="border-t border-stone-100 pt-3 text-caption text-slate-500">{PROJECT.credits}</p>
    </>
  );
}

/** Details: everything about the project in one window. Overview, data and method, limitations, what comes next. */
export default function DetailsModal() {
  const open = useApp((s) => s.sourcesOpen);
  const tab = useApp((s) => s.detailsTab);
  const set = useApp((s) => s.set);
  const factors = scoring.factors.filter((f) => activeFactorIds.includes(f.id));
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[3000] grid place-items-center bg-slate-900/30 p-6 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => set({ sourcesOpen: false })}>
          <motion.div initial={{ y: 16, scale: 0.98, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 8, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }} onClick={(e) => e.stopPropagation()} className="scroll-quiet max-h-[86vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-white/95 px-6 py-4 backdrop-blur">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold text-slate-900">Details</h2>
                <nav aria-label="Details" className="mt-2 flex flex-wrap gap-1">
                  {TABS.map((t) => (
                    <button key={t.id} onClick={() => set({ detailsTab: t.id })} aria-current={tab === t.id ? 'page' : undefined} className={cx('relative rounded-lg px-3 py-1.5 text-small font-semibold transition-colors', tab === t.id ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900')}>
                      {tab === t.id && <motion.span layoutId="details-tab" className="absolute inset-0 rounded-lg bg-stone-100 ring-1 ring-black/5" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
                      <span className="relative">{t.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
              <button onClick={() => set({ sourcesOpen: false })} className="self-start rounded-lg p-2 text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-label="Close">
                <svg viewBox="0 0 20 20" className="h-4 w-4">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {tab === 'overview' && (
              <div className="space-y-6 px-6 py-5">
                <Overview />
              </div>
            )}
            {tab === 'limits' && (
              <div className="space-y-6 px-6 py-5">
                <Bullets groups={LIMITS} />
              </div>
            )}
            {tab === 'next' && (
              <div className="space-y-6 px-6 py-5">
                <Bullets groups={NEXT} />
              </div>
            )}
            <div className={cx('space-y-6 px-6 py-5', tab !== 'sources' && 'hidden')}>
              <p className="text-small text-slate-600">What is observed data, and what is a value judgment.</p>
              <PlanningInputsDetails />
              <section>
                <h3 className="mb-2 text-body font-semibold text-emerald-800">Observed data: where the numbers come from</h3>
                <div className="overflow-hidden rounded-xl ring-1 ring-stone-200">
                  <table className="w-full text-left text-small">
                    <thead className="bg-stone-50 text-caption font-semibold text-slate-700">
                      <tr>
                        <th className="px-3 py-2">Source</th>
                        <th className="px-3 py-2">Vintage</th>
                        <th className="px-3 py-2">Geography</th>
                        <th className="px-3 py-2">Method and caveats</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sources.map((s, i) => (
                        <tr key={s.id} className={cx('align-top', i % 2 ? 'bg-stone-50/50' : '')}>
                          <td className="px-3 py-2 font-medium text-slate-800">
                            <a href={s.url} target="_blank" rel="noreferrer" className="hover:text-violet-700 hover:underline">
                              {s.name}
                            </a>
                            <div className="text-caption font-normal text-slate-600">{s.id}</div>
                          </td>
                          <td className="px-3 py-2 text-slate-700 tnum">{s.vintage}</td>
                          <td className="px-3 py-2 text-slate-700">{s.geography}</td>
                          <td className="px-3 py-2 text-caption text-slate-700">
                            {s.method} {s.caveats && <span className="text-rose-700">{s.caveats}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              {hasBrowser && (
                <section>
                  <h3 className="mb-1 text-body font-semibold text-sky-800">Explore data browser (ACS {catalogue.meta?.vintage ?? '2020–2024 5-year'})</h3>
                  <p className="mb-2 text-small text-slate-700">
                    The Explore section colors tracts, block groups and ZIP codes by {variables.length} American Community Survey variables and shows any place next to the city and the county. These values are descriptive context and are never scored. The app bundles the city subset ({levelMeta('tract').bundled} tracts, {levelMeta('bg').bundled} block groups, {levelMeta('zcta').bundled} ZIP codes); county-wide rows load from Supabase when the app is online.
                  </p>
                  <p className="mb-2 text-caption text-slate-600">
                    Every value is an estimate with its 90% margin of error. Reliability comes from the coefficient of variation (MOE ÷ 1.645 ÷ estimate): under {pct(RELIABILITY.high)} high, up to {pct(RELIABILITY.medium)} medium, above that low. Sums combine margins root-sum-square; shares use the ACS proportion formula (ratio form when the radicand is negative). Poverty uses C17002 and vehicles B25044 because B17001 and B08201 are not published for block groups.
                  </p>
                  <div className="overflow-hidden rounded-xl ring-1 ring-stone-200">
                    <table className="w-full text-left text-small">
                      <thead className="bg-stone-50 text-caption font-semibold text-slate-700">
                        <tr>
                          <th className="px-3 py-2">Variable</th>
                          <th className="px-3 py-2">Table</th>
                          <th className="px-3 py-2">Unit</th>
                          <th className="px-3 py-2">Formula</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groups.map((g) => [
                          <tr key={g.id} className="border-t border-stone-200 bg-stone-100/70">
                            <th colSpan={4} scope="colgroup" className="px-3 py-1.5 text-left text-caption font-semibold text-slate-700">
                              {g.label}
                            </th>
                          </tr>,
                          ...variablesByGroup(g.id).map((v, i) => (
                            <tr key={v.id} className={cx('align-top', i % 2 ? 'bg-stone-50/50' : '')}>
                              <td className="px-3 py-1.5 font-medium text-slate-800" title={v.description}>
                                {v.label}
                              </td>
                              <td className="px-3 py-1.5 text-slate-700 tnum">{v.table_id}</td>
                              <td className="px-3 py-1.5 text-slate-700">{v.unit}</td>
                              <td className="px-3 py-1.5 font-mono text-caption text-slate-700">{formula(v.num, v.den)}</td>
                            </tr>
                          )),
                        ])}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
              <section>
                <h3 className="mb-2 text-body font-semibold text-emerald-800">The six factors (each ranked against the {meta.n_residential ?? ''} residential city tracts)</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {factors.map((f) => (
                    <div key={f.id} className="rounded-lg bg-stone-50 px-3 py-2 ring-1 ring-stone-200/70">
                      <div className="text-small font-semibold text-slate-900">
                        {factorName(f.id, f.label)} <span className="font-normal text-slate-600">· {f.year}</span>
                      </div>
                      <div className="text-caption text-slate-700">{FACTOR_COPY[f.id]?.meaning ?? f.description}</div>
                      {FACTOR_COPY[f.id] && <div className="mt-1 text-caption text-slate-600">{FACTOR_COPY[f.id].how}</div>}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-caption text-slate-600">{PRESSURE_HOW}</p>
              </section>
              {hasAskingRents && askingRents.county && askingRents.city && (
                <section>
                  <h3 className="mb-1 text-body font-semibold text-sky-800">Asking rents: information only, never scored</h3>
                  <p className="mb-2 text-small text-slate-700">{RENT_HOW}</p>
                  <div className="overflow-hidden rounded-xl ring-1 ring-stone-200">
                    <table className="w-full text-left text-small">
                      <thead className="bg-stone-50 text-caption font-semibold text-slate-700">
                        <tr>
                          <th className="px-3 py-2">Scrape year</th>
                          <th className="px-3 py-2">Allegheny County · median 2BR asking rent (distinct units)</th>
                          <th className="px-3 py-2">City of Pittsburgh · median 2BR asking rent (distinct units)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(askingRents.years ?? []).map((y, i) => {
                          const c = askingRents.county?.[String(y)];
                          const p = askingRents.city?.[String(y)];
                          return (
                            <tr key={y} className={cx(i % 2 ? 'bg-stone-50/50' : '')}>
                              <td className="px-3 py-1.5 text-slate-800 tnum">
                                {y}
                                {y === 2026 ? ' (to Aug)' : ''}
                              </td>
                              <td className="px-3 py-1.5 text-slate-700 tnum">
                                {fmtMoney(c?.median_2br)} ({fmtInt(c?.n_units)})
                              </td>
                              <td className="px-3 py-1.5 text-slate-700 tnum">
                                {fmtMoney(p?.median_2br)} ({fmtInt(p?.n_units)})
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {askingRents.growth && (
                    <p className="mt-2 text-caption text-slate-700">
                      2BR growth 2019–20 → 2025–26: county {fmtSignedPct(askingRents.growth.county.all.growth)} across all listings, {fmtSignedPct(askingRents.growth.county.existing.growth)} for existing stock; city {fmtSignedPct(askingRents.growth.city.all.growth)} across all listings, {fmtSignedPct(askingRents.growth.city.existing.growth)} for existing stock. HUD FY2026 2BR Fair Market Rent, Pittsburgh HMFA: {fmtMoney(FMR_2BR)}.
                      {askingRents.coverage && ` Tract values: ${askingRents.coverage.n_with_rent_2025_26} of ${askingRents.coverage.n_city_tracts} city tracts have a 2025–26 level, ${askingRents.coverage.n_with_growth_existing} have existing-stock growth, ${askingRents.coverage.n_with_growth_all} have all-listings growth.`}
                    </p>
                  )}
                  <p className="mt-1 text-caption text-slate-600">
                    {RENT_WHY_INFO} {askingRents.license}
                  </p>
                </section>
              )}
              <section>
                <h3 className="mb-1 text-body font-semibold text-violet-800">Fit rules: a value judgment (editable in config/scoring.json)</h3>
                <p className="mb-2 text-small text-slate-700">{SCORE_HOW}</p>
                <div className="overflow-x-auto rounded-xl ring-1 ring-stone-200">
                  <table className="w-full text-small">
                    <thead className="bg-stone-50 text-caption font-semibold text-slate-700">
                      <tr>
                        <th className="px-3 py-2 text-left">Typology</th>
                        {factors.map((f) => (
                          <th key={f.id} className="px-2 py-2 text-center">
                            {f.short ?? f.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {scoring.typologies.map((t) => (
                        <tr key={t.id} className="border-t border-stone-100">
                          <td className="px-3 py-1.5 font-medium text-slate-800">
                            <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: t.color }} />
                            {t.label}
                          </td>
                          {factors.map((f) => {
                            const d = scoring.fit.matrix[t.id]?.[f.id] ?? 0;
                            return (
                              <td key={f.id} className="px-2 py-1.5 text-center tnum" style={{ background: d >= 0 ? `rgba(124,58,237,${d * 0.22})` : `rgba(225,29,72,${-d * 0.2})` }}>
                                {d > 0 ? '+' : d < 0 ? '−' : ''}
                                {Math.abs(d).toFixed(1)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 font-mono text-caption text-slate-600">Technical: S(t,k) = Σ w·c(x,d) / Σ w·|d| over factors with data; c = d·x if d ≥ 0, |d|·(1−x) if d &lt; 0. Stability: {scoring.scoring.stability_draws} Dirichlet draws, concentration {scoring.scoring.stability_concentration}.</p>
              </section>
              <section>
                <h3 className="mb-2 text-body font-semibold text-slate-900">Map, terrain and search services</h3>
                <ul className="space-y-1.5 text-small text-slate-700">
                  {WEB_SERVICES.map((w) => (
                    <li key={w.id}>
                      <a href={w.url} target="_blank" rel="noreferrer" className="font-medium text-slate-900 hover:text-violet-700 hover:underline">
                        {w.name}
                      </a>{' '}
                      — {w.use}
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-caption text-slate-600">Terrain is shown for reference and never changes the ranking.</p>
              </section>
              <section>
                <h3 className="mb-2 text-body font-semibold text-slate-900">Plain-language glossary</h3>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-small">
                  {Object.entries(GLOSSARY).flatMap(([k, v]) => [
                    <dt key={`t${k}`} className="font-semibold text-slate-900">
                      {k}
                    </dt>,
                    <dd key={`d${k}`} className="text-slate-700">
                      {v}
                    </dd>,
                  ])}
                </dl>
              </section>
              <section className="text-small text-slate-700">
                <h3 className="mb-1 text-body font-semibold text-slate-900">How AI is used</h3>
                The language model never computes scores or queries data. Code computes every number. When an AI-written explanation appears (DeepSeek or Claude, whichever this deployment is configured with), it was generated from the computed values only, and every number in the text was checked against those values before display; otherwise a template sentence built from the same values is shown.
                <p className="mt-1.5">
                  <span className="font-semibold text-slate-900">VisionPitts-Chat</span>, the question box in Explore and Analysis, is powered by DeepSeek (the deepseek-flash model). It answers only about Pittsburgh housing, from the facts this tool sends with each question; in Analysis, an answer with a figure that cannot be traced to those facts is withheld.
                </p>
              </section>
              {meta.built_at && <p className="text-caption text-slate-500">Data built {meta.built_at.slice(0, 19).replace('T', ' ')} UTC · scoring config v{scoring.version}</p>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
