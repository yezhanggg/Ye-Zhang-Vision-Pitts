// "Open space and sun", the fifth question of the project card: whether the building and its open space fit on the lot
// tried under Site, and how much direct sun the tract's vacant and park-zoned lots get (lib/policy/sun, from the 2015
// surface shadow run). Pittsburgh has no sunlight rule, so the yardstick is borrowed and labelled.
import { cx } from '../../../lib/format';
import { DEFAULT_OPEN_SHARE, OPEN_TYPE_LABEL, openFit, SUN, sunFor, type SunGroup } from '../../../lib/policy/sun';
import { useSide } from '../../../lib/project/side';
import type { Recommendation } from '../../../lib/place/recommend';
import { STANDARD_BY_CODE, type TractCapacity } from '../../../lib/zoning/capacity';
import { SourceLine, Table } from '../shared';
import type { Headline } from './summary';
import { useLot } from './TryLot';
import type { ProjectModel } from './useProjectModel';

/** The lot's fit and the tract's sun, for the headline and the body. */
export function useOpenSun(geoid: string, m: ProjectModel, cap: TractCapacity | null, rec: Recommendation | null) {
  const side = useSide();
  const share = side.project((s) => s.openShare ?? DEFAULT_OPEN_SHARE);
  const type = side.project((s) => s.openType ?? 'shared');
  const stories = side.project((s) => s.stories) ?? 1;
  const lot = useLot({ geoid, cap: cap ?? { lots: 0, vacant: { lots: 0, acres: 0, median_sqft: null, computed: 0, below_min: 0, homes: 0, by_family: {}, largest: null }, gentle: { lots: 0, homes: 0 }, districts: {}, izo_share: null }, lead: rec?.lead ?? null, homes: m.mix.homes, homesExample: m.mix.example });
  const fit = cap ? openFit(m.mix.counts, m.mix.homes, stories, m.args.inputs.unitSf, m.args.inputs.efficiency, lot.lotSqft, share, STANDARD_BY_CODE.get(lot.district)?.max_coverage ?? null) : null;
  return { share, type, stories, lot, fit, sun: sunFor(geoid) };
}

export function openHeadline(o: ReturnType<typeof useOpenSun>): Headline {
  const v = o.sun?.vacant;
  return {
    value: o.fit ? (o.fit.fits ? 'fits on the lot' : 'too big for the lot') : 'no lot',
    tone: o.fit ? (o.fit.fits ? 'good' : 'bad') : 'plain',
    sub: `${Math.round(o.share * 100)}% open space · ${v ? `${v.bre} of ${v.lots} vacant lots here meet the sun yardstick` : 'no rated vacant lots here'}`,
  };
}

const row = (label: string, g: SunGroup | undefined) => ({
  key: label,
  cells: g ? [label, g.lots.toLocaleString('en-US'), g.bre.toLocaleString('en-US'), g.winter2.toLocaleString('en-US')] : [label, '0', '—', '—'],
});
const hours = (label: string, g: SunGroup | undefined) => (g ? `${label} ${g.sun_h.jun} / ${g.sun_h.sep} / ${g.sun_h.dec} h, ${g.ceqr6.toLocaleString('en-US')} of ${g.lots.toLocaleString('en-US')} with 6+ h on Sep 22` : null);

export default function OpenSun({ o }: { o: ReturnType<typeof useOpenSun> }) {
  const t = o.sun;
  const c = SUN.city;
  return (
    <div className="space-y-2.5" data-open-sun>
      {o.fit ? (
        <p className={cx('rounded-lg px-2.5 py-1.5 text-small leading-snug ring-1', o.fit.fits ? 'bg-emerald-50 text-emerald-900 ring-emerald-200' : 'bg-rose-50 text-rose-900 ring-rose-200')}>
          {o.fit.fits ? 'Fits: ' : `Does not fit; about ${o.fit.homesThatFit} homes do at ${o.stories} stories, or add a story. `}
          {o.fit.formula}. {OPEN_TYPE_LABEL[o.type]}, {Math.round(o.share * 100)}% of the {o.lot.lotSqft.toLocaleString('en-US')} sq ft lot in {o.lot.district}. Home sizes and net-to-gross are the pencil's examples.
        </p>
      ) : (
        <p className="text-small text-slate-600">No zoning read for this tract, so no lot to test.</p>
      )}
      <Table
        caption="Sun on the tract's lots (the city in the last two rows)"
        head={['Rated lots', 'Count', 'Meet it Sep 22', 'Dec 21']}
        rows={[row('Vacant here', t?.vacant), row('Park-zoned here', t?.park), row('Vacant, city', c.vacant), row('Park-zoned, city', c.park)]}
      />
      <p className="text-caption leading-snug text-slate-600">
        Median hours of direct sun, Jun 21 / Sep 22 / Dec 21: {[hours('vacant lots here', t?.vacant), hours('park-zoned lots here', t?.park)].filter(Boolean).join('; ') || 'no rated lots here'}.
      </p>
      <ul className="list-disc space-y-1 pl-4 text-caption leading-snug text-slate-700">
        <li>Yardstick: {SUN.yardstick.rule} Read per lot as the hours with at least half the lot in sun, so the sunny half may move during the day.</li>
        <li>For lawns and play fields NYC's environmental review asks for {SUN.yardstick.ceqr_lawn} hours of sun ({SUN.yardstick.ceqr_planted} for planted areas); the "6 h" column is that stricter reference, on the lot's own hours.</li>
        <li>On Sep 22 most lots meet the yardstick; Dec 21 is the harder test at Pittsburgh's latitude.</li>
        <li>The shadow run is the 2015 surface: your new building's own shadow is not in it, trees count as solid shadow, and sun counts from 2° above the horizon. Park-zoned lots are those in a parks zoning district, not every park.</li>
      </ul>
      <SourceLine>Source · PASDA 2015 surface model, shadow run of Oct 2026 · county parcels · city zoning districts · built {SUN.built} by scripts/20_build_sun_tract.py · docs/data/shadow.md</SourceLine>
    </div>
  );
}
