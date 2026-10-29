// "Parcels" under Boundary in Explore (online only): the county's lots as the open boundary. Turning it on closes the
// other boundary (one at a time) and closes in on the map so lots show; clicking a lot shows its facts
// (components/explore/ParcelsBoundary). Loaded on demand; the offline file has no lot files.
import { getMap } from '../../lib/export/mapRegistry';
import { useParcelShadow } from '../../lib/explore/parcelShadowStore';
import { useApp, type LayerId } from '../../lib/store';
import { Switch } from './LayersPanel';

const BOUNDARIES: LayerId[] = ['tracts', 'bg', 'zcta', 'muni'];
/** Lots show from zoom 14.5; turning Parcels on closes in a little past it. */
const LOT_ZOOM = 15.2;

export default function ParcelsSwitch() {
  const on = useParcelShadow((s) => !!s.boundary);
  const pick = (v: boolean) => {
    if (v) {
      const a = useApp.getState();
      for (const id of BOUNDARIES) if (a.layers[id]) a.setLayer(id, false);
      const map = getMap('explore');
      if (map && map.getZoom() < LOT_ZOOM) map.easeTo({ zoom: LOT_ZOOM, duration: 900 });
    }
    useParcelShadow.setState({ boundary: v });
  };
  return <Switch id="layer-parcels" on={on} label="Parcels" caption="County lots, from close zoom: click one for its facts" onChange={pick} />;
}
