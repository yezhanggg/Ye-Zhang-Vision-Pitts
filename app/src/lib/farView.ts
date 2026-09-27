// When the map is zoomed out far enough to take in the land five miles around the Pittsburgh city limits, it lies
// flat; zoomed back in, it tilts again. The threshold is a zoom level worked out from the city's bounds and the size
// of the map on screen. Pure functions, so they can be tested without a map.
import { tractBounds } from './data';
import { unionBounds, type Bounds } from './geo';

export const FAR_MILES = 5;
/** Zoom levels of slack before the tilt comes back, so the map does not flip back and forth at the threshold. */
export const FAR_SLACK = 0.25;
const MILES_PER_DEG_LAT = 69.05;

/** A box grown by `miles` on every side. */
export function grow(b: Bounds, miles: number): Bounds {
  const [[w, s], [e, n]] = b;
  const dLat = miles / MILES_PER_DEG_LAT;
  const dLng = miles / (MILES_PER_DEG_LAT * Math.cos((((s + n) / 2) * Math.PI) / 180));
  return [[w - dLng, s - dLat], [e + dLng, n + dLat]];
}

const mx = (lng: number) => (lng + 180) / 360;
const my = (lat: number) => (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2;
/** The zoom at which a box exactly fits a map of this size, looking straight down (512-pixel world at zoom 0). */
export function zoomToFit(b: Bounds, width: number, height: number): number {
  const [[w, s], [e, n]] = b;
  const dx = Math.abs(mx(e) - mx(w)), dy = Math.abs(my(s) - my(n));
  if (!(dx > 0) || !(dy > 0) || !(width > 0) || !(height > 0)) return 0;
  return Math.log2(Math.min(width / dx, height / dy) / 512);
}

/** The city limits as the box around every city tract, or null without data. */
export const cityBounds = (): Bounds | null => unionBounds(tractBounds.values());

/** The zoom below which a map of this size shows the city and five miles around it. */
export function farZoom(width: number, height: number, miles = FAR_MILES): number | null {
  const city = cityBounds();
  return city ? zoomToFit(grow(city, miles), width, height) : null;
}

/** Far or not, given where it was: below the threshold it is far, and it stays far until the zoom clears the slack. */
export const isFar = (zoom: number, threshold: number, was: boolean) => (was ? zoom < threshold + FAR_SLACK : zoom < threshold);
