// On/off and playback state of the sun-and-shadow layer. Kept out of the app store (not part of the link), like the
// zoning and land-use maps, and kept apart from the layer's own code so the offline single file carries only this.
import { create } from 'zustand';
import { useApp } from '../store';
import { isPhone } from '../viewport';

/** `parcel` colors each lot by its share of the day in shadow (drawn by the lot layer; the shadow picture shows hours of sun where lots are not drawn). */
export type SunView = 'shadow' | 'hours' | 'parcel';

export interface SunState {
  on: boolean;
  /** Day id from the manifest ('jun21', ...); null until the manifest has loaded. */
  day: string | null;
  /** Position in the day as a fractional step index (2.5 = halfway between the third and fourth half hour). */
  t: number;
  playing: boolean;
  view: SunView;
  /** Map bearing, so the sun dial turns with the map. */
  bearing: number;
  /** Map pages still on their way. */
  loading: boolean;
  /** The data could not be loaded (no manifest on this deployment). */
  failed: boolean;
}

export const useSunShadow = create<SunState>(() => ({ on: false, day: null, t: 0, playing: false, view: 'shadow', bearing: 0, loading: false, failed: false }));

/**
 * Why the layer cannot run here, or null when it can. The pages are fetched at runtime, so the offline single file
 * (and any page opened from disk) does not have them.
 */
export function sunShadowUnavailable(protocol: string, mode: string): string | null {
  if (mode === 'export' || protocol === 'file:') return 'Needs the online version';
  return null;
}

export const sunShadowBlocked: string | null = (() => {
  try {
    return sunShadowUnavailable(typeof location === 'undefined' ? '' : location.protocol, import.meta.env.MODE);
  } catch {
    return null;
  }
})();

/** Turn the layer on or off. It is drawn flat on the ground, so 3D terrain goes off with it (see the subscription below). */
export function setSunShadow(on: boolean) {
  if (on && sunShadowBlocked) return;
  if (on && useApp.getState().layers.terrain) useApp.getState().setLayer('terrain', false);
  // On a phone the control takes the place of the Explore panel, which folds away.
  if (on && isPhone()) useApp.getState().setUi({ left: false });
  useSunShadow.setState(on ? { on: true, failed: false } : { on: false, playing: false });
}

// Turning Terrain on turns the shadow layer off: the two cannot be drawn together.
useApp.subscribe((s, prev) => {
  if (s.layers.terrain && !prev.layers.terrain && useSunShadow.getState().on) setSunShadow(false);
});
