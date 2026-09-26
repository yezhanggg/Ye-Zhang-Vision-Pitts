import { useEffect, useRef, useState, type ReactNode } from 'react';
import maplibregl, { type ExpressionSpecification, type Map as MLMap, type MapGeoJSONFeature } from 'maplibre-gl';
import { buildingsFC, scoring, tractBounds, tractsFC } from '../lib/data';
import { ELEV_STOPS_FT, M_TO_FT, PGH_VIEW, VIOLET, catExpression, contourSourceUrl, easeInOutCubic, easeOutCubic, loadBasemapStyle, loadDemConfig, seqExpression, type DemConfig } from '../lib/mapStyle';
import type { MapPaint } from '../lib/paint';
import type { Pin } from '../lib/types';

export interface SyncGroup {
  maps: Set<MLMap>;
  lock: boolean;
}
export const makeSyncGroup = (): SyncGroup => ({ maps: new Set(), lock: false });
export type IntroPhase = 'spin' | 'fly' | 'done';

interface Props {
  paint: MapPaint;
  selectedId: string | null;
  flips?: Set<string> | null;
  /** Color for the selected tract's 3D buildings (the top typology's color). */
  buildingColor?: string | null;
  lite: boolean;
  terrain: boolean;
  intro?: boolean;
  skipSignal?: number;
  onIntroPhase?: (p: IntroPhase) => void;
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
}

const NON_RESIDENTIAL = '#efede9';
/** The choropleth fades as you zoom in so streets and buildings show through. */
const ZOOM_FILL = ['interpolate', ['linear'], ['zoom'], 12, 0.62, 15, 0.35] as unknown as number;
const fmtFt = (v: number) => `${Math.round(v).toLocaleString('en-US')} ft`;
const SCORE_BINS = scoring.bins.score;

