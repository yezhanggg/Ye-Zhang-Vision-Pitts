import { useEffect, useRef, useState, type ReactNode } from 'react';
import maplibregl, { type ExpressionSpecification, type GeoJSONSource, type Map as MLMap, type MapGeoJSONFeature, type MapLayerMouseEvent } from 'maplibre-gl';
import { buildingsFC, scoring, tractBounds, tractsFC } from '../lib/data';
import { boundsOf, type Bounds } from '../lib/geo';
import { ELEV_STOPS_FT, M_TO_FT, PGH_VIEW, VIOLET, catExpression, contourSourceUrl, easeInOutCubic, easeOutCubic, loadBasemapStyle, loadDemConfig, seqExpression, type DemConfig } from '../lib/mapStyle';
import type { MapPaint } from '../lib/paint';
import type { Pin } from '../lib/types';

export interface SyncGroup {
  maps: Set<MLMap>;
  lock: boolean;
}
export const makeSyncGroup = (): SyncGroup => ({ maps: new Set(), lock: false });

/** Any polygon feature collection (tracts, block groups, ZIPs, county, city). */
export interface OverlayFC {
  type: 'FeatureCollection';
  features: { type: 'Feature'; properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } }[];
}

/**
 * A polygon layer drawn on top of the basemap, keyed by `id`. Source `ov-${id}`; layers `${id}-fill`, `-line`,
 * `-hover`, `-sel-glow`, `-sel`, kept in array order below the basemap labels. Changing `data` calls setData,
 * changing `fill.paint` re-derives the color expression and diffs feature state, dropping the overlay removes it.
 */
export interface OverlayLayer {
  id: string;
  data: OverlayFC;
  /** Property promoted to the feature id (feature state and hover/select use it). */
  idField: string;
  /** Choropleth from a MapPaint, or a flat `color`; omitted → outline only (plus an invisible hit layer when interactive). */
  fill?: { paint?: MapPaint; color?: string; opacity?: number | ExpressionSpecification };
  line: { color: string; width: number | ExpressionSpecification; dash?: number[]; opacity?: number };
  interactive?: boolean;
  selectedId?: string | null;
  /** Ease the camera to the selected feature when the selection changes. */
  zoomTo?: boolean;
  onSelect?: (id: string) => void;
  tooltip?: (id: string) => ReactNode;
}

interface Props {
  paint: MapPaint;
  selectedId: string | null;
  flips?: Set<string> | null;
  /** Color for the selected tract's 3D buildings (the top typology's color). */
  buildingColor?: string | null;
  lite: boolean;
  terrain: boolean;
  padding?: { top: number; right: number; bottom: number; left: number };
  onSelect?: (id: string) => void;
  tooltip?: (id: string) => ReactNode;
  sync?: SyncGroup;
  idleOrbit?: boolean;
  overlay?: ReactNode;
  className?: string;
  initialView?: { center: [number, number]; zoom: number; pitch: number; bearing: number };
  autoOrbit?: boolean;
  interactive?: boolean;
  terrainAlways?: boolean;
  fillOpacity?: number;
  pin?: Pin | null;
  elevationReadout?: boolean;
  /** Extra polygon layers (Explore). */
  overlays?: OverlayLayer[];
  /** Draw and handle the built-in city tract layers (default true; Explore turns them off). */
  baseTracts?: boolean;
  /** 3D buildings (OSM backdrop + focus-tract footprints), default true. */
  buildings?: boolean;
  /** Feature under the cursor changed (tract layers and interactive overlays). */
  onHover?: (id: string | null, overlayId?: string) => void;
}

const NON_RESIDENTIAL = '#efede9';
/** The choropleth fades as you zoom in so streets and buildings show through. */
const ZOOM_FILL = ['interpolate', ['linear'], ['zoom'], 12, 0.62, 15, 0.35] as unknown as number;
const fmtFt = (v: number) => `${Math.round(v).toLocaleString('en-US')} ft`;
const SCORE_BINS = scoring.bins.score;
const TRACT_LAYERS = ['tract-fill', 'tract-line', 'tract-focus', 'tract-flip', 'tract-hover', 'tract-sel-glow', 'tract-sel'];
const OVERLAY_SUFFIXES = ['-fill', '-line', '-hover', '-sel-glow', '-sel'] as const;
const DEFAULT_PAD = { top: 60, right: 60, bottom: 60, left: 60 };

