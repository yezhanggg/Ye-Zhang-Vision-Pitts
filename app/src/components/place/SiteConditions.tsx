// Sun, shade and trees for a place on Analysis > Place: hours of direct sun on its lots in three seasons, tree canopy,
// and how many of its vacant lots are large, open and sunny enough to look at. Measured figures only; nothing here
// enters a score. Loaded on demand and left out of the offline single file.
import { isNum } from '../../lib/format';
import { site, siteFor } from '../../lib/lihtc/place';
import { Fold } from './PlaceFolds';
import { Block, Facts, NA, Table, int, na, share } from './shared';

const DAYS = ['Summer (June 21)', 'Spring or fall (September 22)', 'Winter (December 21)'];
const hours = (v: number) => `${v.toFixed(1)} h`;
const acres = (v: number) => `${v.toFixed(1)} acres`;
const at = (a: (number | null)[] | null | undefined, i: number) => (a && isNum(a[i]) ? (a[i] as number) : null);

export default function SiteConditions({ geoid }: { geoid: string }) {
  const s = siteFor(geoid);
  if (!s) return null;
  const city = site.city;
  const winter = at(s.sun, 2);
  const headline = [isNum(winter) ? `${hours(winter)} of winter sun` : null, isNum(s.canopy) ? `${share(s.canopy)} tree canopy` : null].filter(Boolean).join(' · ') || NA;
  const sentence = (
    <>
      On the shortest day the lots here get <b className="text-slate-900">{na(winter, hours)}</b> of direct sun out of {site.day_hours[2]} (city: {na(at(city.sun, 2), hours)}), and on the longest <b className="text-slate-900">{na(at(s.sun, 0), hours)}</b> out of {site.day_hours[0]}. Tree canopy covers <b className="text-slate-900">{na(s.canopy, (v) => share(v))}</b> of the land (city: {na(city.canopy, (v) => share(v))}).
    </>
  );
  return (
    <Fold title="Sun, shade and trees" headline={headline}>
      <Block
        title="Sun, shade and trees"
        sentence={sentence}
        source={
          <>
            Source · Sun and shadow: 2015 lidar surface (PASDA), clear-sky shadows at half-hour steps on three days, averaged over the tract’s lots by area, each lot as seen from above (roof, yard and tree tops together) · Tree canopy: 2020 lidar canopy (Tree Pittsburgh and the University of Vermont, PASDA) as a share of land · Vacant lots: Allegheny County assessments, 2026 · PHFA gives no points for sun or trees themselves; they bear on the energy and green building lines of the score sheet · docs/data/canopy.md, docs/data/shadow.md.
          </>
        }
      >
        <Table
          caption="Hours of direct sun on the lots of this place, by season"
          head={['Day', 'Sun here', 'City', 'In shadow']}
          rows={DAYS.map((d, i) => ({ key: d, cells: [d, na(at(s.sun, i), hours), na(at(city.sun, i), hours), na(at(s.shade, i), (v) => share(v))] }))}
        />
        <Facts
          items={[
            { key: 'canopy', k: 'Tree canopy, share of land', v: `${na(s.canopy, (v) => share(v))}${isNum(s.canopy_acres) ? ` · ${acres(s.canopy_acres)}` : ''}` },
            { key: 'vacant', k: 'Vacant lots', v: na(s.vacant, int) },
            { key: 'big', k: '… of 2,000 sq ft or more', v: na(s.vacant_2k, int) },
            { key: 'open', k: '… and less than half under trees', v: `${na(s.vacant_open, int)}${isNum(s.vacant_open_acres) ? ` · ${acres(s.vacant_open_acres)}` : ''}`, title: 'Many vacant lots in Pittsburgh are wooded hillsides. This counts the ones that are mostly open.' },
            { key: 'sunny', k: '… and in sun at least half of the shortest day', v: `${na(s.vacant_sunny, int)}${isNum(s.vacant_sunny_acres) ? ` · ${acres(s.vacant_sunny_acres)}` : ''}` },
          ]}
        />
      </Block>
    </Fold>
  );
}
