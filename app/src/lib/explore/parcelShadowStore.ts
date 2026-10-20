// What the By parcel view of sun and shadow has on the map right now. The lots, their colors and the click handling
// are put together by the lazy half (useParcelLayer, loaded with the sun control); this store only carries the result
// to the Explore map, so the offline single file holds next to nothing of it. Not part of the link.
import { create } from 'zustand';
import type { OverlayLayer } from '../../components/MapView';

export interface ParcelState {
  /** The parcel files are on this copy of the site (they are large and published separately). */
  available: boolean;
  /** Ready-made map layers, one per chunk of lots. */
  overlays: OverlayLayer[];
  /** Lots are on screen (the view is chosen and the map is zoomed in far enough), so they take hover and clicks. */
  active: boolean;
  /** Lots are drawn from this zoom; null until the manifest has loaded. */
  minZoom: number | null;
  /** Chunks whose lots are drawn; the shadow picture leaves these out. */
  drawn: ReadonlySet<string>;
  loading: boolean;
  /** The clicked lot: its chunk and its row there. */
  selected: { chunk: string; row: number } | null;
}

export const NO_CHUNKS: ReadonlySet<string> = new Set();
export const useParcelShadow = create<ParcelState>(() => ({ available: false, overlays: [], active: false, minZoom: null, drawn: NO_CHUNKS, loading: false, selected: null }));