function tint(hex: string, amt: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (v: number) => Math.round(v + (255 - v) * amt);
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

/** Non-residential tracts are drawn in a flat light grey whatever the metric. */
const withNonResidential = (expr: ExpressionSpecification | string): ExpressionSpecification => ['case', ['!', ['to-boolean', ['get', 'residential']]], NON_RESIDENTIAL, expr] as unknown as ExpressionSpecification;

// ------------------------------------------------------------------ overlay helpers
interface OverlayRec {
  cfg: OverlayLayer;
  /** Feature state applied so far (per id) under `key`. */
  values: Map<string, number>;
  key: 'v' | 'k';
  selected: string | null;
  hovered: string | null;
  handlers: { move: (e: MapLayerMouseEvent) => void; leave: () => void; click: (e: MapLayerMouseEvent) => void };
}

const overlaySource = (id: string) => `ov-${id}`;
const fillVisible = (cfg: OverlayLayer) => !!cfg.fill || !!cfg.interactive;
function fillColor(cfg: OverlayLayer): ExpressionSpecification | string {
  const p = cfg.fill?.paint;
  if (p?.kind === 'cat') return catExpression(p.palette);
  if (p?.kind === 'seq') return seqExpression(p.palette, p.bins ?? SCORE_BINS);
  if (p?.kind === 'relief') return 'rgba(0,0,0,0)';
  return cfg.fill?.color ?? '#94a3b8';
}
const fillOpacityOf = (cfg: OverlayLayer): number | ExpressionSpecification => cfg.fill?.opacity ?? (cfg.fill ? ZOOM_FILL : 0);
function linePaint(line: OverlayLayer['line']) {
  const p: Record<string, unknown> = { 'line-color': line.color, 'line-width': line.width, 'line-opacity': line.opacity ?? 1 };
  if (line.dash) p['line-dasharray'] = line.dash;
  return p;
}
const sameLine = (a: OverlayLayer['line'], b: OverlayLayer['line']) => a.color === b.color && a.width === b.width && a.opacity === b.opacity && String(a.dash ?? '') === String(b.dash ?? '');

const boundsCache = new WeakMap<OverlayFC, Map<string, Bounds | null>>();
function featureBounds(data: OverlayFC, idField: string, id: string): Bounds | null {
  let m = boundsCache.get(data);
  if (!m) {
    m = new Map();
    boundsCache.set(data, m);
  }
  if (!m.has(id)) {
    const f = data.features.find((x) => String(x.properties?.[idField]) === id);
    m.set(id, f ? boundsOf(f.geometry) : null);
  }
  return m.get(id) ?? null;
}

export default function MapView(props: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<{ overlay: string | null; id: string; x: number; y: number } | null>(null);
  const [elev, setElev] = useState<number | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const live = useRef(props);
  live.current = props;
  const fillOpacity = props.fillOpacity ?? ZOOM_FILL;
  const st = useRef({
    values: new Map<string, number>(),
    kind: '' as '' | 'seq' | 'cat' | 'relief',
    selected: null as string | null,
    hovered: null as string | null,
    flips: new Set<string>(),
    tween: 0,
    bldRaf: 0,
    terrainE: 0,
    terrainRaf: 0,
    orbitRaf: 0,
    idleTimer: 0,
    elevRaf: 0,
    camAt: 0,
    dem: null as DemConfig | null,
    firstSymbol: undefined as string | undefined,
    overlayAnchor: undefined as string | undefined,
    overlays: new Map<string, OverlayRec>(),
    overlayOrder: '',
    hoverOverlay: null as string | null,
  }).current;

  // ------------------------------------------------------------ create
  useEffect(() => {
    let disposed = false;
    let map: MLMap | null = null;
    Promise.all([loadBasemapStyle(), loadDemConfig()]).then(([style, dem]) => {
      if (disposed || !el.current) return;
      st.dem = dem;
      const v0 = live.current.initialView ?? PGH_VIEW;
      map = new maplibregl.Map({
        container: el.current,
        style,
        center: v0.center,
        zoom: v0.zoom,
        pitch: v0.pitch,
        bearing: v0.bearing,
        interactive: live.current.interactive ?? true,
        maxPitch: 78,
        attributionControl: { compact: true, customAttribution: [dem.attribution, 'Search © OpenStreetMap / Photon · US Census Geocoder'] },
        canvasContextAttributes: { antialias: true },
        fadeDuration: 200,
      });
      mapRef.current = map;
      (window as unknown as { __map?: MLMap }).__map = map;
      if (live.current.interactive ?? true) map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }), 'bottom-right');
      map.on('style.load', () => {
        if (!map) return;
        setup(map);
        setReady(true);
      });
      map.on('error', (e) => {
        const msg = String((e as { error?: Error }).error?.message ?? '');
        if (!/Failed to fetch|AJAXError|NetworkError|Load failed/.test(msg)) console.warn('[map]', msg);
      });
    });
    return () => {
      disposed = true;
      for (const k of ['tween', 'bldRaf', 'terrainRaf', 'orbitRaf', 'elevRaf'] as const) cancelAnimationFrame(st[k]);
      markerRef.current?.remove();
      markerRef.current = null;
      if (map) {
        live.current.sync?.maps.delete(map);
        map.remove();
      }
      mapRef.current = null;
      st.overlays.clear();
      st.overlayOrder = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setup(map: MLMap) {
    try {
      map.setSky({
        'sky-color': '#dfe9f3',
        'horizon-color': '#f4efe8',
        'fog-color': '#f6f4f1',
        'sky-horizon-blend': 0.6,
        'horizon-fog-blend': 0.6,
        'fog-ground-blend': 0.25,
        'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 7, 1, 10, 0],
      });
    } catch {
      /* sky unsupported */
    }
    const layers = map.getStyle().layers ?? [];
    const firstSymbol = layers.find((l) => l.type === 'symbol')?.id;
    st.firstSymbol = firstSymbol;
    for (const l of layers) if (l.type === 'symbol' && /poi|housenum/.test(l.id)) map.setLayoutProperty(l.id, 'visibility', 'none');

    // Elevation: hillshade always, 3D terrain on demand, hypsometric tint for the Elevation layer.
    const dem = st.dem!;
    const demSrc = { type: 'raster-dem' as const, tiles: dem.tiles, encoding: dem.encoding, tileSize: dem.tileSize, maxzoom: dem.maxzoom };
    map.addSource('dem-terrain', demSrc);
    map.addSource('dem-hillshade', demSrc);
    try {
      map.addLayer({ id: 'hillshade', type: 'hillshade', source: 'dem-hillshade', paint: { 'hillshade-method': 'multidirectional', 'hillshade-exaggeration': 0.35, 'hillshade-highlight-color': ['#ffffff', '#ffffff', '#ffffff', '#ffffff'], 'hillshade-shadow-color': ['#6b6258', '#7a7168', '#6b6258', '#8a8177'], 'hillshade-accent-color': '#8a8177' } as never }, firstSymbol);
    } catch {
      map.addLayer({ id: 'hillshade', type: 'hillshade', source: 'dem-hillshade', paint: { 'hillshade-exaggeration': 0.3, 'hillshade-shadow-color': '#6b6258', 'hillshade-highlight-color': '#ffffff', 'hillshade-accent-color': '#8a8177' } }, firstSymbol);
    }
    try {
      const stops: unknown[] = [];
      for (const [ft, c] of ELEV_STOPS_FT) stops.push(ft / M_TO_FT, c);
      map.addLayer({ id: 'relief', type: 'color-relief', source: 'dem-hillshade', layout: { visibility: 'none' }, paint: { 'color-relief-color': ['interpolate', ['linear'], ['elevation'], ...stops], 'color-relief-opacity': 0.9 } } as never, 'hillshade');
    } catch {
      /* color-relief needs MapLibre >= 5.6 */
    }

    // Tracts (the built-in layers Match and the compare views paint; hidden when baseTracts is false)
    const tractsOn = live.current.baseTracts !== false;
    const vis = { visibility: tractsOn ? ('visible' as const) : ('none' as const) };
    map.addSource('tracts', { type: 'geojson', data: tractsFC as never, promoteId: 'GEOID' });
    const p0 = live.current.paint;
    map.addLayer(
      {
        id: 'tract-fill',
        type: 'fill',
        source: 'tracts',
        layout: vis,
        paint: {
          'fill-color': withNonResidential(p0.kind === 'cat' ? catExpression(p0.palette) : p0.kind === 'relief' ? 'rgba(0,0,0,0)' : seqExpression(p0.palette, p0.bins ?? SCORE_BINS)),
          'fill-opacity': fillOpacity,
          'fill-opacity-transition': { duration: 900, delay: 0 },
        },
      },
      firstSymbol,
    );
    map.addLayer({ id: 'tract-line', type: 'line', source: 'tracts', layout: vis, paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.3, 14, 1.2], 'line-opacity': 0.85 } }, firstSymbol);
    map.addLayer({ id: 'tract-focus', type: 'line', source: 'tracts', layout: vis, filter: ['to-boolean', ['get', 'focus']], paint: { 'line-color': '#475569', 'line-width': 1.3, 'line-dasharray': [2, 1.6], 'line-opacity': 0.7 } }, firstSymbol);
    map.addLayer({ id: 'tract-flip', type: 'line', source: 'tracts', layout: vis, paint: { 'line-color': '#0f172a', 'line-width': ['case', ['boolean', ['feature-state', 'flip'], false], 2.2, 0], 'line-width-transition': { duration: 350, delay: 0 } } }, firstSymbol);
    map.addLayer({ id: 'tract-hover', type: 'line', source: 'tracts', layout: vis, paint: { 'line-color': '#334155', 'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2, 0] } }, firstSymbol);
    map.addLayer({ id: 'tract-sel-glow', type: 'line', source: 'tracts', layout: vis, paint: { 'line-color': VIOLET, 'line-blur': 6, 'line-opacity': 0.45, 'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 12, 0] } }, firstSymbol);
    map.addLayer({ id: 'tract-sel', type: 'line', source: 'tracts', layout: vis, paint: { 'line-color': VIOLET, 'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3.2, 0] } }, firstSymbol);

    // Contour lines in feet from the same elevation tiles, visible with Terrain from z13.
    try {
      map.addSource('contours', { type: 'vector', tiles: [contourSourceUrl(dem)], maxzoom: 15 });
      const cvis = live.current.terrain && !live.current.lite ? 'visible' : 'none';
      map.addLayer({ id: 'contour-minor', type: 'line', source: 'contours', 'source-layer': 'contours', minzoom: 13, filter: ['==', ['get', 'level'], 0], layout: { visibility: cvis }, paint: { 'line-color': '#57534e', 'line-opacity': 0.32, 'line-width': 0.6 } }, firstSymbol);
      map.addLayer({ id: 'contour-major', type: 'line', source: 'contours', 'source-layer': 'contours', minzoom: 13, filter: ['>', ['get', 'level'], 0], layout: { visibility: cvis }, paint: { 'line-color': '#44403c', 'line-opacity': 0.6, 'line-width': 1.2 } }, firstSymbol);
      if (map.getStyle().glyphs) {
        map.addLayer({
          id: 'contour-label',
          type: 'symbol',
          source: 'contours',
          'source-layer': 'contours',
          minzoom: 13.5,
          filter: ['>', ['get', 'level'], 0],
          layout: { visibility: cvis, 'symbol-placement': 'line', 'text-field': ['concat', ['number-format', ['get', 'ele'], { locale: 'en-US' }], ' ft'], 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-max-angle': 30, 'symbol-spacing': 320 },
          paint: { 'text-color': '#44403c', 'text-halo-color': 'rgba(255,255,255,0.9)', 'text-halo-width': 1.6 },
        });
      }
    } catch (e) {
      console.info('[map] contours unavailable', e);
    }

    // Buildings: muted OSM backdrop everywhere; detailed focus-tract buildings when the pipeline provides them.
    const bvis = { visibility: live.current.buildings === false ? ('none' as const) : ('visible' as const) };
    if (map.getSource('openmaptiles')) {
      map.addLayer(
        {
          id: 'osm-3d',
          type: 'fill-extrusion',
          source: 'openmaptiles',
          'source-layer': 'building',
          minzoom: 14,
          layout: bvis,
          paint: {
            'fill-extrusion-color': '#e7e5e4',
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 14.6, ['coalesce', ['get', 'render_height'], 0]],
            'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 14, 0, 14.6, ['coalesce', ['get', 'render_min_height'], 0]],
            'fill-extrusion-opacity': 0.5,
          },
        },
        firstSymbol,
      );
    }
    if (buildingsFC.features.length) {
      map.addSource('focus-bld', { type: 'geojson', data: buildingsFC as never });
      map.addLayer(
        {
          id: 'focus-3d',
          type: 'fill-extrusion',
          source: 'focus-bld',
          minzoom: 12,
          layout: bvis,
          paint: { 'fill-extrusion-color': ['case', ['==', ['coalesce', ['get', 'src'], 'default'], 'default'], '#e7e5e4', '#d6d3d1'], 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-opacity': 0.92, 'fill-extrusion-vertical-gradient': true },
        },
        firstSymbol,
      );
    }
    // Overlays go under contours and buildings, like the tract layers.
    st.overlayAnchor = ['contour-minor', 'osm-3d', 'focus-3d'].find((l) => map.getLayer(l)) ?? firstSymbol;

    // Interaction (tract layers)
    map.on('mousemove', 'tract-fill', (e) => {
      if (live.current.baseTracts === false) return;
      const f = e.features?.[0] as MapGeoJSONFeature | undefined;
      const id = f ? String(f.id ?? f.properties?.GEOID) : null;
      if (id !== st.hovered) {
        if (st.hovered) map.setFeatureState({ source: 'tracts', id: st.hovered }, { hover: false });
        if (id) map.setFeatureState({ source: 'tracts', id }, { hover: true });
        st.hovered = id;
        live.current.onHover?.(id);
      }
      map.getCanvas().style.cursor = id ? 'pointer' : '';
      setHover(id ? { overlay: null, id, x: e.point.x, y: e.point.y } : null);
    });
    map.on('mouseleave', 'tract-fill', () => {
      if (st.hovered) {
        map.setFeatureState({ source: 'tracts', id: st.hovered }, { hover: false });
        live.current.onHover?.(null);
      }
      st.hovered = null;
      map.getCanvas().style.cursor = '';
      setHover((h) => (h && h.overlay === null ? null : h));
    });
    map.on('mousemove', (e) => {
      if (!live.current.elevationReadout) return;
      cancelAnimationFrame(st.elevRaf);
      const ll = e.lngLat;
      st.elevRaf = requestAnimationFrame(() => {
        if (st.terrainE > 0.05) {
          const v = map.queryTerrainElevation(ll);
          setElev(v != null && Number.isFinite(v) ? (v / st.terrainE) * M_TO_FT : null);
        } else setElev(null);
      });
    });
    map.on('mouseout', () => {
      cancelAnimationFrame(st.elevRaf);
      setElev(null);
    });
    map.on('click', 'tract-fill', (e) => {
      if (live.current.baseTracts === false) return;
      const f = e.features?.[0];
      if (f) live.current.onSelect?.(String(f.id ?? f.properties?.GEOID));
    });

    // Pair sync: mirror zoom / pitch / bearing, keep each map's own center.
    const sync = live.current.sync;
    if (sync) {
      sync.maps.add(map);
      map.on('move', (e) => {
        if (sync.lock || !(e as { originalEvent?: Event }).originalEvent) return;
        sync.lock = true;
        for (const other of sync.maps) if (other !== map) other.jumpTo({ zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() });
        sync.lock = false;
      });
    }
  }

  // ------------------------------------------------------------ overlays
  function flyToBounds(map: MLMap, b: Bounds) {
    st.camAt = performance.now();
    const cam = map.cameraForBounds(b, { padding: live.current.padding ?? DEFAULT_PAD, bearing: -20 });
    if (!cam) return;
    const target = { center: cam.center, zoom: Math.min((cam.zoom ?? 14) - 0.35, 16), pitch: 60, bearing: -20 };
    if (live.current.lite) map.jumpTo(target);
    else map.easeTo({ ...target, duration: 1200, easing: easeInOutCubic, essential: true });
  }

  function applyOverlayValues(map: MLMap, rec: OverlayRec) {
    const paint = rec.cfg.fill?.paint;
    if (!paint || paint.kind === 'relief') return;
    const source = overlaySource(rec.cfg.id);
    const key = paint.kind === 'seq' ? 'v' : 'k';
    if (key !== rec.key) {
      rec.values.clear();
      rec.key = key;
    }
    const seen = new Set<string>();
    for (const [id, v] of paint.values) {
      const val = v == null ? -1 : v;
      seen.add(id);
      if (rec.values.get(id) !== val) {
        map.setFeatureState({ source, id }, { [key]: val });
        rec.values.set(id, val);
      }
    }
    for (const id of [...rec.values.keys()]) {
      if (seen.has(id)) continue;
      map.setFeatureState({ source, id }, { [key]: -1 });
      rec.values.delete(id);
    }
  }

  function applyOverlaySelection(map: MLMap, rec: OverlayRec) {
    const { cfg } = rec;
    const source = overlaySource(cfg.id);
    const id = cfg.selectedId ?? null;
    if (rec.selected === id) return;
    if (rec.selected) map.setFeatureState({ source, id: rec.selected }, { selected: false });
    if (id) map.setFeatureState({ source, id }, { selected: true });
    rec.selected = id;
    if (id && cfg.zoomTo) {
      const b = featureBounds(cfg.data, cfg.idField, id);
      if (b) flyToBounds(map, b);
    }
  }

  function clearOverlayHover(map: MLMap, rec: OverlayRec) {
    if (rec.hovered) {
      map.setFeatureState({ source: overlaySource(rec.cfg.id), id: rec.hovered }, { hover: false });
      rec.hovered = null;
      live.current.onHover?.(null, rec.cfg.id);
    }
    if (st.hoverOverlay === rec.cfg.id) {
      st.hoverOverlay = null;
      map.getCanvas().style.cursor = '';
      setHover((h) => (h && h.overlay === rec.cfg.id ? null : h));
    }
  }

  function addOverlay(map: MLMap, cfg: OverlayLayer) {
    const source = overlaySource(cfg.id);
    const anchor = st.overlayAnchor;
    map.addSource(source, { type: 'geojson', data: cfg.data as never, promoteId: cfg.idField });
    map.addLayer({ id: `${cfg.id}-fill`, type: 'fill', source, layout: { visibility: fillVisible(cfg) ? 'visible' : 'none' }, paint: { 'fill-color': fillColor(cfg) as never, 'fill-opacity': fillOpacityOf(cfg) as never, 'fill-opacity-transition': { duration: 300, delay: 0 } } }, anchor);
    map.addLayer({ id: `${cfg.id}-line`, type: 'line', source, layout: { 'line-join': 'round' }, paint: linePaint(cfg.line) as never }, anchor);
    map.addLayer({ id: `${cfg.id}-hover`, type: 'line', source, paint: { 'line-color': '#334155', 'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2, 0] } }, anchor);
    map.addLayer({ id: `${cfg.id}-sel-glow`, type: 'line', source, paint: { 'line-color': VIOLET, 'line-blur': 6, 'line-opacity': 0.45, 'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 12, 0] } }, anchor);
    map.addLayer({ id: `${cfg.id}-sel`, type: 'line', source, paint: { 'line-color': VIOLET, 'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3.2, 0] } }, anchor);
    const rec: OverlayRec = {
      cfg,
      values: new Map(),
      key: 'k',
      selected: null,
      hovered: null,
      handlers: {
        move: (e) => {
          const r = st.overlays.get(cfg.id);
          if (!r?.cfg.interactive) return;
          const f = e.features?.[0] as MapGeoJSONFeature | undefined;
          const fid = f ? String(f.id ?? f.properties?.[r.cfg.idField]) : null;
          if (fid !== r.hovered) {
            if (r.hovered) map.setFeatureState({ source, id: r.hovered }, { hover: false });
            if (fid) map.setFeatureState({ source, id: fid }, { hover: true });
            r.hovered = fid;
            st.hoverOverlay = fid ? cfg.id : null;
            live.current.onHover?.(fid, cfg.id);
          }
          map.getCanvas().style.cursor = fid ? 'pointer' : '';
          setHover(fid ? { overlay: cfg.id, id: fid, x: e.point.x, y: e.point.y } : null);
        },
        leave: () => {
          const r = st.overlays.get(cfg.id);
          if (r) clearOverlayHover(map, r);
        },
        click: (e) => {
          const r = st.overlays.get(cfg.id);
          if (!r?.cfg.interactive) return;
          const f = e.features?.[0];
          if (f) r.cfg.onSelect?.(String(f.id ?? f.properties?.[r.cfg.idField]));
        },
      },
    };
    map.on('mousemove', `${cfg.id}-fill`, rec.handlers.move);
    map.on('mouseleave', `${cfg.id}-fill`, rec.handlers.leave);
    map.on('click', `${cfg.id}-fill`, rec.handlers.click);
    st.overlays.set(cfg.id, rec);
    applyOverlayValues(map, rec);
    applyOverlaySelection(map, rec);
  }

  function removeOverlay(map: MLMap, rec: OverlayRec) {
    const { id } = rec.cfg;
    clearOverlayHover(map, rec);
    map.off('mousemove', `${id}-fill`, rec.handlers.move);
    map.off('mouseleave', `${id}-fill`, rec.handlers.leave);
    map.off('click', `${id}-fill`, rec.handlers.click);
    for (const s of OVERLAY_SUFFIXES) if (map.getLayer(`${id}${s}`)) map.removeLayer(`${id}${s}`);
    if (map.getSource(overlaySource(id))) map.removeSource(overlaySource(id));
    st.overlays.delete(id);
  }

  function updateOverlay(map: MLMap, rec: OverlayRec, cfg: OverlayLayer) {
    const prev = rec.cfg;
    if (cfg.idField !== prev.idField) {
      removeOverlay(map, rec);
      addOverlay(map, cfg);
      return;
    }
    rec.cfg = cfg;
    const fillId = `${cfg.id}-fill`;
    let dataChanged = false;
    if (cfg.data !== prev.data) {
      (map.getSource(overlaySource(cfg.id)) as GeoJSONSource | undefined)?.setData(cfg.data as never);
      rec.values.clear();
      rec.selected = null;
      if (rec.hovered) clearOverlayHover(map, rec);
      dataChanged = true;
    }
    const fillChanged = dataChanged || cfg.fill?.paint !== prev.fill?.paint || cfg.fill?.color !== prev.fill?.color || !cfg.fill !== !prev.fill;
    if (fillChanged) map.setPaintProperty(fillId, 'fill-color', fillColor(cfg) as never);
    if (fillChanged || cfg.fill?.opacity !== prev.fill?.opacity) map.setPaintProperty(fillId, 'fill-opacity', fillOpacityOf(cfg) as never);
    if (fillVisible(cfg) !== fillVisible(prev)) map.setLayoutProperty(fillId, 'visibility', fillVisible(cfg) ? 'visible' : 'none');
    if (!sameLine(cfg.line, prev.line)) {
      const lp = linePaint(cfg.line);
      for (const k of ['line-color', 'line-width', 'line-opacity']) map.setPaintProperty(`${cfg.id}-line`, k, lp[k] as never);
      map.setPaintProperty(`${cfg.id}-line`, 'line-dasharray', (cfg.line.dash ?? null) as never);
    }
    if (!cfg.interactive && rec.hovered) clearOverlayHover(map, rec);
    applyOverlayValues(map, rec);
    applyOverlaySelection(map, rec);
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const next = props.overlays ?? [];
    const ids = new Set(next.map((o) => o.id));
    for (const rec of [...st.overlays.values()]) if (!ids.has(rec.cfg.id)) removeOverlay(map, rec);
    for (const cfg of next) {
      const rec = st.overlays.get(cfg.id);
      if (rec) updateOverlay(map, rec, cfg);
      else addOverlay(map, cfg);
    }
    const order = next.map((o) => o.id).join('|');
    if (order !== st.overlayOrder) {
      for (const cfg of next) for (const s of OVERLAY_SUFFIXES) if (map.getLayer(`${cfg.id}${s}`)) map.moveLayer(`${cfg.id}${s}`, st.overlayAnchor);
      st.overlayOrder = order;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.overlays, ready]);

  // built-in tract layers on/off
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const vis = props.baseTracts === false ? 'none' : 'visible';
    for (const l of TRACT_LAYERS) if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', vis);
    if (props.baseTracts === false && st.hovered) {
      map.setFeatureState({ source: 'tracts', id: st.hovered }, { hover: false });
      st.hovered = null;
      setHover((h) => (h && h.overlay === null ? null : h));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.baseTracts, ready]);

  // 3D buildings on/off
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const vis = props.buildings === false ? 'none' : 'visible';
    for (const l of ['osm-3d', 'focus-3d']) if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', vis);
  }, [props.buildings, ready]);

  // ------------------------------------------------------------ recolor (tweened through feature-state)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const { paint } = props;
    const relief = paint.kind === 'relief';
    if (map.getLayer('relief')) map.setLayoutProperty('relief', 'visibility', relief ? 'visible' : 'none');
    if (relief) {
      map.setPaintProperty('tract-fill', 'fill-color', 'rgba(0,0,0,0)');
      st.kind = 'relief';
      return;
    }
    if (paint.kind !== st.kind || paint.kind === 'cat' || paint.bins) {
      map.setPaintProperty('tract-fill', 'fill-color', withNonResidential(paint.kind === 'seq' ? seqExpression(paint.palette, paint.bins ?? SCORE_BINS) : catExpression(paint.palette)));
    }
    const kindChanged = paint.kind !== st.kind;
    st.kind = paint.kind;
    cancelAnimationFrame(st.tween);
    const key = paint.kind === 'seq' ? 'v' : 'k';
    const from = new Map(st.values);
    const to = new Map<string, number>();
    for (const [id, v] of paint.values) to.set(id, v == null ? -1 : v);
    const apply = (t: number) => {
      for (const [id, target] of to) {
        const a = from.get(id);
        let v = target;
        if (paint.kind === 'seq' && a != null && a >= 0 && target >= 0 && !kindChanged) v = a + (target - a) * t;
        if (st.values.get(id) !== v) {
          map.setFeatureState({ source: 'tracts', id }, { [key]: v });
          st.values.set(id, v);
        }
      }
    };
    if (props.lite || paint.kind === 'cat' || kindChanged) {
      apply(1);
      return;
    }
    const t0 = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / 350);
      apply(easeOutCubic(t));
      if (t < 1) st.tween = requestAnimationFrame(step);
    };
    st.tween = requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.paint, ready]);

  // flips
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const next = props.flips ?? new Set<string>();
    for (const id of st.flips) if (!next.has(id)) map.setFeatureState({ source: 'tracts', id }, { flip: false });
    for (const id of next) if (!st.flips.has(id)) map.setFeatureState({ source: 'tracts', id }, { flip: true });
    st.flips = new Set(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.flips, ready]);

  // ------------------------------------------------------------ selection: outline, camera, buildings grow
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const id = props.selectedId;
    if (st.selected && st.selected !== id) map.setFeatureState({ source: 'tracts', id: st.selected }, { selected: false });
    if (id) map.setFeatureState({ source: 'tracts', id }, { selected: true });
    const changed = st.selected !== id;
    st.selected = id;
    if (!id || !changed) return;
    const b = tractBounds.get(id);
    if (b) flyToBounds(map, b);
    if (map.getLayer('focus-3d')) {
      cancelAnimationFrame(st.bldRaf);
      const setH = (m: number) => map.setPaintProperty('focus-3d', 'fill-extrusion-height', ['*', ['get', 'h'], ['case', ['==', ['get', 'GEOID'], id], m, 1]]);
      if (props.lite) setH(1);
      else {
        const t0 = performance.now() + 250;
        const step = () => {
          const t = Math.max(0, Math.min(1, (performance.now() - t0) / 800));
          setH(easeOutCubic(t));
          if (t < 1) st.bldRaf = requestAnimationFrame(step);
        };
        setH(0);
        st.bldRaf = requestAnimationFrame(step);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedId, ready]);

  // building colors: the selected tract takes the top typology's color; guessed heights are faded
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !map.getLayer('focus-3d')) return;
    const id = props.selectedId ?? '';
    const c = props.buildingColor ?? '#a8a29e';
    const src = ['coalesce', ['get', 'src'], 'default'];
    map.setPaintProperty('focus-3d', 'fill-extrusion-color', ['case', ['==', ['get', 'GEOID'], id], ['match', src, 'default', tint(c, 0.62), 'accessory', tint(c, 0.35), c], ['match', src, 'default', '#ebe9e6', '#d6d3d1']] as never);
  }, [props.buildingColor, props.selectedId, ready]);

  // search pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const pin = props.pin;
    if (!pin) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    let m = markerRef.current;
    if (!m) {
      m = new maplibregl.Marker({ color: VIOLET, scale: 0.95 });
      const label = document.createElement('div');
      label.className = 'vp-pin-label';
      m.getElement().appendChild(label);
      markerRef.current = m;
    }
    m.setLngLat([pin.lng, pin.lat]).addTo(map);
    const label = m.getElement().querySelector('.vp-pin-label');
    if (label) label.textContent = pin.label;
    if (performance.now() - st.camAt > 100) {
      const target = { center: [pin.lng, pin.lat] as [number, number], zoom: Math.max(map.getZoom(), 14.5) };
      if (props.lite) map.jumpTo(target);
      else map.flyTo({ ...target, duration: 1400, essential: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.pin, ready]);

  // terrain exaggeration eases in when a tract is selected (or always, for the hero and the Terrain layer)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const want = props.terrain && !props.lite && (!!props.selectedId || !!props.terrainAlways) ? 1.2 : 0;
    const contoursOn = props.terrain && !props.lite;
    for (const l of ['contour-minor', 'contour-major', 'contour-label']) if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', contoursOn ? 'visible' : 'none');
    cancelAnimationFrame(st.terrainRaf);
    const from = st.terrainE;
    const setE = (e: number) => {
      st.terrainE = e;
      try {
        if (e <= 0.001) map.setTerrain(null);
        else map.setTerrain({ source: 'dem-terrain', exaggeration: e });
      } catch {
        /* terrain unsupported */
      }
    };
    if (props.lite || Math.abs(from - want) < 0.01) {
      setE(want);
      return;
    }
    const t0 = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / 1200);
      setE(from + (want - from) * easeInOutCubic(t));
      if (t < 1) st.terrainRaf = requestAnimationFrame(step);
    };
    st.terrainRaf = requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.terrain, props.lite, props.selectedId, props.terrainAlways, ready]);

  // idle orbit after 25 s without input
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !props.idleOrbit || props.lite) return;
    let last = 0;
    const stop = () => {
      cancelAnimationFrame(st.orbitRaf);
      st.orbitRaf = 0;
    };
    const orbit = (now: number) => {
      if (map.isMoving()) {
        last = now;
        st.orbitRaf = requestAnimationFrame(orbit);
        return;
      }
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      map.setBearing(map.getBearing() + 1.5 * dt);
      st.orbitRaf = requestAnimationFrame(orbit);
    };
    const arm = () => {
      stop();
      window.clearTimeout(st.idleTimer);
      st.idleTimer = window.setTimeout(() => {
        last = 0;
        st.orbitRaf = requestAnimationFrame(orbit);
      }, 25000);
    };
    const evs = ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart'] as const;
    evs.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();
    return () => {
      stop();
      window.clearTimeout(st.idleTimer);
      evs.forEach((e) => window.removeEventListener(e, arm));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.idleOrbit, props.lite, ready]);

  // continuous rotation (hero)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !props.autoOrbit || props.lite) return;
    let raf = 0, last = 0;
    const spin = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      map.setBearing(map.getBearing() + 3 * dt);
      raf = requestAnimationFrame(spin);
    };
    raf = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(raf);
  }, [props.autoOrbit, props.lite, ready]);

  // resize with the container
  useEffect(() => {
    if (!el.current) return;
    const ro = new ResizeObserver(() => mapRef.current?.resize());
    ro.observe(el.current);
    return () => ro.disconnect();
  }, []);

  const tooltipFor = hover ? (hover.overlay ? props.overlays?.find((o) => o.id === hover.overlay)?.tooltip : props.tooltip) : undefined;

  return (
    <div className={`relative h-full w-full overflow-hidden ${props.className ?? ''}`}>
      <div ref={el} style={{ position: 'absolute', inset: 0 }} />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-[#eef0f2]">
          <div className="flex items-center gap-2 text-small text-slate-600">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Loading map…
          </div>
        </div>
      )}
      {hover && tooltipFor && (
        <div className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-lg bg-slate-900/92 px-3 py-2 text-small text-white shadow-lg backdrop-blur" style={{ left: hover.x, top: hover.y }}>
          {tooltipFor(hover.id)}
        </div>
      )}
      {props.elevationReadout && elev != null && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1 text-small font-medium text-slate-800 shadow-md ring-1 ring-black/5 tnum">
          Ground ≈ <b>{fmtFt(elev)}</b>
        </div>
      )}
      {props.overlay}
    </div>
  );
}
