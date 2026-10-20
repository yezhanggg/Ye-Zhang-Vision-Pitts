// On/off state of the tree canopy map (the canopy itself, drawn from map tiles). Kept apart from the layer's code, like
// the sun-and-shadow switch: the tiles are fetched at runtime, so the offline single file does not have them.
import { create } from 'zustand';
import { sunShadowBlocked } from './sunShadowStore';

export interface CanopyState {
  on: boolean;
  /** The tiles are not on this copy of the site. */
  failed: boolean;
}

export const useCanopy = create<CanopyState>(() => ({ on: false, failed: false }));

/** Why the map cannot be shown here, or null when it can (the same reason as sun and shadow: nothing to fetch from). */
export const canopyBlocked = sunShadowBlocked;

let started = false;
export function setCanopy(on: boolean) {
  if (on && canopyBlocked) return;
  useCanopy.setState({ on, failed: false });
  if (on && !started && import.meta.env.MODE !== 'export') {
    started = true;
    void import('./canopyLayer').then((m) => m.startCanopy());
  }
}
