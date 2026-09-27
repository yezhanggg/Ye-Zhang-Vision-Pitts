// The evidence under the answer card on Analysis > Match: blocks A–F, how the suggestion was made, and the fit order,
// each folded with its title and one headline value. Opening a fold shows the block's table and its source line.
import type { ReactNode } from 'react';
import { typologyById } from '../../lib/data';
import { isNum } from '../../lib/format';
import { sumBands, typeBandFor } from '../../lib/place/bands';
import { fmtDollars, fmtHouseholds } from '../../lib/place/format';
import { LEVEL_BAND, LEVEL_LABEL, levelBands, type PlanLevel } from '../../lib/place/plan';
import type { Recommendation } from '../../lib/place/recommend';
import { TYPOLOGY_LABEL } from '../../lib/place/thresholds';
import type { HudTable, PlaceMeasures, Typology } from '../../lib/place/types';
import type { TractProps } from '../../lib/types';
import { Dot, Explainer } from '../primitives';
import Affordability, { cumulative } from './Affordability';
import Flood from './Flood';
import Market from './Market';
import { toRuleLine } from './Rules';
import { BareBlock, SourceLine } from './shared';
import Tenants, { typesUpTo, TYPE_LABEL } from './Tenants';
import Transit from './Transit';
import ZoningPrograms from './ZoningPrograms';
import LandUse, { landHeadline } from './LandUse';

export function Fold({ title, headline, children }: { title: string; headline: ReactNode; children: ReactNode }) {
  return (
    <Explainer
      tone="card"
      title={
        <span className="block leading-snug">
          {title}
          <span className="font-normal text-slate-600"> · {headline}</span>
        </span>
      }
    >
      <BareBlock.Provider value>{children}</BareBlock.Provider>
    </Explainer>
  );
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export default function PlaceFolds({ t, place, hud, rec, level, fitOrder }: { t: TractProps; place: PlaceMeasures; hud: HudTable; rec: Recommendation; level: PlanLevel; fitOrder: Typology[] }) {
  const band = LEVEL_BAND[level];
  // Market rate reads the bands above 80% AMI only (CHAS types: ">80%"); the HUD levels read every band at or below.
  const c = level === 'market' ? { hh: sumBands(place, levelBands(level)).hh } : cumulative(place, band);
  const types = level === 'market' ? place.types?.gt80 ?? null : typesUpTo(place, typeBandFor(band));
  const lead = types ? (Object.entries(types) as [keyof typeof TYPE_LABEL, number][]).sort((a, b) => b[1] - a[1])[0] : null;
  const m = place.market;
  const askingShown = isNum(m.asking_2br) && m.asking_conf !== 'low';
  const tr = place.transit;
  const f = place.flood;
  const z = place.zoning;
  const byRight = z ? (Object.entries(z.by_type) as [Typology, string][]).filter(([, v]) => v === 'yes').map(([k]) => typologyById.get(k)?.label ?? TYPOLOGY_LABEL[k]) : [];
  const suggested = new Set(rec.types.map((x) => x.typology));
  const lvl = level === 'market' ? '>80% AMI' : LEVEL_LABEL[level];
  const lines = rec.lines.map((l, i) => toRuleLine(l, i, rec.stance, rec)).filter((l) => l.label !== 'You decide');

  return (
    <div className="space-y-2">
      <Fold title="Affordability" headline={c.hh == null ? 'not available' : `${fmtHouseholds(c.hh)} renters ${lvl}`}>
        <Affordability place={place} hud={hud} band={band} above80={level === 'market'} />
      </Fold>
      <Fold title="Who lives here" headline={lead && lead[1] > 0 ? `most: ${fmtHouseholds(lead[1])} ${TYPE_LABEL[lead[0]].toLowerCase()}` : 'not available'}>
        <Tenants place={place} t={t} band={typeBandFor(band)} />
      </Fold>
      <Fold title="Market" headline={askingShown ? `2-bed asks ${fmtDollars(m.asking_2br)}` : isNum(m.acs_rent) ? `median rent ${fmtDollars(m.acs_rent)}` : 'not available'}>
        <Market place={place} t={t} hud={hud} />
      </Fold>
      <Fold title="Transit" headline={isNum(tr.freq_dist_mi) ? `frequent stop ${tr.freq_dist_mi.toFixed(2)} mi` : 'not available'}>
        <Transit place={place} />
      </Fold>
      <Fold title="Flood" headline={isNum(f.fema_sfha_pct) ? `${f.fema_sfha_pct.toFixed(1)}% of land in flood zone` : 'not available'}>
        <Flood place={place} t={t} />
      </Fold>
      <Fold title="Land use" headline={landHeadline(t.GEOID)}>
        <LandUse geoid={t.GEOID} />
      </Fold>
      <Fold title="Zoning" headline={z ? (byRight.length ? `${byRight.length} type${byRight.length === 1 ? '' : 's'} by right (unverified)` : 'none by right (unverified)') : 'not checked'}>
        <ZoningPrograms place={place} />
      </Fold>
      <Fold title="Rules" headline={`${lines.length} steps`}>
        <dl className="divide-y divide-stone-100 overflow-hidden rounded-xl bg-white ring-1 ring-stone-200/80">
          {lines.map((l) => (
            <div key={l.key} className="px-3 py-2">
              <dt className="text-caption font-semibold uppercase tracking-wide text-slate-500">{l.label}</dt>
              <dd className={`mt-0.5 text-small leading-snug ${l.tone === 'warn' ? 'text-amber-900' : 'text-slate-800'}`}>{cap(l.text)}</dd>
            </div>
          ))}
        </dl>
        <SourceLine className="mt-1.5">Rules · lib/place/recommend with the thresholds in lib/place/thresholds, printed in each line · docs/assumptions.md §11.</SourceLine>
      </Fold>
      <Fold title="Fit order" headline={fitOrder[0] ? `${typologyById.get(fitOrder[0])?.label ?? cap(TYPOLOGY_LABEL[fitOrder[0]])} first` : 'not available'}>
        <ol className="space-y-1">
          {fitOrder.map((k, i) => (
            <li key={k} className="flex items-center gap-2 text-small text-slate-800">
              <span className="w-4 text-right text-caption text-slate-500 tnum">{i + 1}</span>
              <Dot color={typologyById.get(k)?.color ?? '#999'} size={9} />
              <span className="flex-1">{(typologyById.get(k)?.label ?? cap(TYPOLOGY_LABEL[k]))}</span>
              {suggested.has(k) && <span className="rounded-full bg-violet-50 px-2 py-px text-caption font-medium text-violet-700 ring-1 ring-violet-200">suggested</span>}
            </li>
          ))}
        </ol>
        <SourceLine className="mt-1.5">The order only ranks types inside the suggested set; it never adds or removes one. Change it under Advanced settings.</SourceLine>
      </Fold>
    </div>
  );
}
