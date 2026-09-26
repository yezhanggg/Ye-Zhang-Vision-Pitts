import { AnimatePresence, motion } from 'motion/react';
import { activeFactorIds, meta, scoring, sources } from '../lib/data';
import { FACTOR_COPY, GLOSSARY, PRESSURE_HOW, SCORE_HOW, factorName } from '../lib/copy';
import { useApp } from '../lib/store';
import { cx } from '../lib/format';

const WEB_SERVICES = [
  { id: 'openfreemap', name: 'OpenFreeMap / OpenStreetMap basemap', url: 'https://openfreemap.org', use: 'Streets, labels and background 3D buildings' },
  { id: 'mapterhorn', name: 'Mapterhorn elevation tiles (USGS 3DEP in the US)', url: 'https://mapterhorn.com', use: '3D terrain, hillshade, elevation lines and the ground-height readout (AWS Terrain Tiles as fallback)' },
  { id: 'photon', name: 'Photon geocoder (komoot, OpenStreetMap data)', url: 'https://photon.komoot.io', use: 'Search-as-you-type for addresses and places' },
  { id: 'census_geocoder', name: 'US Census Geocoder', url: 'https://geocoding.geo.census.gov/geocoder/', use: 'Street address → census tract (on Enter)' },
  { id: 'nominatim', name: 'Nominatim (OpenStreetMap)', url: 'https://nominatim.openstreetmap.org', use: 'Last-resort address lookup, at most one request per second' },
];

export default function SourcesModal() {
  const open = useApp((s) => s.sourcesOpen);
  const set = useApp((s) => s.set);
  const factors = scoring.factors.filter((f) => activeFactorIds.includes(f.id));
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[3000] grid place-items-center bg-slate-900/30 p-6 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => set({ sourcesOpen: false })}>
          <motion.div initial={{ y: 16, scale: 0.98, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 8, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }} onClick={(e) => e.stopPropagation()} className="scroll-quiet max-h-[86vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-white/95 px-6 py-4 backdrop-blur">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">Sources & method</h2>
                <p className="text-small text-slate-600">What is observed data, and what is a value judgment.</p>
              </div>
              <button onClick={() => set({ sourcesOpen: false })} className="rounded-lg p-2 text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-label="Close">
                <svg viewBox="0 0 20 20" className="h-4 w-4">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="space-y-6 px-6 py-5">
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
                The language model never computes scores or queries data. Code computes every number. When a Claude-written explanation appears, it was generated from the computed values only, and every number in the text was checked against those values before display; otherwise a template sentence built from the same values is shown.
              </section>
              {meta.built_at && <p className="text-caption text-slate-500">Data built {meta.built_at.slice(0, 19).replace('T', ' ')} UTC · scoring config v{scoring.version}</p>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
