// Who rents in a ZIP code (the whole census ZCTA), against the city: the demand signals the Place page reads, renter
// households by size and the homes they rent, and the tax credit homes in the ZIP. Loaded on demand; online only.
import { DEMAND, demandCity, demandZip } from '../../../lib/demand/data';
import { compareGroups, SIZE_GROUP_HOUSEHOLDS, SIZE_GROUP_SHORT } from '../../../lib/demand/mix';
import { readSignal, SIGNAL_KEYS, SIGNAL_LABEL, SIGNAL_SHORT } from '../../../lib/demand/signals';
import type { Share } from '../../../lib/demand/types';
import { fmtCount, fmtShare, isNum } from '../../../lib/place/format';
import { SourceLine, Table } from '../shared';

const pp = (s: Share | null) => (s && isNum(s[0]) ? `${fmtShare(s[0])}${isNum(s[1]) ? ` ±${Math.round(s[1] * 100)}` : ''}` : 'n/a');

export default function ZipDemand({ zip }: { zip: string }) {
  const u = demandZip(zip);
  const city = demandCity();
  if (!u) return null;
  const lt = u.lihtc;
  return (
    <section className="rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200" data-zip-demand>
      <h3 className="text-small font-semibold text-slate-900">Who rents in the whole ZIP</h3>
      <p className="mt-0.5 text-caption leading-snug text-slate-600">ACS {DEMAND.acs} for the census ZCTA, including any part outside the city. {isNum(u.renters[0]) ? `${fmtCount(u.renters[0])} renter households.` : ''}</p>
      <Table
        caption="Renter demand in the ZIP"
        head={['', 'ZIP', 'City']}
        rows={SIGNAL_KEYS.map((k) => {
          const s = readSignal(k, u, null, city);
          const v = <span className={s.dir ? 'whitespace-nowrap font-semibold text-violet-800' : 'whitespace-nowrap'}>{pp(s.tract)}{s.dir ? (s.dir === 'up' ? ' ↑' : ' ↓') : ''}</span>;
          return { key: k, title: `${SIGNAL_LABEL[k]}: ${s.sentence}`, cells: [SIGNAL_SHORT[k], v, isNum(s.city) ? fmtShare(s.city) : 'n/a'] };
        })}
      />
      <Table
        caption="Renter households by size and renter homes by bedrooms"
        head={['', 'Households', 'Homes']}
        rows={compareGroups(u).map((g) => ({
          key: g.group,
          title: g.sentence,
          cells: [`${SIZE_GROUP_SHORT[g.group]} · ${SIZE_GROUP_HOUSEHOLDS[g.group]}`, isNum(g.households.value) ? fmtCount(g.households.value) : 'n/a', isNum(g.homes.value) ? fmtCount(g.homes.value) : 'n/a'],
        }))}
      />
      {lt && (
        <p className="mt-2 text-small leading-snug text-slate-800">
          Tax credit homes in the ZIP: <b>{fmtCount(lt.li_units)}</b> in {lt.projects} {lt.projects === 1 ? 'property' : 'properties'}, {fmtCount(lt.li_units_recent)} placed in service {DEMAND.lihtc.as_of - DEMAND.lihtc.recent_years} or later.
        </p>
      )}
      <SourceLine className="mt-1.5">Source · ACS {DEMAND.acs} B25009, B25042, B25007, B25032 · HUD tax credit property database · signals as on the Place page (docs/assumptions.md §15).</SourceLine>
    </section>
  );
}
