// Analysis > Equity & policy (mode `scenarios`), one screen: a single control bar (measure, income, the four policy
// levers with the policy simulator pop-up beside them, export) over three columns: the map (colored by the measure,
// lever-changed tracts outlined), the measure section (definition, plain sentences, charts, the selected tract against
// the city, every tract ranked by need) and the question box filling the right column.
import { useCallback, useMemo, useState } from 'react';
import { rankedTracts, tractById, tractLabel } from '../../lib/data';
import { useApp } from '../../lib/store';
import type { MapPaint } from '../../lib/paint';
import { hud, placeById } from '../../lib/place/data';
import { usePlan } from '../../lib/place/planStore';
import { amiOf } from '../../lib/place/plan';
import { MEASURES, buildLegend, fits2br, measureById, measureValue, median, rankByNeed, type AmiPct, type MeasureId } from '../../lib/equity/measures';
import { rent60TwoBedroom, type Row } from '../../lib/equity/policy';
import { POLICY_COLUMNS, buildEquityReport, equityFacts, equityPrompts, measureColumns, measureRows, policyRows, type LeverId, type TractInfo } from '../../lib/equity/export';
import { downloadCsv, exportFilename, toCsv } from '../../lib/export/csv';
import { mapSnapshot, printReport, reportFooter } from '../../lib/export/report';
import ExportMenu, { useMapRef } from '../export/ExportMenu';
import MapView, { spotlightRings, type OverlayLayer } from '../MapView';
import AnalysisChat from '../AnalysisChat';
import EquityToolbar, { LEVERS_TRACT_ONLY, type AreaLevel } from './EquityToolbar';
import MeasurePanel, { type AreaKind } from './MeasurePanel';
import { ZIP_NOTE, hasZipData, zipRanked as zipIsRanked, rankedZips, zipById, zipCoverage, zipFacts, zipName, zipPlaces, zipValue, zipWords } from '../../lib/equity/zip';
import { bundledGeo, CITY_GEOID } from '../../lib/explore/catalog';
import { isNum } from '../../lib/place/format';
import PolicyPopover from './PolicySimulator';
import { explainPolicies, policiesOnLine } from '../../lib/equity/explain';
import { READING_QUESTION, READING_QUESTION_NO_POLICY, hasReading, useEquityReading } from '../../lib/equity/reading';
import { cityTakeaway, explainLocal } from '../../lib/equity/local';
import { usePolicy } from './usePolicy';
import { nameOf } from './names';
import { useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { cx } from '../../lib/format';
import { InfoTip } from '../primitives';

/** v2: the chat is a floating panel behind a button, closed until asked for (remembered per browser). */
const CHAT_KEY = 'visionpitts.equityChat.v2';

const infoOf = (id: string): TractInfo => {
  const t = tractById.get(id);
  return { geoid: id, neighborhood: tractLabel(t), tract: t?.name ?? id };
};
const tractOf = (id: string) => tractById.get(id)?.name ?? id;

// ZIP level: the ZCTA shapes Explore already bundles, labeled; edge ZIPs say "city part". Outside the city a light
// veil (the city polygon cut out of a world ring) keeps the eye on the city part of each ZIP.
const zipLabelOf = (id: string) => (zipById.get(id)?.edge ? `${id} (city part)` : id);
const ZIP_FC: OverlayLayer['data'] = (() => {
  const fc = bundledGeo('zcta');
  return { type: 'FeatureCollection', features: fc.features.map((f) => ({ type: 'Feature' as const, geometry: f.geometry as OverlayLayer['data']['features'][number]['geometry'], properties: { GEOID: f.properties.GEOID, label: zipLabelOf(f.properties.GEOID) } })) };
})();
const CITY_VEIL: OverlayLayer['data'] | null = (() => {
  const g = bundledGeo('city').features.find((f) => f.properties.GEOID === CITY_GEOID)?.geometry as { type: string; coordinates: unknown } | undefined;
  if (!g) return null;
  // The world minus the city, plus the enclaves inside it (the city polygon's inner rings, such as Mount Oliver).
  const polys = g.type === 'Polygon' ? [g.coordinates as number[][][]] : g.type === 'MultiPolygon' ? (g.coordinates as number[][][][]) : [];
  const enclaves = polys.flatMap((p) => p.slice(1).map((r) => [r]));
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { GEOID: 'veil' }, geometry: { type: 'MultiPolygon', coordinates: [spotlightRings(g), ...enclaves] } }] };
})();
const CITY_FC = bundledGeo('city') as unknown as OverlayLayer['data'];
const ZIP_LINE: OverlayLayer['line'] = {
  color: '#334155',
  width: ['interpolate', ['linear'], ['zoom'], 10, 0.8, 15, 2] as unknown as number,
  opacity: 0.9,
  casing: { color: '#ffffff', width: ['interpolate', ['linear'], ['zoom'], 10, 2.4, 15, 4] as unknown as number, opacity: 0.7 },
  label: { field: 'label', minzoom: 11, color: '#1e293b', size: 11 },
};
const ZIP_AREA: AreaKind = {
  level: 'zip',
  one: 'ZIP',
  many: 'ZIPs',
  label: (id) => zipName(id),
  listSub: (id) => zipPlaces(id, (t) => tractLabel(tractById.get(t))),
  sub: (id) => zipCoverage(id),
  value: (m, id, ami) => zipValue(m, id, ami, hud),
  note: (id) => {
    const r = zipById.get(id);
    if (!r) return null;
    if (!zipIsRanked(r)) return 'Too few homes in the city part, not ranked.';
    return r.edge ? `Edge ZIP: only ${Math.round(r.share * 100)}% of its homes are in the city, so these values cover its city part (the rent gap uses the whole ZIP's asking rent).` : null;
  },
  words: zipWords,
  info: ZIP_NOTE,
};

