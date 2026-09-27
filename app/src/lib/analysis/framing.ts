// The opening camera of the Analysis map: the whole city inside the space the floating panels leave.
//
// MapView takes an `initialView` (center, zoom, pitch, bearing) and never pads the map itself, so the center must
// be offset for the panels here. The camera model below is MapLibre's (a perspective camera at 1.5 × the map height,
// field of view 36.87°), so a fit can be checked under the pitch and bearing the map will actually show.
// Below the far-view threshold (lib/farView) MapView lays the map flat, so the fit is checked flat there.
import { cityBounds, farZoom, zoomToFit } from '../farView';
import type { Bounds } from '../geo';

export interface View {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}
export interface Pad {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** The same camera as PGH_VIEW in lib/mapStyle, which is not imported here because that module loads the map library. */
export const CITY_BASE: View = { center: [-79.985, 40.44], zoom: 11.6, pitch: 50, bearing: -15 };
/** Zoom levels given back for a tilted camera, as MapView does when it flies to a tract. */
export const PITCH_ALLOWANCE = 0.35;
/** MapLibre's default vertical field of view, radians (36.87°). */
export const FOV = 0.6435011087932844;
/** A padded box narrower or shorter than this is ignored: better a map under a panel than no map. */
const MIN_BOX = 40;

const mx = (lng: number) => (lng + 180) / 360;
const my = (lat: number) => (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2;
const lng = (x: number) => x * 360 - 180;
const lat = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Screen position (pixels from the top-left) of a point under a camera, for a map of this size. */
export function project(p: [number, number], v: View, width: number, height: number): [number, number] {
  const ws = 512 * 2 ** v.zoom;
  const dx = (mx(p[0]) - mx(v.center[0])) * ws, dy = (my(p[1]) - my(v.center[1])) * ws;
  const b = rad(v.bearing), t = rad(v.pitch);
  // ground-plane offsets: right of the view's up direction, and forward (up on screen)
  const u = dx * Math.cos(b) + dy * Math.sin(b);
  const f = dx * Math.sin(b) - dy * Math.cos(b);
  const D = (0.5 * height) / Math.tan(FOV / 2);
  const depth = D + f * Math.sin(t);
  return [width / 2 + (D * u) / depth, height / 2 - (D * f * Math.cos(t)) / depth];
}

/** The map center that puts `target` at the center of the padded box under this zoom, pitch and bearing. */
export function centerFor(target: [number, number], zoom: number, pitch: number, bearing: number, height: number, pad: Pad): [number, number] {
  const ox = (pad.left - pad.right) / 2, oy = (pad.top - pad.bottom) / 2;
  const b = rad(bearing), t = rad(pitch);
  const D = (0.5 * height) / Math.tan(FOV / 2);
  const f = (-oy * D) / (D * Math.cos(t) + oy * Math.sin(t));
  const u = (ox * (D + f * Math.sin(t))) / D;
  const dx = u * Math.cos(b) + f * Math.sin(b), dy = u * Math.sin(b) - f * Math.cos(b);
  const ws = 512 * 2 ** zoom;
  return [lng(mx(target[0]) - dx / ws), lat(my(target[1]) - dy / ws)];
}

const usable = (width: number, height: number, pad: Pad): Pad => (width - pad.left - pad.right >= MIN_BOX && height - pad.top - pad.bottom >= MIN_BOX ? pad : { top: 0, right: 0, bottom: 0, left: 0 });

/** True when the box's four corners all land inside the padded box under this camera. */
export function fits(b: Bounds, v: View, width: number, height: number, pad: Pad, tol = 0.5): boolean {
  const [[w, s], [e, n]] = b;
  const corners: [number, number][] = [[w, s], [w, n], [e, s], [e, n]];
  return corners.every(([x, y]) => {
    const [px, py] = project([x, y], v, width, height);
    return px >= pad.left - tol && px <= width - pad.right + tol && py >= pad.top - tol && py <= height - pad.bottom + tol;
  });
}

/**
 * A camera that shows the whole box inside the padded part of a map this size: the flat fit, less the pitch
 * allowance, then zoomed out in small steps until the corners are inside under the pitch the map will show
 * (flat below `flatBelow`, the far-view threshold). The returned pitch is the base pitch either way, so MapView
 * keeps the tilt to give back when the reader zooms in.
 */
export function viewFor(b: Bounds, width: number, height: number, pad: Pad, base: View = CITY_BASE, flatBelow: number | null = null): View {
  const p = usable(width, height, pad);
  const mid: [number, number] = [lng((mx(b[0][0]) + mx(b[1][0])) / 2), lat((my(b[0][1]) + my(b[1][1])) / 2)];
  const z0 = zoomToFit(b, width - p.left - p.right, height - p.top - p.bottom) - (base.pitch > 0 ? PITCH_ALLOWANCE : 0);
  let out: View = { ...base, zoom: z0 };
  for (let k = 0; k <= 60; k++) {
    const zoom = z0 - k * 0.05;
    const pitch = flatBelow != null && zoom < flatBelow ? 0 : base.pitch;
    const center = centerFor(mid, zoom, pitch, base.bearing, height, p);
    out = { center, zoom, pitch: base.pitch, bearing: base.bearing };
    if (fits(b, { ...out, pitch }, width, height, p)) break;
  }
  return out;
}

/** The pitch MapView will show at this zoom on a map this size: flat below the far-view threshold. */
export function shownPitch(v: View, width: number, height: number): number {
  const far = farZoom(width, height);
  return far != null && v.zoom < far ? 0 : v.pitch;
}

/** The city inside the padded box on a map of this size, or null without tract data. */
export function cityView(width: number, height: number, pad: Pad, base: View = CITY_BASE): View | null {
  const b = cityBounds();
  if (!b || !(width > 0) || !(height > 0)) return null;
  return viewFor(b, width, height, pad, base, farZoom(width, height));
}
