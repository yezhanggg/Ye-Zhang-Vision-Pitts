// A picked lot's hours of direct sun on the shadow run's three days (June 21, September 22, December 21), from the
// share of each day it spends in shadow (Site.lot.shade) and the days' lengths in the lots' manifest.
// Online only: loaded on demand.
import { useEffect, useState } from 'react';
import { sunHours, type ParcelManifest } from '../../../lib/explore/parcelShadow';
import { loadLotManifest } from '../../../lib/parcel/lots';
import type { SiteLot } from '../../../lib/project/store';

export function useLotManifest(): ParcelManifest | null {
  const [m, setM] = useState<ParcelManifest | null>(null);
  useEffect(() => {
    let live = true;
    void loadLotManifest().then((got) => live && setM(got));
    return () => {
      live = false;
    };
  }, []);
  return m;
}

export function lotSunHours(lot: Pick<SiteLot, 'shade'>, m: Pick<ParcelManifest, 'days' | 'stepMinutes'> | null): (number | null)[] | null {
  if (!m) return null;
  return lot.shade.map((s, d) => (s == null || !m.days[d] ? null : sunHours(s, m.days[d], m.stepMinutes)));
}

/** "8.8 h on Sep 22 (11.7 in June, 4.2 in December)", or null when the lot is not rated. */
export function lotSunWords(lot: Pick<SiteLot, 'shade'>, m: Pick<ParcelManifest, 'days' | 'stepMinutes'> | null): string | null {
  const h = lotSunHours(lot, m);
  if (!h || h[1] == null) return null;
  const extra = [h[0] != null ? `${h[0].toFixed(1)} in June` : null, h[2] != null ? `${h[2].toFixed(1)} in December` : null].filter(Boolean).join(', ');
  return `${h[1].toFixed(1)} h on Sep 22${extra ? ` (${extra})` : ''}`;
}
