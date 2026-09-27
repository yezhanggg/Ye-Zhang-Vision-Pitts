// Block B: who lives here. The household types of the renters at or below 50% AMI (CHAS household type × income
// band), then the type table across the four bands CHAS gives, with the 65+ share as context.
import { isNum } from '../../lib/format';
import type { HouseholdType, PlaceMeasures, TypeBandId } from '../../lib/place/types';
import type { TractProps } from '../../lib/types';
import { BAND_LABEL, Block, NA, TYPE_BAND_IDS, Table, int, share } from './shared';

export const TYPE_LABEL: Record<HouseholdType, string> = {
  elderly_alone: 'Seniors living alone',
  elderly_family: 'Senior families',
  small_family: 'Small families (2–4)',
  large_family: 'Large families (5+)',
  other: 'Other households',
};
export const TYPE_IDS: HouseholdType[] = ['elderly_alone', 'elderly_family', 'small_family', 'large_family', 'other'];

/** Household types summed over the bands at or below `upTo`; null when the tract has no type table. */
export function typesUpTo(p: PlaceMeasures, upTo: TypeBandId = 'b30_50'): Record<HouseholdType, number> | null {
  const ids = TYPE_BAND_IDS.slice(0, TYPE_BAND_IDS.indexOf(upTo) + 1);
  const rows = ids.map((id) => p.types?.[id]).filter((r): r is Record<HouseholdType, number> => !!r);
  // Null everywhere is "not available", not zero: the pipeline writes null when CHAS carries no type table.
  if (!rows.length || !rows.some((r) => TYPE_IDS.some((k) => isNum(r[k])))) return null;
  const out = Object.fromEntries(TYPE_IDS.map((k) => [k, 0])) as Record<HouseholdType, number>;
  for (const r of rows) for (const k of TYPE_IDS) out[k] += isNum(r[k]) ? r[k] : 0;
  return out;
}

export default function Tenants({ place, t, band = 'b30_50' }: { place: PlaceMeasures; t: TractProps; band?: TypeBandId }) {
  const s = typesUpTo(place, band);
  const anyTable = TYPE_BAND_IDS.some((id) => TYPE_IDS.some((k) => isNum(place.types?.[id]?.[k])));
  const total = s ? TYPE_IDS.reduce((a, k) => a + s[k], 0) : null;
  const seniors = s ? s.elderly_alone + s.elderly_family : null;
  const sentence =
    !s || total == null ? (
      <>
        Household types by income band: {NA} for this tract.
        {isNum(t.age65_share) && <> Across the whole tract, {share(t.age65_share)} of residents are 65 or older.</>}
      </>
    ) : total === 0 ? (
      <>No renter households at or below {band === 'le30' ? '30%' : band === 'b30_50' ? '50%' : '80%'} of area median income are recorded here.</>
    ) : (
      <>
        Of the <b className="text-slate-900">{int(total)}</b> renter households at or below {band === 'le30' ? '30%' : band === 'b30_50' ? '50%' : '80%'} AMI, <b className="text-slate-900">{int(seniors ?? 0)}</b> are seniors ({int(s.elderly_alone)} living alone), <b className="text-slate-900">{int(s.small_family)}</b> small families, <b className="text-slate-900">{int(s.large_family)}</b> large families and <b className="text-slate-900">{int(s.other)}</b> other households.
        {isNum(t.age65_share) && <> Across the whole tract, {share(t.age65_share)} of residents are 65 or older.</>}
      </>
    );
  return (
    <Block title="Who lives here" sub="Renter household types by income band; the type sets the bedrooms a home needs." sentence={sentence} source={<>Source · HUD CHAS 2018–22 (renter household type × HAMFI band; the top band is &gt; 80%, CHAS gives no 80–100 split) · ACS 2020–24 B01001 for the 65+ share · Seniors = householder 62 or older in CHAS.</>}>
      {anyTable && (
        <Table
          caption="Renter household types by AMI band"
          head={['Household type', ...TYPE_BAND_IDS.map((id) => BAND_LABEL[id])]}
          rows={TYPE_IDS.map((k) => ({ key: k, cells: [TYPE_LABEL[k], ...TYPE_BAND_IDS.map((id) => (isNum(place.types?.[id]?.[k]) ? int(place.types[id][k]) : <span className="text-slate-500">{NA}</span>))] }))}
        />
      )}
    </Block>
  );
}
