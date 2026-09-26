import { motion } from 'motion/react';
import { activeFactors, meta, scoring, sourceById, typologyById } from '../lib/data';
import { FACTOR_COPY, GLOSSARY, UI, directionWord, factorName, percentilePhrase, weightWord } from '../lib/copy';
import { cx, fmtInt, fmtNum, fmtPct, isNum } from '../lib/format';
import type { Conf, FactorDef, TractProps, Weights } from '../lib/types';
import { ConfChip, Explainer, InfoTip } from './primitives';

const bench = meta.city_medians ?? {};
const num = (v: unknown) => (isNum(v) ? v : null);

function Row({ k, v, b }: { k: string; v: string; b?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5 text-caption">
      <span className="text-slate-600">{k}</span>
      <span className="text-right font-medium text-slate-900 tnum">
        {v}
        {b && b !== '—' && <span className="ml-1.5 font-normal text-slate-600">city {b}</span>}
      </span>
    </div>
  );
}

function Flag({ label, v, note }: { label: string; v: unknown; note: string }) {
  const on = v === true, off = v === false;
  return (
    <div className={cx('rounded-lg px-2 py-1.5 ring-1', on ? 'bg-emerald-50 ring-emerald-200' : off ? 'bg-white ring-stone-200' : 'hatch ring-stone-200')}>
      <div className={cx('text-caption font-semibold', on ? 'text-emerald-800' : 'text-slate-700')}>
        {on ? '✓ ' : ''}
        {label}
      </div>
      <div className="text-caption text-slate-600">{on ? 'Yes' : off ? 'No' : note}</div>
    </div>
  );
}

function rawLine(f: FactorDef, t: TractProps): string {
  switch (f.id) {
    case 'need':
      return `${fmtInt(t.need_count)} renter households earning ${GLOSSARY.AMI}`;
    case 'market_strength':
      return t.mva21 ? `Market type ${t.mva21} in 2021 (A = strongest)` : 'No market type (non-residential or not classified)';
    case 'displacement_risk':
      return `Combines ${t.displacement_n ?? 0} of 4 parts: social vulnerability, rent burden, evictions, vouchers`;
    case 'subsidy_eligible': {
      const names: Record<string, string> = { qct: GLOSSARY.QCT, dda: GLOSSARY.DDA, oz: GLOSSARY.OZ, cdbg: GLOSSARY.CDBG };
      const fired = (['qct', 'dda', 'oz', 'cdbg'] as const).filter((k) => t[k] === true).map((k) => names[k]);
      return fired.length ? fired.join(' · ') : 'No subsidy program applies';
    }
    case 'transit_access':
      return `${fmtNum(t.transit_departures_per_acre, 1)} weekday departures per acre`;
    case 'flood_exposure':
      return `${fmtNum(t.flood_share_pct, 0)}% of land in a low-lying flood-screening area`;
    default:
      return f.raw_field ? `${fmtNum(t[f.raw_field])} ${f.unit}` : f.unit;
  }
}

function Components({ f, t }: { f: FactorDef; t: TractProps }) {
  if (f.id === 'displacement_risk') {
    const themes = ['Socioeconomic status', 'Household characteristics', 'Racial & ethnic minority status', 'Housing type & transportation'];
    return (
      <div>
        <Row k={`${GLOSSARY.SVI}, 0–1`} v={fmtNum(t.svi_overall)} b={fmtNum(bench.svi_overall)} />
        {themes.map((n, i) => {
          const v = num(t[`svi_t${i + 1}`]);
          return (
            <div key={n} className="flex items-center gap-2 py-0.5 text-caption">
              <span className="w-44 shrink-0 truncate pl-2 text-slate-600">↳ {n}</span>
              <div className="h-1 flex-1 rounded-full bg-stone-100">
                <div className="h-full rounded-full bg-slate-500" style={{ width: `${(v ?? 0) * 100}%` }} />
              </div>
              <span className="w-8 text-right font-medium text-slate-800 tnum">{fmtNum(v)}</span>
            </div>
          );
        })}
        <Row k="Low-income renters paying >30% of income" v={fmtPct(t.chas_burden_le50_share)} b={fmtPct(bench.chas_burden_le50_share)} />
        <Row k="Eviction filings per 100 renter homes (2023–25, spread from ZIPs)" v={t.eviction_filing_rate == null ? 'not covered' : fmtNum(t.eviction_filing_rate, 1)} b={fmtNum(bench.eviction_filing_rate, 1)} />
        <Row k="Housing vouchers per renter home" v={t.hcv_per_renter == null ? 'hidden by HUD (≤10 vouchers)' : fmtPct(t.hcv_per_renter, 1)} b={fmtPct(bench.hcv_per_renter, 1)} />
      </div>
    );
  }
  if (f.id === 'subsidy_eligible') {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        <Flag label={GLOSSARY.QCT} v={t.qct} note="No data" />
        <Flag label={GLOSSARY.DDA} v={t.dda} note="No data" />
        <Flag label={GLOSSARY.OZ} v={t.oz} note="No data" />
        <Flag label={GLOSSARY.CDBG} v={t.cdbg} note="Not covered by the city file" />
      </div>
    );
  }
  if (f.id === 'market_strength') {
    return (
      <div>
        <Row k="Market type, 2021" v={String(t.mva21 ?? '—')} />
        <Row k="Market type, 2016" v={String(t.mva16 ?? '—')} />
        <Row k="Change since 2016" v={t.market_direction ? (t.market_direction === 'rising' ? '▲ ' : t.market_direction === 'falling' ? '▼ ' : '● ') + directionWord(t.market_direction) : '—'} />
        <p className="mt-1 text-caption text-slate-600">The letters mean different things in 2016 and 2021, so only the direction of change is used.</p>
      </div>
    );
  }
  if (f.id === 'need') {
    return (
      <div>
        <Row k="Renter households ≤50% of area median income" v={fmtInt(t.need_count)} b={fmtInt(bench.need_count)} />
        <Row k="Margin of error (CV)" v={fmtPct(t.need_count_cv)} />
        <Row k="Households that rent" v={fmtPct(t.renter_share)} b={fmtPct(bench.renter_share)} />
        <Row k="Renters paying >30% of income" v={fmtPct(t.rent_burdened_share)} b={fmtPct(bench.rent_burdened_share)} />
      </div>
    );
  }
  if (f.raw_field) return <Row k={f.unit} v={fmtNum(t[f.raw_field], 1)} b={fmtNum(bench[f.raw_field], 1)} />;
  return null;
}