function Legend({ title, items, flips }: { title: string; items: { color: string; label: string }[]; flips: number }) {
  return (
    <div className="pointer-events-none absolute bottom-2.5 left-2.5 z-10 rounded-lg bg-white/95 px-2.5 py-2 shadow-md ring-1 ring-black/5">
      <div className="mb-1 text-caption font-semibold text-slate-800">{title}</div>
      <ul className="space-y-px">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-1.5 text-caption text-slate-700">
            <span className="inline-block h-2.5 w-3.5 rounded-sm ring-1 ring-black/10" style={{ background: it.color }} />
            {it.label}
          </li>
        ))}
        <li className="flex items-center gap-1.5 text-caption text-slate-500">
          <span className="inline-block h-2.5 w-3.5 rounded-sm bg-[#e7e5e4] ring-1 ring-black/10" />
          no data or not ranked
        </li>
        {flips > 0 && (
          <li className="flex items-center gap-1.5 text-caption text-slate-800">
            <span className="inline-block h-2.5 w-3.5 rounded-sm ring-2 ring-slate-900" />
            changed by the levers on ({flips})
          </li>
        )}
      </ul>
    </div>
  );
}

export default function EquityPolicyView({ active = true }: { active?: boolean }) {
  const selectedId = useApp((s) => s.selectedId);
  const lite = useApp((s) => s.lite);
  const select = useApp((s) => s.select);
  const planLevel = usePlan((s) => s.level);
  const setPlan = usePlan((s) => s.setPlan);
  // Market rate (shared with the Place tab) reads as a household at the area median income (100% AMI).
  const level: AmiPct = planLevel === 'market' ? 100 : (amiOf(planLevel) as AmiPct);
  const [measure, setMeasure] = useState<MeasureId>('rent_gap');
  const [on, setOn] = useState<Record<LeverId, boolean>>({ adu: false, bonus: false, voucher: false, transit: false });
  const [homesText, setHomesText] = useState('40');
  // Tracts (default) or ZIP codes for the map and the measure section; the levers always run on tracts.
  const [areaLevel, setAreaLevel] = useState<AreaLevel>('tract');
  const zipMode = areaLevel === 'zip' && hasZipData;
  const [selZip, setSelZip] = useState<string | null>(null);
  // VisionPitts-Chat floats over the right of the page; the map and the analysis never change size, so opening it
  // costs no layout work (the panel stays mounted and only fades and slides).
  const [chatOpen, setChatOpen] = useState(() => {
    try {
      return localStorage.getItem(CHAT_KEY) === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!chatOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggleChat();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen]);
  const toggleChat = () =>
    setChatOpen((o) => {
      try {
        localStorage.setItem(CHAT_KEY, o ? '0' : '1');
      } catch {
        /* private mode */
      }
      return !o;
    });
  const homes = Math.max(0, Math.min(10000, Math.round(Number(homesText) || 0)));
  const def = measureById.get(measure)!;
  const { getMap, onMapReady } = useMapRef();

  const rows: Row[] = useMemo(() => rankedTracts.filter((t) => placeById.has(t.GEOID)).map((t) => ({ id: t.GEOID, p: placeById.get(t.GEOID)! })), []);
  const allValues = useMemo(() => new Map(MEASURES.map((m) => [m.id, rows.map((r) => measureValue(m.id, r.p, hud, level)).filter((v): v is number => v != null)])), [rows, level]);
  const medians = useMemo(() => new Map(MEASURES.map((m) => [m.id, median(allValues.get(m.id) ?? [])])), [allValues]);
  const values = useMemo(() => rows.map((r) => ({ id: r.id, value: measureValue(measure, r.p, hud, level) })), [rows, measure, level]);
  const ranked = useMemo(() => rankByNeed(values, def.higherIsNeed), [values, def]);
  const legend = useMemo(() => buildLegend(def, values.map((v) => v.value).filter((v): v is number => v != null)), [def, values]);
  const paint: MapPaint = useMemo(() => ({ kind: 'cat', palette: legend.colors, values: new Map(values.map((v) => [v.id, legend.classOf(v.value)])) }), [legend, values]);
  const valueById = useMemo(() => new Map(values.map((v) => [v.id, v.value])), [values]);
  const available = values.filter((v) => v.value != null).length;
  const fits = fits2br(hud, level);
  const med = medians.get(measure) ?? null;
  const { results, levers, flips } = usePolicy(rows, level, homes, on);

  // ZIP level: the same charts and lists over the city's ZIP codes (lib/equity/zip).
  const zipAll = useMemo(() => new Map(MEASURES.map((m) => [m.id, rankedZips.map((z) => zipValue(m.id, z, level, hud)).filter(isNum)])), [level]);
  const zipMedians = useMemo(() => new Map(MEASURES.map((m) => [m.id, median(zipAll.get(m.id) ?? [])])), [zipAll]);
  const zipValues = useMemo(() => rankedZips.map((z) => ({ id: z, value: zipValue(measure, z, level, hud) })), [measure, level]);
  const zipRankedRows = useMemo(() => rankByNeed(zipValues, def.higherIsNeed), [zipValues, def]);
  const zipLegend = useMemo(() => buildLegend(def, zipValues.map((v) => v.value).filter(isNum)), [def, zipValues]);
  const zipPaint: MapPaint = useMemo(() => ({ kind: 'cat', palette: zipLegend.colors, values: new Map(zipValues.map((v) => [v.id, zipLegend.classOf(v.value)])) }), [zipLegend, zipValues]);
  const zipValueById = useMemo(() => new Map(zipValues.map((v) => [v.id, v.value])), [zipValues]);
  const onZip = useCallback((id: string | null) => setSelZip((cur) => (id != null && cur === id ? null : id)), []);
  const overlays = useMemo<OverlayLayer[] | undefined>(() => {
    if (!zipMode) return undefined;
    const out: OverlayLayer[] = [
      {
        id: 'eq-zip',
        data: ZIP_FC,
        idField: 'GEOID',
        line: ZIP_LINE,
        fill: { paint: zipPaint },
        interactive: true,
        zoomTo: false,
        selectedId: selZip,
        onSelect: (id) => onZip(id),
        tooltip: (id) => (
          <div className="max-w-64">
            <div className="font-semibold">{zipName(id)}</div>
            <div className="text-caption text-white/75">{zipCoverage(id)}</div>
            <div className="mt-1">
              {def.short}: <b>{zipValueById.has(id) ? def.fmt(zipValueById.get(id) ?? null) : 'not ranked'}</b>
            </div>
          </div>
        ),
      },
    ];
    if (CITY_VEIL) out.push({ id: 'eq-city-veil', data: CITY_VEIL, idField: 'GEOID', fill: { color: '#f8f7f4', opacity: 0.78 }, line: { color: '#0f172a', width: 0, opacity: 0 } });
    out.push({ id: 'eq-city-line', data: CITY_FC, idField: 'GEOID', line: { color: '#1e293b', width: 1.8, opacity: 0.9, casing: { color: '#ffffff', width: 4, opacity: 0.8 } } });
    return out;
  }, [zipMode, zipPaint, selZip, onZip, def, zipValueById]);
  const toggle = useCallback((id: LeverId) => setOn((o) => ({ ...o, [id]: !o[id] })), []);

  const selectedFacts = useMemo(() => {
    if (!selectedId || !placeById.has(selectedId)) return null;
    const p = placeById.get(selectedId)!;
    return { id: selectedId, values: MEASURES.map((m) => ({ def: m, value: measureValue(m.id, p, hud, level), median: medians.get(m.id) ?? null })) };
  }, [selectedId, level, medians]);
  const facts = useMemo(() => {
    const base = equityFacts({ ami: level, def, median: med, available, n: rows.length, ranked, levers, nameOf, tractOf, selected: selectedFacts });
    // At ZIP level the ZIP facts come first (they are what the map and the section show); the tract facts follow
    // because the four levers run on tracts.
    return zipMode ? `${zipFacts({ def, ami: level, hud, selected: selZip })}\nTRACT-LEVEL DATA BEHIND THE LEVERS:\n${base}` : base;
  }, [level, def, med, available, rows.length, ranked, levers, selectedFacts, zipMode, selZip]);
  // What the switched-on policies change (exact sentences), and a VisionPitts-Chat reading of the whole tab.
  const policyTexts = useMemo(
    () =>
      explainPolicies({
        def,
        values,
        levers,
        subsidy: { tracts: results.gaps.top.map((g) => g.id), homes: results.homes, total: results.gaps.total, fits: results.fits, ami: results.ami },
        rent60: rent60TwoBedroom(hud)?.formula ?? null,
        transitLabel: results.transitLabel,
        nameOf,
      }),
    [def, values, levers, results],
  );
  // VisionPitts Insight runs only while a policy is switched on; its facts add the neighborhood comparison and the
  // takeaways the page already prints, so the reading can speak to the place and its surroundings.
  const anyPolicyOn = levers.some((l) => l.on);
  const localText = useMemo(
    () =>
      zipMode
        ? explainLocal({ def, ami: level, values: zipValues, level: 'zip', selectedId: selZip, nameOf: (z) => zipName(z), many: 'ZIP codes' })
        : explainLocal({ def, ami: level, values, level: 'tract', selectedId, nameOf, many: 'tracts' }),
    [def, level, values, selectedId, zipMode, zipValues, selZip],
  );
  const readingFacts = useMemo(
    () =>
      `${facts}\nTHE SELECTED PLACE AND ITS SURROUNDINGS (computed): ${localText}\nCITYWIDE TAKEAWAY: ${cityTakeaway(def.id, level)}${policyTexts.length ? `\nWHAT THE POLICIES THAT ARE ON CHANGE:\n${policyTexts.map((p) => `${p.name}: ${p.text}`).join('\n')}` : ''}`,
    [facts, localText, def, level, policyTexts],
  );
  // Without a policy on, the Insight is written only on request ("Get VisionPitts Insight"), for the facts on screen
  // when the button was pressed; a new measure, place or level shows the button again (unless already written).
  const [askedFor, setAskedFor] = useState<string | null>(null);
  const question = anyPolicyOn && !zipMode ? READING_QUESTION : READING_QUESTION_NO_POLICY;
  const wantInsight = (anyPolicyOn && !zipMode) || askedFor === readingFacts || hasReading(readingFacts, question);
  const reading = useEquityReading(readingFacts, active && wantInsight, question);
  const askInsight = useCallback(() => setAskedFor(readingFacts), [readingFacts]);
  const prompts = useMemo(() => {
    const ps = equityPrompts(def, level, levers, zipMode ? (selZip ? zipName(selZip) : null) : selectedId ? nameOf(selectedId) : null);
    return zipMode ? ps.map((q) => q.replace('Which neighborhoods', 'Which ZIP codes')) : ps;
  }, [def, level, levers, selectedId, zipMode, selZip]);

  const exportItems = [
    {
      label: 'Equity report (PDF)',
      hint: `${def.short}, map, top 20 and the four levers`,
      onSelect: async () => {
        const map = await mapSnapshot(getMap());
        printReport(
          buildEquityReport({
            ami: level,
            marketAs80: false,
            def,
            median: med,
            available,
            n: rows.length,
            ranked,
            levers,
            info: infoOf,
            map,
            footer: reportFooter(),
            filename: exportFilename('equity', def.short, 'pdf'),
          }),
        );
      },
    },
    {
      label: 'Measure data (CSV)',
      hint: `All ${rows.length} tracts, six measures${flips.size ? ', levers on' : ''}`,
      onSelect: () => downloadCsv(exportFilename('equity-measures', `${level}-ami`, 'csv'), toCsv(measureRows(rows, infoOf, hud, level, levers), measureColumns(level, levers))),
    },
    ...(zipMode
      ? [
          {
            label: 'ZIP measures (CSV)',
            hint: `All ${rankedZips.length} ZIP codes, six measures (tract aggregates)`,
            onSelect: () =>
              downloadCsv(
                exportFilename('equity-zip-measures', `${level}-ami`, 'csv'),
                toCsv(
                  rankedZips.map((z) => {
                    const r = zipById.get(z)!;
                    return { zip: z, city_part: r.edge ? 'yes' : 'no', city_homes: r.hu, share_in_city: r.share, tracts: r.tracts.length, ...Object.fromEntries(MEASURES.map((m) => [m.id, zipValue(m.id, z, level, hud)])) };
                  }),
                  [
                    { key: 'zip', label: 'ZIP code' },
                    { key: 'city_part', label: 'Edge ZIP (city part only)' },
                    { key: 'city_homes', label: 'City homes (2020)' },
                    { key: 'share_in_city', label: "Share of the ZIP's homes in the city" },
                    { key: 'tracts', label: 'City tracts used' },
                    ...MEASURES.map((m) => ({ key: m.id, label: `${m.title} (${m.unit})` })),
                  ],
                ),
              ),
          },
        ]
      : []),
    {
      label: 'Policy results (CSV)',
      hint: 'One row per lever: rule, before, after',
      onSelect: () => downloadCsv(exportFilename('equity-policies', `${level}-ami`, 'csv'), toCsv(policyRows(levers, nameOf), POLICY_COLUMNS)),
    },
  ];

  // VisionPitts-Chat lives in the measure section's right column (the tract table and the list move under the charts
  // while it is open). It stays mounted when closed, so the thread and its scroll survive and opening it is instant.
  const chatPanel = (
<section
      id="equity-chat"
      aria-label="VisionPitts-Chat"
      aria-hidden={!chatOpen}
      inert={!chatOpen}
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_12px_32px_-14px_rgba(76,29,149,0.35)] ring-1 ring-violet-200/70 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none starting:translate-x-3 starting:opacity-0"
    >
      <div className="flex shrink-0 items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 px-3.5 py-2.5 text-white">
        <Sparkles className="h-4 w-4 shrink-0" />
        <h2 className="min-w-0 flex-1 text-small font-semibold leading-tight">VisionPitts-Chat</h2>
        <span className="text-white/85 [&_button]:text-white/85 hover:[&_button]:text-white">
          <InfoTip label="About VisionPitts-Chat" width={260} side="bottom">
            Answers questions about this tab's numbers, the four levers and other Pittsburgh housing topics. Numbers in an answer are checked against the tool's data.
          </InfoTip>
        </span>
        <button type="button" onClick={toggleChat} className="grid h-7 w-7 place-items-center rounded-full text-white/90 transition-colors hover:bg-white/15 hover:text-white" aria-label="Close VisionPitts-Chat" title="Close (Esc)">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-violet-50/50 to-white px-2.5 pb-2.5 pt-2 [&>[data-testid=analysis-chat]]:flex [&>[data-testid=analysis-chat]]:min-h-0 [&>[data-testid=analysis-chat]]:flex-1 [&>[data-testid=analysis-chat]]:flex-col">
        <AnalysisChat compact dock extraFacts={active ? facts : undefined} prompts={prompts} />
      </div>
    </section>
  );

  if (!hud || placeById.size === 0) {
    return <div className="grid h-full place-items-center pt-14 text-small text-slate-600">The place measures (place.json and the HUD table) are not built yet, so the equity dashboard cannot run.</div>;
  }

  return (
    <div className="flex h-full flex-col bg-[#fbfaf8] pt-[96px]" data-active={active ? 'true' : 'false'}>
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 px-4 pb-4 pt-1.5 sm:px-5 max-lg:overflow-y-auto">
        <header className="flex shrink-0 flex-wrap items-baseline gap-x-3">
          <h1 className="font-display text-title font-bold text-slate-900">Equity &amp; policy</h1>
          <p className="text-small text-slate-600">Where renters need help most, and what four policy levers would change.</p>
        </header>
        <div data-tour="equity-bar">
        <EquityToolbar
          measure={measure}
          onMeasure={setMeasure}
          level={level}
          onLevel={(l) => setPlan({ level: l === 100 ? 'market' : l })}
          marketAs80={false}
          incomeApplies={measure === 'rent_gap' || measure === 'burdened'}
          area={zipMode ? 'zip' : 'tract'}
          onArea={hasZipData ? setAreaLevel : undefined}
          fitsFormula={fits?.formula ?? null}
          on={on}
          onToggle={toggle}
          homesText={homesText}
          onHomes={setHomesText}
          about={
            <>
              Where rents outrun what people earn, and how close people live to jobs, schools, frequent transit and everyday services. One measure at a time, in real units, for the {rows.length} city tracts with at
              least 25 households. Darker = more need.
            </>
          }
          policySlot={<PolicyPopover levers={levers} results={results} selectedId={selectedId} onToggle={toggle} />}
          exportSlot={<ExportMenu items={exportItems} size="md" iconOnlyNarrow className="[&>button]:h-8 [&>button]:px-2.5 [&>button]:text-caption min-[2100px]:[&>button]:px-3 min-[2100px]:[&>button]:text-small" />}
          chatSlot={
            <button
              type="button"
              onClick={toggleChat}
              aria-pressed={chatOpen}
              aria-controls="equity-chat"
              title={chatOpen ? 'Close VisionPitts-Chat' : 'Ask VisionPitts-Chat about these numbers and Pittsburgh housing'}
              className={cx(
                'flex h-8 items-center gap-1 whitespace-nowrap rounded-lg px-2.5 text-caption font-semibold text-white shadow-sm min-[2100px]:text-small transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.97]',
                chatOpen ? 'bg-violet-800 ring-2 ring-violet-300' : 'bg-violet-600 hover:bg-violet-700 hover:shadow-md',
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              VisionPitts-Chat
            </button>
          }
        />
        </div>

        <div className="relative flex min-h-0 flex-1 max-lg:flex-col">
          <div className="relative min-h-[420px] min-w-0 flex-[44_1_0%] overflow-hidden rounded-xl ring-1 ring-stone-200/80">
            <MapView
              paint={paint}
              selectedId={zipMode ? null : selectedId}
              flips={zipMode ? null : flips}
              baseTracts={!zipMode}
              overlays={overlays}
              lite={lite}
              terrain={false}
              buildings
              hillshade={false}
              onSelect={(id) => select(useApp.getState().selectedId === id ? null : id)}
              onMapReady={onMapReady}
              spotlightDim={0.4}
              tooltip={(id) => (
                <div className="max-w-64">
                  <div className="font-semibold">{nameOf(id)}</div>
                  <div className="text-caption text-white/75">{tractById.get(id)?.name}</div>
                  <div className="mt-1">
                    {def.short}: <b>{tractById.get(id)?.residential ? def.fmt(valueById.get(id) ?? null) : 'not ranked'}</b>
                  </div>
                  {flips.has(id) && <div className="mt-0.5 text-caption text-white/75">Changed by {levers.filter((l) => l.on && l.changed.includes(id)).map((l) => l.name).join(', ')}</div>}
                </div>
              )}
            />
            {zipMode ? (
              <Legend title={`${def.title} (${def.unit}), by ZIP`} items={zipLegend.items} flips={0} />
            ) : (
              <Legend title={`${def.title} (${def.unit})`} items={legend.items} flips={flips.size} />
            )}
          </div>

          <div className="ml-2.5 flex min-h-0 min-w-0 flex-[56_1_0%] flex-col max-lg:ml-0 max-lg:mt-2.5 [&>section]:flex-1">
          {/* One panel for both levels, so VisionPitts-Chat (inside it) keeps its thread when the level changes. */}
          <MeasurePanel
            wide
            area={zipMode ? ZIP_AREA : undefined}
            def={def}
            ami={level}
            median={zipMode ? (zipMedians.get(measure) ?? null) : med}
            available={zipMode ? zipValues.filter((v) => v.value != null).length : available}
            n={zipMode ? rankedZips.length : rows.length}
            ranked={zipMode ? zipRankedRows : ranked}
            values={zipMode ? zipValues : values}
            legend={zipMode ? zipLegend : legend}
            medians={zipMode ? zipMedians : medians}
            allValues={zipMode ? zipAll : allValues}
            selectedId={zipMode ? selZip : selectedId}
            policiesLine={zipMode ? (levers.some((l) => l.on) ? LEVERS_TRACT_ONLY : null) : policiesOnLine(levers)}
            chat={chatPanel}
            chatOpen={chatOpen}
            policyTexts={zipMode ? [] : policyTexts}
            reading={reading}
            onAskInsight={typeof location !== 'undefined' && location.protocol === 'file:' ? undefined : askInsight}
            onPick={zipMode ? setSelZip : select}
          />
          </div>

        </div>
      </div>
    </div>
  );
}

