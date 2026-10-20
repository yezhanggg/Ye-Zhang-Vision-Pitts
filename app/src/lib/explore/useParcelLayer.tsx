// Shadow by parcel: the wiring. While the sun control's By parcel view is on, this loads the chunks of lots in view,
// hands the Explore map one ready-made layer per chunk (through parcelShadowStore), tells the shadow picture which
// chunks the lots now cover, and fetches a lot's half-hour profile when it is clicked. Loaded with the sun control.
import { useEffect, useState } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import type { OverlayLayer } from '../../components/MapView';
import { ParcelTooltip } from '../../components/explore/ParcelCard';
import { onMap } from '../export/mapRegistry';
import { useTour } from '../tour';
import { isPhone } from '../viewport';
import { chunkUrl, chunksToLoad, curveRow, parseParcelManifest, prepareChunk, shadeFillExpr, type LotCollection, type LotProps, type ParcelManifest } from './parcelShadow';
import { NO_CHUNKS, useParcelShadow } from './parcelShadowStore';
import { evict, type ShadowManifest } from './sunShadow';
import { useSunShadow } from './sunShadowStore';

/** Chunks of lots asked for at once: the view's nearest. A tilted map sees far, and each chunk is thousands of lots. */
const MAX_NEEDED = 4;
/** Lots kept in memory, so panning back does not fetch again. Needed chunks are kept whatever this says. */
const CACHE_LOTS = 70_000;
const MAX_FETCHES = 2;
/** Chunks start loading this much before the lots show, so they are there when the zoom gets to them. */
const EARLY = 0.75;
const LAYER = 'parcels-';
const LINE: OverlayLayer['line'] = { color: '#ffffff', width: 0.5, opacity: 0.55 };
const OPACITY = 0.84;

/** Where the lot files live (next to the shadow pages). */
export const parcelBase = () => new URL('data/parcel-shadow/', document.baseURI).toString();

interface Entry {
  state: 'loading' | 'ready' | 'failed';
  fc?: LotCollection;
  lots: number;
  used: number;
  abort?: AbortController;
}
const cache = new Map<string, Entry>();
const profiles = new Map<string, Promise<Uint8Array | null>>();
let fetching = 0;
/** The live layer's "look again", called when a fetch ends. */
let poke: (() => void) | null = null;

let loadedOnce: Promise<ParcelManifest | null> | null = null;
function loadManifest(shadow: ShadowManifest): Promise<ParcelManifest | null> {
  // Not on phones: a dense chunk is several megabytes of shapes, and there is no hover there.
  loadedOnce ??= isPhone()
    ? Promise.resolve(null)
    : fetch(parcelBase() + 'manifest.json')
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => parseParcelManifest(json, shadow.days))
        .catch(() => null);
  return loadedOnce;
}

function loadProfile(manifest: ParcelManifest, key: string): Promise<Uint8Array | null> {
  let p = profiles.get(key);
  if (!p) {
    p = fetch(chunkUrl(parcelBase(), manifest.paths.profile, key))
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((buf) => (buf ? new Uint8Array(buf) : null))
      .catch(() => null);
    profiles.set(key, p);
  }
  return p;
}

const dayIndex = (manifest: ParcelManifest) => Math.max(0, manifest.days.findIndex((d) => d.id === useSunShadow.getState().day));

