// What a picked lot is, read from the county's lot files: its number, use, area, zoning district, rough shape, the
// homes on it today, the inclusionary overlay at the pin and its hours of direct sun on three days. Lot facts only.
// Online only: loaded on demand.
import type { ReactNode } from 'react';
import { lotName, lotSize } from '../../../lib/explore/parcelShadow';
import { lotSunHours, useLotManifest } from './lotSun';
import type { SiteLot } from '../../../lib/project/store';
import { districtName, STANDARD_BY_CODE } from '../../../lib/zoning/capacity';

const USE_WORD: Record<string, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  industrial: 'Industrial',
  vacant: 'Vacant land',
  institutional: 'Institutional',
  other: 'Other use',
  unrecorded: 'No assessment record',
};

const Row = ({ k, children, title }: { k: string; children: ReactNode; title?: string }) => (
  <div className="flex items-baseline justify-between gap-3 px-2.5 py-1.5" title={title}>
    <dt className="text-slate-700">{k}</dt>
    <dd className="text-right font-medium text-slate-900">{children}</dd>
  </div>
);

/** `zoning` false: the district row is left out (LotZoning shows the zoning beside it). */
export default function LotCard({ lot, izo, zoning = true }: { lot: SiteLot; izo: boolean | null | undefined; zoning?: boolean }) {
  const m = useLotManifest();
  const hours = lotSunHours(lot, m);
  const std = lot.district ? STANDARD_BY_CODE.get(lot.district) : undefined;
  return (
    <dl className="divide-y divide-stone-100 overflow-hidden rounded-xl bg-white text-small ring-1 ring-stone-200/80" data-lot-card>
      <Row k="Lot">{lotName(lot.label)}</Row>
      <Row k="Use today">{USE_WORD[lot.use] ?? lot.use}</Row>
      <Row k="Lot area" title="The county assessment's lot area, or the lot outline's own area where the assessment has none">
        {lotSize(lot.sqft)}
      </Row>
      {zoning && (
        <Row k="Zoning" title="The district at the lot's center on the City's zoning map; confirm with the Zoning Administrator">
          {lot.district ? `${lot.district} · ${districtName(lot.district)}${std ? '' : ' (no standards here)'}` : 'not read'}
        </Row>
      )}
      {lot.frontageFt != null && lot.depthFt != null && (
        <Row k="Shape" title="The short and long sides of the lot's smallest enclosing rectangle, scaled to its area: a rough reading">
          about {lot.frontageFt} × {lot.depthFt} ft
        </Row>
      )}
      <Row k="Homes today">{lot.existing == null ? 'not recorded' : lot.existing}</Row>
      {zoning && izo != null && <Row k="Inclusionary overlay">{izo ? 'yes, at the pin' : 'no'}</Row>}
      {hours && hours.some((h) => h != null) && (
        <Row k="Direct sun" title="Hours of direct sun on the lot (roof, yard and trees together) on June 21, September 22 and December 21, from the 2015 lidar surface">
          {['Jun', 'Sep', 'Dec'].map((d, i) => (hours[i] == null ? null : `${d} ${hours[i]!.toFixed(1)} h`)).filter(Boolean).join(' · ')}
        </Row>
      )}
    </dl>
  );
}