function tint(hex: string, amt: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (v: number) => Math.round(v + (255 - v) * amt);
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

/** Non-residential tracts are drawn in a flat light grey whatever the metric. */
const withNonResidential = (expr: ExpressionSpecification | string): ExpressionSpecification => ['case', ['!', ['to-boolean', ['get', 'residential']]], NON_RESIDENTIAL, expr] as unknown as ExpressionSpecification;

export default function MapView(props: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
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
    introDone: !props.intro,
    orbitRaf: 0,
    idleTimer: 0,
    elevRaf: 0,
    camAt: 0,
    dem: null as DemConfig | null,
  }).current;

  // ------------------------------------------------------------ create
  useEffect(() => {
    let disposed = false;
    let map: MLMap | null = null;
    Promise.all([loadBasemapStyle(), loadDemConfig()]).then(([style, dem]) => {
      if (disposed || !el.current) return;
      st.dem = dem;
      const introOn = !!live.current.intro && !live.current.lite;
      const v0 = live.current.initialView ?? PGH_VIEW;
      map = new maplibregl.Map({
        container: el.current,
        style,
        center: introOn ? [-128, 34] : v0.center,
        zoom: introOn ? 1.3 : v0.zoom,
        pitch: introOn ? 0 : v0.pitch,
        bearing: introOn ? 0 : v0.bearing,
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
        setup(map, introOn);
        setReady(true);
        if (introOn) runIntro(map);
        else {
          st.introDone = true;
          live.current.onIntroPhase?.('done');
        }
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setup(map: MLMap, introOn: boolean) {
    if (introOn) {
      try {
        map.setProjection({ type: 'globe' });
      } catch {
        /* older engines */
      }
    }
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

    // Tracts
    map.addSource('tracts', { type: 'geojson', data: tractsFC as never, promoteId: 'GEOID' });
    const p0 = live.current.paint;
    map.addLayer(
      {
        id: 'tract-fill',
        type: 'fill',
        source: 'tracts',
        paint: {
          'fill-color': withNonResidential(p0.kind === 'cat' ? catExpression(p0.palette) : p0.kind === 'relief' ? 'rgba(0,0,0,0)' : seqExpression(p0.palette, p0.bins ?? SCORE_BINS)),
          'fill-opacity': introOn ? 0 : fillOpacity,
          'fill-opacity-transition': { duration: 900, delay: 0 },
        },
      },
      firstSymbol,
    );
    map.addLayer({ id: 'tract-line', type: 'line', source: 'tracts', paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.3, 14, 1.2], 'line-opacity': 0.85 } }, firstSymbol);
    map.addLayer({ id: 'tract-focus', type: 'line', source: 'tracts', filter: ['to-boolean', ['get', 'focus']], paint: { 'line-color': '#475569', 'line-width': 1.3, 'line-dasharray': [2, 1.6], 'line-opacity': 0.7 } }, firstSymbol);
    map.addLayer({ id: 'tract-flip', type: 'line', source: 'tracts', paint: { 'line-color': '#0f172a', 'line-width': ['case', ['boolean', ['feature-state', 'flip'], false], 2.2, 0], 'line-width-transition': { duration: 350, delay: 0 } } }, firstSymbol);
    map.addLayer({ id: 'tract-hover', type: 'line', source: 'tracts', paint: { 'line-color': '#334155', 'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2, 0] } }, firstSymbol);
    map.addLayer({ id: 'tract-sel-glow', type: 'line', source: 'tracts', paint: { 'line-color': VIOLET, 'line-blur': 6, 'line-opacity': 0.45, 'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 12, 0] } }, firstSymbol);
    map.addLayer({ id: 'tract-sel', type: 'line', source: 'tracts', paint: { 'line-color': VIOLET, 'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3.2, 0] } }, firstSymbol);

    // Contour lines in feet from the same elevation tiles, visible with Terrain from z13.
    try {
      map.addSource('contours', { type: 'vector', tiles: [contourSourceUrl(dem)], maxzoom: 15 });
      const vis = live.current.terrain && !live.current.lite ? 'visible' : 'none';
      map.addLayer({ id: 'contour-minor', type: 'line', source: 'contours', 'source-layer': 'contours', minzoom: 13, filter: ['==', ['get', 'level'], 0], layout: { visibility: vis }, paint: { 'line-color': '#57534e', 'line-opacity': 0.32, 'line-width': 0.6 } }, firstSymbol);
      map.addLayer({ id: 'contour-major', type: 'line', source: 'contours', 'source-layer': 'contours', minzoom: 13, filter: ['>', ['get', 'level'], 0], layout: { visibility: vis }, paint: { 'line-color': '#44403c', 'line-opacity': 0.6, 'line-width': 1.2 } }, firstSymbol);
      if (map.getStyle().glyphs) {
        map.addLayer({
          id: 'contour-label',
          type: 'symbol',
          source: 'contours',
          'source-layer': 'contours',
          minzoom: 13.5,
          filter: ['>', ['get', 'level'], 0],
          layout: { visibility: vis, 'symbol-placement': 'line', 'text-field': ['concat', ['number-format', ['get', 'ele'], { locale: 'en-US' }], ' ft'], 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-max-angle': 30, 'symbol-spacing': 320 },
          paint: { 'text-color': '#44403c', 'text-halo-color': 'rgba(255,255,255,0.9)', 'text-halo-width': 1.6 },
        });
      }
    } catch (e) {
      console.info('[map] contours unavailable', e);
    }

    // Buildings: muted OSM backdrop everywhere; detailed focus-tract buildings when the pipeline provides them.
    if (map.getSource('openmaptiles')) {
      map.addLayer(
        {
          id: 'osm-3d',
          type: 'fill-extrusion',
          source: 'openmaptiles',
          'source-layer': 'building',
          minzoom: 14,
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
          paint: { 'fill-extrusion-color': ['case', ['==', ['coalesce', ['get', 'src'], 'default'], 'default'], '#e7e5e4', '#d6d3d1'], 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-opacity': 0.92, 'fill-extrusion-vertical-gradient': true },
        },
        firstSymbol,
      );
    }

    // Interaction
    map.on('mousemove', 'tract-fill', (e) => {
      const f = e.features?.[0] as MapGeoJSONFeature | undefined;
      const id = f ? String(f.id ?? f.properties?.GEOID) : null;
      if (id !== st.hovered) {
        if (st.hovered) map.setFeatureState({ source: 'tracts', id: st.hovered }, { hover: false });
        if (id) map.setFeatureState({ source: 'tracts', id }, { hover: true });
        st.hovered = id;
      }
      map.getCanvas().style.cursor = id ? 'pointer' : '';
      setHover(id ? { id, x: e.point.x, y: e.point.y } : null);
    });
    map.on('mouseleave', 'tract-fill', () => {
      if (st.hovered) map.setFeatureState({ source: 'tracts', id: st.hovered }, { hover: false });
      st.hovered = null;
      map.getCanvas().style.cursor = '';
      setHover(null);
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
      const f = e.features?.[0];
      if (f && st.introDone) live.current.onSelect?.(String(f.id ?? f.properties?.GEOID));
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

  function runIntro(map: MLMap) {
    live.current.onIntroPhase?.('spin');
    map.easeTo({ center: [-96, 38], duration: 2200, easing: (t) => t });
    map.once('moveend', () => {
      if (st.introDone) return;
      live.current.onIntroPhase?.('fly');
      map.flyTo({ ...PGH_VIEW, duration: 5000, curve: 1.5, essential: true });
      map.once('moveend', () => finishIntro(map));
    });
  }
  function finishIntro(map: MLMap) {
    if (st.introDone) return;
    st.introDone = true;
    map.setPaintProperty('tract-fill', 'fill-opacity', fillOpacity);
    live.current.onIntroPhase?.('done');
  }

  // skip intro
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !props.skipSignal || st.introDone) return;
    map.stop();
    map.jumpTo(PGH_VIEW);
    finishIntro(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.skipSignal, ready]);

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
    if (!id || !changed || !st.introDone) return;
    st.camAt = performance.now();
    const b = tractBounds.get(id);
    if (b) {
      const pad = props.padding ?? { top: 60, right: 60, bottom: 60, left: 60 };
      const cam = map.cameraForBounds(b, { padding: pad, bearing: -20 });
      if (cam) {
        const target = { center: cam.center, zoom: Math.min((cam.zoom ?? 14) - 0.35, 16), pitch: 60, bearing: -20 };
        if (props.lite) map.jumpTo(target);
        else map.easeTo({ ...target, duration: 1200, easing: easeInOutCubic, essential: true });
      }
    }
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
    if (st.introDone && performance.now() - st.camAt > 100) {
      const target = { center: [pin.lng, pin.lat] as [number, number], zoom: Math.max(map.getZoom(), 14.5) };
      if (props.lite) map.jumpTo(target);
      else map.flyTo({ ...target, duration: 1400, essential: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.pin, ready]);

  // terrain exaggeration eases in when a tract is selected (or always, for the hero)
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
      if (!st.introDone || map.isMoving()) {
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

  // continuous rotation (landing hero)
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
      {hover && props.tooltip && (
        <div className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-lg bg-slate-900/92 px-3 py-2 text-small text-white shadow-lg backdrop-blur" style={{ left: hover.x, top: hover.y }}>
          {props.tooltip(hover.id)}
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