/** The lot layer for the Explore map. Returns the manifest once it is known that this copy of the site has the files. */
export function useParcelLayer(shadow: ShadowManifest | null): ParcelManifest | null {
  const [manifest, setManifest] = useState<ParcelManifest | null>(null);

  useEffect(() => {
    if (!shadow) return;
    let live = true;
    loadManifest(shadow).then((m) => {
      if (!live) return;
      setManifest(m);
      useParcelShadow.setState({ available: !!m, minZoom: m?.minZoom ?? null });
      // the view cannot stay on lots that are not there
      if (!m && useSunShadow.getState().view === 'parcel') useSunShadow.setState({ view: 'hours' });
    });
    return () => {
      live = false;
    };
  }, [shadow]);

  useEffect(() => {
    if (!manifest) return;
    let map: MLMap | null = null;
    let needed: string[] = [];
    let tick = 0;
    let published = '';
    let drawn = '';
    let wasActive = false;
    let stopped = false;

    const wanted = () => {
      const s = useSunShadow.getState();
      return s.on && s.view === 'parcel' && !useTour.getState().active;
    };

    const request = (key: string) => {
      if (cache.has(key) || fetching >= MAX_FETCHES) return;
      const lots = manifest.chunks.find((c) => c.key === key)?.lots ?? 0;
      const entry: Entry = { state: 'loading', lots, used: tick, abort: new AbortController() };
      cache.set(key, entry);
      fetching++;
      fetch(chunkUrl(parcelBase(), manifest.paths.lots, key), { signal: entry.abort!.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((json) => {
          const fc = prepareChunk(json, lots);
          if (!fc) throw new Error('not the lots the manifest names');
          Object.assign(entry, { fc, state: 'ready' });
        })
        .catch((e: unknown) => {
          // a cancelled request is forgotten so it can be asked for again; a real failure is remembered
          if ((e as { name?: string })?.name === 'AbortError') cache.delete(key);
          else entry.state = 'failed';
        })
        .finally(() => {
          fetching--;
          poke?.();
        });
    };

    const layerFor = (key: string, fc: LotCollection, day: number, active: boolean, row: number | null): OverlayLayer => ({
      id: LAYER + key,
      data: fc as unknown as OverlayLayer['data'],
      idField: 'i',
      minzoom: manifest.minZoom,
      selection: 'outline',
      fill: { expr: shadeFillExpr(day), opacity: OPACITY },
      line: LINE,
      interactive: active,
      selectedId: row == null ? null : String(row),
      // a second click on the selected lot clears it
      onSelect: (id) => {
        const now = useParcelShadow.getState().selected;
        const next = Number(id);
        useParcelShadow.setState({ selected: now && now.chunk === key && now.row === next ? null : { chunk: key, row: next } });
      },
      tooltip: (id) => {
        const lot = fc.features[Number(id)]?.properties;
        return lot ? <ParcelTooltip lot={lot} manifest={manifest} day={dayIndex(manifest)} /> : null;
      },
    });

    const checkDrawn = () => {
      const m = map;
      if (!m || stopped) return;
      // A chunk counts once its lots are on screen: its source has every tile it needs, at a zoom where lots are drawn.
      const keys = m.getZoom() >= manifest.minZoom ? useParcelShadow.getState().overlays.map((o) => o.id.slice(LAYER.length)).filter((k) => !!m.getSource(`ov-${LAYER}${k}`) && m.isSourceLoaded(`ov-${LAYER}${k}`)) : [];
      const waiting = needed.some((k) => cache.get(k)?.state === 'loading' || (cache.get(k)?.state === 'ready' && wasActive && !keys.includes(k)));
      const sig = keys.join('|');
      if (sig !== drawn) {
        drawn = sig;
        useParcelShadow.setState({ drawn: keys.length ? new Set(keys) : NO_CHUNKS });
      }
      if (useParcelShadow.getState().loading !== waiting) useParcelShadow.setState({ loading: waiting });
    };

    const update = () => {
      if (stopped) return;
      const m = map;
      const on = !!m && wanted();
      const zoom = m?.getZoom() ?? 0;
      const active = on && zoom >= manifest.minZoom;
      wasActive = active;
      if (m && on && zoom >= manifest.minZoom - EARLY) {
        const b = m.getBounds(), c = m.getCenter();
        needed = chunksToLoad({ west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() }, [c.lng, c.lat], manifest.chunks, MAX_NEEDED).map((k) => k.key);
      } else needed = [];
      tick++;
      for (const [key, e] of cache) {
        if (needed.includes(key)) e.used = tick;
        else if (e.state === 'loading') e.abort?.abort();
      }
      for (const key of needed) request(key);
      const ready = [...cache].filter(([, e]) => e.state === 'ready').map(([key, e]) => ({ key, bytes: e.lots, used: e.used }));
      for (const key of evict(ready, CACHE_LOTS, new Set(needed))) {
        cache.delete(key);
        profiles.delete(key);
      }
      // Sorted, and only handed over when something changed: the map re-stacks its layers when the list changes.
      const keys = needed.filter((k) => cache.get(k)?.state === 'ready').sort();
      let sel = useParcelShadow.getState().selected;
      if (sel && (!on || !cache.get(sel.chunk)?.fc)) sel = null;
      const day = dayIndex(manifest);
      const sig = `${keys.join('|')}#${day}#${active}#${sel ? `${sel.chunk}:${sel.row}` : ''}`;
      if (sig !== published || sel !== useParcelShadow.getState().selected) {
        published = sig;
        useParcelShadow.setState({ overlays: keys.map((k) => layerFor(k, cache.get(k)!.fc!, day, active, sel && sel.chunk === k ? sel.row : null)), active, selected: sel });
      }
      checkDrawn();
    };
    poke = update;

    const onZoom = () => {
      const m = map;
      if (m && wanted() && m.getZoom() >= manifest.minZoom !== wasActive) update();
    };
    const release = () => {
      const m = map;
      if (!m) return;
      try {
        m.off('moveend', update);
        m.off('zoom', onZoom);
        m.off('sourcedata', checkDrawn);
        m.off('idle', checkDrawn);
      } catch {
        /* the map was already removed with its view */
      }
      map = null;
    };
    const stopMap = onMap('explore', (m) => {
      release();
      map = m;
      m.on('moveend', update);
      m.on('zoom', onZoom);
      m.on('sourcedata', checkDrawn);
      m.on('idle', checkDrawn);
      update();
    });
    const stopSun = useSunShadow.subscribe((s, prev) => {
      if (s.on !== prev.on || s.view !== prev.view || s.day !== prev.day) update();
    });
    const stopPick = useParcelShadow.subscribe((s, prev) => {
      if (s.selected !== prev.selected) update();
    });
    const stopTour = useTour.subscribe((s, prev) => {
      if (s.active !== prev.active) update();
    });

    return () => {
      stopped = true;
      if (poke === update) poke = null;
      stopTour();
      stopPick();
      stopSun();
      stopMap();
      release();
      for (const e of cache.values()) if (e.state === 'loading') e.abort?.abort();
      useParcelShadow.setState({ overlays: [], active: false, drawn: NO_CHUNKS, loading: false, selected: null });
    };
  }, [manifest]);

  return manifest;
}

/** The clicked lot and its profile for one day (null while the profile is on its way, or when the lot is not rated). */
export function useSelectedLot(manifest: ParcelManifest | null, day: number): { lot: LotProps | null; curve: number[] | null } {
  const sel = useParcelShadow((s) => s.selected);
  const chunk = sel?.chunk ?? null;
  const [got, setGot] = useState<{ key: string; bytes: Uint8Array | null } | null>(null);
  useEffect(() => {
    if (!chunk || !manifest) return;
    let live = true;
    loadProfile(manifest, chunk).then((bytes) => {
      if (live) setGot({ key: chunk, bytes });
    });
    return () => {
      live = false;
    };
  }, [chunk, manifest]);
  const entry = sel ? cache.get(sel.chunk) : undefined;
  const lot = (sel && entry?.fc?.features[sel.row]?.properties) || null;
  const curve = sel && manifest && entry && got?.key === sel.chunk && got.bytes ? curveRow(got.bytes, entry.lots, sel.row, manifest, day) : null;
  return { lot, curve };
}