export function FactorCard({ f, t, weight, topTypology }: { f: FactorDef; t: TractProps; weight: number; topTypology: string | null }) {
  const x = num(t[f.id]);
  const conf = (t[`${f.id}_conf`] as Conf | null) ?? null;
  const isFlag = f.id === 'subsidy_eligible';
  const d = topTypology ? scoring.fit.matrix[topTypology]?.[f.id] : undefined;
  const topName = topTypology ? typologyById.get(topTypology)?.label : null;
  const c = FACTOR_COPY[f.id];
  const srcNames = f.sources.map((s) => sourceById.get(s)?.name ?? s.toUpperCase());
  const fitLine = d === undefined || !topName ? null : d === 0 ? `Doesn’t affect the ${topName} match` : isFlag ? `${d > 0 ? 'Eligibility helps' : 'Eligibility counts against'} the ${topName} match` : `${d > 0 ? 'Higher' : 'Lower'} is better for ${topName}`;
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-stone-200/80">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1 text-body font-semibold text-slate-900">
          {factorName(f.id, f.label)}
          {c && <InfoTip label={`What is ${c.name}?`}>{c.meaning}</InfoTip>}
        </div>
        <ConfChip conf={x == null ? null : conf} />
      </div>
      <div className="mt-1 text-small font-semibold text-slate-800">{x == null ? 'No data for this tract' : isFlag ? (x >= 0.5 ? 'Eligible for at least one program' : 'Not eligible') : percentilePhrase(x)}</div>
      <div className="text-caption text-slate-600">{rawLine(f, t)}</div>
      {!isFlag && (
        <>
          <div className="relative mt-2.5 h-2 rounded-full bg-gradient-to-r from-stone-100 via-stone-200 to-stone-300">
            <div className="absolute top-[-3px] h-[14px] w-px bg-slate-500" style={{ left: '50%' }} title="City middle" />
            {x == null ? <div className="hatch absolute inset-0 rounded-full" /> : <motion.div className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-900 shadow" initial={false} animate={{ left: `${x * 100}%` }} transition={{ type: 'spring', stiffness: 260, damping: 28 }} />}
          </div>
          <div className="mt-1 flex justify-between text-caption text-slate-600">
            <span>Lowest in city</span>
            <span>Middle</span>
            <span>Highest</span>
          </div>
        </>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-stone-100 pt-2 text-caption">
        <span className="font-medium text-violet-800">Your priority: {weightWord(weight)}</span>
        {fitLine && <span className="text-slate-700">{fitLine}</span>}
      </div>
      <Explainer title={UI.howCalc} className="mt-1.5">
        <div className="space-y-2">
          {c && <p className="text-caption text-slate-700">{c.how}</p>}
          <Components f={f} t={t} />
          <p className="text-caption text-slate-600">
            Source: {srcNames.join(' · ')} · {f.year}
          </p>
        </div>
      </Explainer>
    </div>
  );
}

export default function FactorCards({ t, weights, topTypology }: { t: TractProps; weights: Weights; topTypology: string | null }) {
  return (
    <div className="space-y-2">
      {activeFactors.map((f) => (
        <FactorCard key={f.id} f={f} t={t} weight={weights[f.id] ?? 0} topTypology={topTypology} />
      ))}
    </div>
  );
}
