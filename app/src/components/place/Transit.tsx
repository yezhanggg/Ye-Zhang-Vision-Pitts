// Block D: transit, one definition. The share of residents within a quarter mile of a frequent stop (at least 64
// weekday departures: one bus or T every 15 minutes or better over a 16-hour day), the distance to the nearest
// frequent stop, and the weekday departures within a quarter mile.
import { isNum } from '../../lib/format';
import type { PlaceMeasures } from '../../lib/place/types';
import { Block, Facts, NA, int, miles, na, share } from './shared';

export default function Transit({ place }: { place: PlaceMeasures }) {
  const x = place.transit;
  const sentence =
    x.freq_share_qmi == null && x.freq_dist_mi == null && x.departures_qmi == null ? (
      <>Transit measures: {NA} for this tract.</>
    ) : (
      <>
        <b className="text-slate-900">{na(x.freq_share_qmi, (v) => share(v))}</b> of residents live within a quarter mile of a frequent stop (one bus or T every 15 minutes or better); the nearest frequent stop is <b className="text-slate-900">{na(x.freq_dist_mi, miles)}</b> from where residents live (the average over the tract’s blocks, weighted by population); <b className="text-slate-900">{na(x.departures_qmi, int)}</b> weekday departures leave from stops within a quarter mile.
      </>
    );
  return (
    <Block title="Transit" sub="Frequent service within walking distance, not just any stop." sentence={sentence} source={<>Source · Pittsburgh Regional Transit GTFS, June 2026 weekday schedule · 2020 census blocks for where residents live · Frequent = at least 64 weekday departures at the stop · Distances are straight-line from each 2020 block to its nearest frequent stop, averaged over the tract's residents · It measures the schedule, not reliability.</>}>
      <Facts
        items={[
          { key: 'share', k: 'Residents within ¼ mile of a frequent stop', v: na(x.freq_share_qmi, (v) => share(v)) },
          { key: 'dist', k: 'Nearest frequent stop', v: na(x.freq_dist_mi, miles) },
          { key: 'any', k: 'Nearest stop of any kind', v: na(x.any_dist_mi, miles) },
          { key: 'dep', k: 'Weekday departures within ¼ mile', v: isNum(x.departures_qmi) ? int(x.departures_qmi) : NA },
        ]}
      />
    </Block>
  );
}
