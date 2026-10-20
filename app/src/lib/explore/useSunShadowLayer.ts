// Sun and shadow: the wiring. Loads the manifest, attaches the layer to the Explore map while the switch is on, runs
// the play clock, turns the buildings' light with the sun, and puts everything back when the switch goes off.
import { useEffect, useState } from 'react';
import type { LightSpecification, Map as MLMap } from 'maplibre-gl';
import { onMap } from '../export/mapRegistry';
import { OVERLAY_TOP } from '../mapStyle';
import { isPhone } from '../viewport';
import { useParcelShadow } from './parcelShadowStore';
import { DEFAULT_LIGHT, interpSun, nearestDay, parseFine, parseManifest, sunToLight, type FineLevel, type ShadowManifest } from './sunShadow';
import { createSunShadowLayer, type SunShadowLayer } from './sunShadowLayer';
import { useSunShadow } from './sunShadowStore';

/** Half-hour steps per second while playing: a day goes by in about 20 seconds. */
export const PLAY_STEPS_PER_SECOND = 1.25;
/** How long the last moment of the day is held before the day starts over, in steps. */
const HOLD_STEPS = 1.5;
const MB = 1024 * 1024;

/** Where the pages live. One place to change if they move off this site (for example to object storage). */
export const shadowBase = () => new URL('data/shadow/', document.baseURI).toString();

interface Loaded {
  manifest: ShadowManifest;
  /** The close-zoom pages, where this copy of the site has them (they are large and optional). Not used on phones. */
  fine: FineLevel | null;
}
const getJson = (name: string) => fetch(shadowBase() + name).then((r) => (r.ok ? r.json() : null)).catch(() => null);
let loadedOnce: Promise<Loaded | null> | null = null;
function loadManifest(): Promise<Loaded | null> {
  loadedOnce ??= Promise.all([getJson('manifest.json'), isPhone() ? null : getJson('fine/manifest.json')]).then(([m, f]) => {
    const manifest = parseManifest(m);
    return manifest ? { manifest, fine: parseFine(f) } : null;
  });
  return loadedOnce;
}

export function useSunShadowLayer(lite: boolean): ShadowManifest | null {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const manifest = loaded?.manifest ?? null;

  useEffect(() => {
    let live = true;
    loadManifest().then((got) => {
      if (!live) return;
      if (!got) return useSunShadow.setState({ failed: true, playing: false });
      const m = got.manifest;
      const st = useSunShadow.getState();
      if (!st.day || !m.days.some((d) => d.id === st.day)) useSunShadow.setState({ day: nearestDay(m, new Date()), t: 0, playing: !lite });
      setLoaded(got);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The layer itself, on whichever Explore map is alive.
  useEffect(() => {
    if (!manifest) return;
    let map: MLMap | null = null;
    let handle: SunShadowLayer | null = null;
    let savedLight: LightSpecification | null = null;
    let wasGlobe = false;
    let onStyle: (() => void) | null = null;
    let onRotate: (() => void) | null = null;

    const apply = () => {
      const st = useSunShadow.getState();
      const day = manifest.days.find((d) => d.id === st.day) ?? manifest.days[0];
      // By parcel: hours of sun wherever lots are not drawn (zoomed out, or a chunk still loading), so the map is never blank.
      const lots = st.view === 'parcel' ? useParcelShadow.getState() : null;
      handle?.setFrame({ day: day.id, t: st.t, view: st.view === 'shadow' ? 'shadow' : 'hours', snap: lite, maxZoom: lots?.minZoom ?? null, skip: lots?.drawn });
      if (!map) return;
      const sun = interpSun(day, st.t);
      // A zero-length transition: the light follows the clock, it does not ease toward it.
      map.setLight({ anchor: 'map', position: sunToLight(sun.az, sun.el), 'position-transition': { duration: 0, delay: 0 } } as LightSpecification);
    };

    const detach = () => {
      const m = map;
      if (!m) return;
      try {
        if (onStyle) m.off('styledata', onStyle);
        if (onRotate) m.off('rotate', onRotate);
        handle?.dispose();
        if (handle) {
          m.setLight({ ...DEFAULT_LIGHT, ...(savedLight ?? {}), 'position-transition': { duration: 0, delay: 0 } } as LightSpecification);
          if (wasGlobe) m.setProjection({ type: 'globe' });
        }
      } catch {
        /* the map was already removed with its view */
      }
      handle = null;
      map = null;
    };

    const stopMap = onMap('explore', (m) => {
      detach();
      map = m;
      const attach = () => {
        if (handle || !m.getLayer(OVERLAY_TOP)) return;
        const layers = m.getStyle().layers;
        const above = layers[layers.findIndex((l) => l.id === OVERLAY_TOP) + 1]?.id;
        // The layer draws on a flat map. After the opening globe flight the map is still a globe (identical to a
        // flat map at city zooms, different just below them), so it is flattened while the layer is on.
        wasGlobe = m.getProjection()?.type === 'globe';
        if (wasGlobe) m.setProjection({ type: 'mercator' });
        savedLight = m.getLight() ?? null;
        handle = createSunShadowLayer(m, manifest, shadowBase(), {
          budget: (isPhone() ? 48 : 192) * MB,
          maxChunks: isPhone() ? 4 : 9,
          fine: loaded?.fine ?? null,
          onChange: () => useSunShadow.setState({ loading: handle?.loading() ?? false }),
        });
        m.addLayer(handle.layer, above);
        if (onStyle) m.off('styledata', onStyle);
        apply();
      };
      onStyle = attach;
      m.on('styledata', attach);
      onRotate = () => {
        const b = Math.round(m.getBearing());
        if (b !== useSunShadow.getState().bearing) useSunShadow.setState({ bearing: b });
      };
      m.on('rotate', onRotate);
      onRotate();
      attach();
    });

    const stopStore = useSunShadow.subscribe((s, prev) => {
      // Off means off at once: the control may still be fading out when the layer and the light go back.
      if (!s.on && prev.on) return detach();
      if (s.day !== prev.day || s.t !== prev.t || s.view !== prev.view) apply();
    });
    const stopLots = useParcelShadow.subscribe((s, prev) => {
      if (s.drawn !== prev.drawn || s.minZoom !== prev.minZoom) apply();
    });
    return () => {
      stopLots();
      stopStore();
      stopMap();
      detach();
      useSunShadow.setState({ loading: false });
    };
  }, [loaded, lite]);

  // The play clock. Reduced motion never plays.
  const playing = useSunShadow((s) => s.playing);
  const day = useSunShadow((s) => s.day);
  useEffect(() => {
    if (!manifest || !playing || lite) return;
    const n = (manifest.days.find((d) => d.id === day) ?? manifest.days[0]).steps.length;
    let raf = 0;
    let last = performance.now();
    let clock = useSunShadow.getState().t;
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      clock += dt * PLAY_STEPS_PER_SECOND;
      if (clock > n - 1 + HOLD_STEPS) clock = 0;
      useSunShadow.setState({ t: Math.min(clock, n - 1) });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [manifest, playing, day, lite]);

  return manifest;
}
