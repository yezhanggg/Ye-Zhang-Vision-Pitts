// Picking a site at the Parcel level: the lot goes into its tract's site (lib/project/store Site.lot) with its facts
// filling the lot inputs (district, area, frontage; all still editable), the pin moves onto it unless it came from an
// address, and its tract is selected. With a `side` (Compare places) the lot goes into that side's settings and the
// pin and the selection are left to the caller. Online only: loaded on demand.
import { tractAt } from '../data';
import { lotName } from '../explore/parcelShadow';
import { setProjectBoth } from '../project/draft';
import type { Side } from '../project/side';
import type { ProjectState, SiteLot } from '../project/store';
import { useApp } from '../store';

export function pickLot(lot: SiteLot, opts: { keepPin?: boolean; side?: Side } = {}): string | null {
  const g = tractAt(lot.point[0], lot.point[1]);
  if (!g) return null;
  const put = (s: ProjectState) => ({
    sites: { ...s.sites, [g]: { ...s.sites[g], lot, district: lot.district ?? s.sites[g]?.district, lotSqft: lot.sqft, frontageFt: lot.frontageFt } },
  });
  if (opts.side) {
    opts.side.project.setState(put);
    return g;
  }
  setProjectBoth(put);
  const app = useApp.getState();
  if (!opts.keepPin) app.set({ pin: { lng: lot.point[0], lat: lot.point[1], label: lotName(lot.label) } });
  if (app.selectedId !== g) app.select(g);
  return g;
}

/** Forget the lot picked in a tract (the typed lot inputs stay), on a side (the Place tab's settings by default). */
export function clearLot(geoid: string, side?: Side) {
  const drop = (s: ProjectState) => {
    const site = s.sites[geoid];
    if (!site?.lot) return {};
    const { lot: _drop, ...rest } = site;
    return { sites: { ...s.sites, [geoid]: rest } };
  };
  if (side) side.project.setState(drop);
  else setProjectBoth(drop);
}

/** Whether a pin sits where a lot's pin was put (so reading the lot again is not needed). */
export const samePoint = (a: [number, number] | null | undefined, lng: number, lat: number) => !!a && Math.abs(a[0] - lng) < 1e-7 && Math.abs(a[1] - lat) < 1e-7;
