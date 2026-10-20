// "What can be built": Pittsburgh's zoning read for this tract (config/zoning_standards.json, from Title Nine with
// section numbers): homes allowed by right on its vacant lots and on lots holding fewer homes than allowed, the
// inclusionary overlay, a lot calculator, and the districts present with what each allows for the suggested type.
import { capitalize, fmtCount } from '../../../lib/place/format';
import type { Recommendation } from '../../../lib/place/recommend';
import { TYPOLOGY_LABEL } from '../../../lib/place/thresholds';
import { inclusionaryHomes, STANDARD_BY_CODE, STANDARDS, type TractCapacity } from '../../../lib/zoning/capacity';
import { Explainer, InfoTip } from '../../primitives';
import { SourceLine, Table } from '../shared';
import TryLot, { statusFor } from './TryLot';

export default function BuildCapacity({ geoid, cap, rec, homes, homesExample }: { geoid: string; cap: TractCapacity; rec: Recommendation; homes: number; homesExample: boolean }) {
  const inIzo = (cap.izo_share ?? 0) > 0.5;
  const setAside = inclusionaryHomes(homes, inIzo);
  const lead = rec.lead;
  const v = cap.vacant;
  const z = STANDARDS.inclusionary;
  const districts = Object.entries(cap.districts);

  return (
    <div className="space-y-2.5" data-build-capacity>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-stone-200/70 ring-1 ring-stone-200/70">
        <div className="bg-white px-3 py-2">
          <div className="flex items-center gap-1 text-caption text-slate-600">
            Homes by right on vacant lots
            <InfoTip label="About this number" width={280}>
              <span className="block text-left">
                An upper bound: slopes, rights of way, lots of record and parking are not checked.
                {v.largest && v.homes > 0 && v.largest.homes >= 0.5 * v.homes && ` One ${v.largest.acres}-acre ${v.largest.district} lot carries ${fmtCount(v.largest.homes)} of the ${fmtCount(v.homes)}.`}
                {v.below_min > 0 && ` ${fmtCount(v.below_min)} vacant lots are under their district's minimum lot size.`}
                {Object.keys(v.by_family).length > 0 && ` By district: ${Object.entries(v.by_family).sort((x, y) => y[1] - x[1]).map(([f, n]) => `${f} ${fmtCount(n)}`).join(', ')}.`}
              </span>
            </InfoTip>
          </div>
          <div className="text-lead font-semibold text-slate-900 tnum">{fmtCount(v.homes)}</div>
          <div className="text-caption text-slate-500">
            {fmtCount(v.computed)} of {fmtCount(v.lots)} vacant lots, {v.acres} acres
          </div>
        </div>
        <div className="bg-white px-3 py-2">
          <div className="text-caption text-slate-600">More homes on lived-in lots</div>
          <div className="text-lead font-semibold text-slate-900 tnum">+{fmtCount(cap.gentle.homes)}</div>
          <div className="text-caption text-slate-500">{fmtCount(cap.gentle.lots)} R2 or R3 lots below their limit</div>
        </div>
      </div>

      {inIzo && (
        <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-caption leading-snug text-amber-900 ring-1 ring-amber-200">
          Inclusionary overlay on {Math.round((cap.izo_share ?? 0) * 100)}% of the tract ({z.section}): {z.min_homes}+ homes set aside {Math.round(z.share * 100)}% at {z.ami_rental}% AMI for {z.years} years.
          {homes >= z.min_homes ? ` Your ${homes} homes: ${setAside} inclusionary.` : ` Your ${homes} homes are under the threshold.`}
        </p>
      )}
      {!inIzo && (cap.izo_share ?? 0) > 0 && <p className="text-caption text-slate-600">{Math.round((cap.izo_share ?? 0) * 100)}% of the tract is in the inclusionary overlay; check whether the site is.</p>}
      {lead === 'adu' && <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-caption leading-snug text-amber-900 ring-1 ring-amber-200">{STANDARDS.adu.rule} {STANDARDS.adu.checked}</p>}

      <TryLot geoid={geoid} cap={cap} lead={lead} homes={homes} homesExample={homesExample} />

      <Explainer title={`Zoning districts in this tract (${districts.length})`}>
        <Table
          caption="Zoning districts in the tract"
          head={['District', 'Lots', 'Homes a lot', 'Height', lead ? capitalize(TYPOLOGY_LABEL[lead]) : 'Type']}
          rows={districts.slice(0, 10).map(([code, n]) => {
            const s = STANDARD_BY_CODE.get(code);
            return {
              key: code,
              muted: !s,
              title: s ? `${s.section}: ${s.max_stories ? `${s.max_stories} stories at most; ` : ''}minimum lot ${fmtCount(s.min_lot_sqft)} sq ft; setbacks front ${s.front_ft}, rear ${s.rear_ft}, sides ${s.side_total_ft} ft in all${s.max_far ? `; FAR ${s.max_far}:1` : ''}` : STANDARDS.not_computed[code] ?? '',
              cells: [code, fmtCount(n), s ? (s.max_homes ? String(s.max_homes) : 'envelope') : '—', s ? `${s.max_height_ft} ft` : '—', lead ? statusFor(code, lead).word : '—'],
            };
          })}
        />
        <p className="mt-1 text-caption leading-snug text-slate-600">{STANDARDS.density_note} Hover a row for its section and setbacks.</p>
      </Explainer>

      <Explainer title="Parking, ADUs and pending changes">
        <ul className="list-disc space-y-1 pl-4 text-caption leading-snug text-slate-700">
          {STANDARDS.parking.rules.map((r) => (
            <li key={r.use}>
              {r.use}: {r.min_per_home == null ? r.note : `at least ${r.min_per_home} and at most ${r.max_per_home} spaces a home`}.
            </li>
          ))}
          <li>{STANDARDS.parking.reductions}</li>
          <li>{STANDARDS.parking.reform}</li>
          <li>
            {STANDARDS.adu.rule} {STANDARDS.adu.checked}
          </li>
          <li>{z.proposed}</li>
          <li>{STANDARDS.contextual_note}</li>
        </ul>
      </Explainer>

      <SourceLine className="px-1">
        Source · {STANDARDS.code}, current through {STANDARDS.current_through}, read {STANDARDS.read_on}:{' '}
        {STANDARDS.sources.map((s, i) => (
          <span key={s.url}>
            {i > 0 && '; '}
            <a className="underline hover:text-slate-800" href={s.url} target="_blank" rel="noreferrer">
              {s.section}
            </a>
          </span>
        ))}{' '}
        · WPRDC zoning districts and county parcels (tract totals only) · IZ-O: {z.areas_source} · Not legal advice: confirm with the Zoning Administrator · docs/data/zoning_capacity.md, docs/assumptions.md §16.
      </SourceLine>
    </div>
  );
}
