import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import maplibregl, {
  type ExpressionSpecification,
  type GeoJSONSource,
  type Map as MLMap,
  type MapGeoJSONFeature,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import { buildingsFC, scoring, tractBounds, tractsFC } from "../lib/data";
import { boundsOf, type Bounds } from "../lib/geo";
import { farZoom, isFar } from "../lib/farView";
import type { Cue } from "../lib/tour";
import {
  ELEV_STOPS_FT,
  M_TO_FT,
  PGH_VIEW,
  VIOLET,
  catExpression,
  contourSourceUrl,
  easeInOutCubic,
  easeOutCubic,
  loadBasemapStyle,
  loadDemConfig,
  seqExpression,
  type DemConfig,
} from "../lib/mapStyle";
import type { MapPaint } from "../lib/paint";
import type { Pin } from "../lib/types";

export interface SyncGroup {
  maps: Set<MLMap>;
  lock: boolean;
  /** Zoom is linked only while this is on; off, each map zooms and frames its own tract on its own. */
  enabled: boolean;
  /** Zoom each map would pick to frame its own selected tract; the pair uses the smallest so both tracts fit. */
  wanted: Map<MLMap, { zoom: number; center: maplibregl.LngLatLike }>;
}
export const makeSyncGroup = (): SyncGroup => ({
  maps: new Set(),
  lock: false,
  enabled: true,
  wanted: new Map(),
});

/** Any polygon feature collection (tracts, block groups, ZIPs, county, city). */
export interface OverlayFC {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: { type: string; coordinates: unknown };
  }[];
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
  fill?: {
    paint?: MapPaint;
    color?: string;
    opacity?: number | ExpressionSpecification;
  };
  line: {
    color: string;
    width: number | ExpressionSpecification;
    dash?: number[];
    opacity?: number;
    /** A wider line drawn underneath (usually white) so the boundary reads over other lines, buildings and hills. */
    casing?: {
      color: string;
      width: number | ExpressionSpecification;
      opacity?: number;
    };
    /** Name labels at the polygon's pole of inaccessibility, from `minzoom` on (skipped when the style has no glyphs). */
    label?: { field: string; minzoom?: number; color?: string; size?: number };
  };
  interactive?: boolean;
  selectedId?: string | null;
  /** Ease the camera to the selected feature when the selection changes. */
  zoomTo?: boolean;
  onSelect?: (id: string) => void;
  tooltip?: (id: string) => ReactNode;
}

/** How much the rest of the map darkens around a selected place. */
const SPOTLIGHT_DIM = 0.3;
type Ring = number[][];
const ringArea = (r: Ring) => {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]);
  return a / 2;
};
/** A world-sized ring with the selected shape's outer rings as holes, wound opposite to the outer ring. */
export function spotlightRings(geometry: { type: string; coordinates: unknown }): Ring[] {
  const outer: Ring = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];
  const polys = geometry.type === "Polygon" ? [geometry.coordinates as Ring[]] : geometry.type === "MultiPolygon" ? (geometry.coordinates as Ring[][]) : [];
  const sign = Math.sign(ringArea(outer));
  const holes = polys.map((p) => p[0]).filter((r) => r && r.length > 3).map((r) => (Math.sign(ringArea(r)) === sign ? [...r].reverse() : r));
  return [outer, ...holes];
}

export type IntroPhase = "spin" | "fly" | "done";

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
  initialView?: {
    center: [number, number];
    zoom: number;
    pitch: number;
    bearing: number;
  };
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
  /** Shaded relief over the basemap, default false (the basemap stays evenly toned). */
  hillshade?: boolean;
  /** Feature under the cursor changed (tract layers and interactive overlays). */
  onHover?: (id: string | null, overlayId?: string) => void;
  /** Play the globe → Pittsburgh flight once the style loads (landing page → Explore). */
  intro?: boolean;
  /** How dark the rest of the map goes when a place is selected (default 0.3). */
  spotlightDim?: number;
  /** Increment to cut the flight short. */
  skipSignal?: number;
  onIntroPhase?: (p: IntroPhase) => void;
  /** A camera move asked for by the quick tour; runs once per nonce, as a jump under reduced motion. */
  cue?: Cue | null;
  /** Called once with the MapLibre map after it is created (for exports such as map snapshots). */
  onMapReady?: (map: MLMap) => void;
}

const NON_RESIDENTIAL = "#efede9";
/** The choropleth fades as you zoom in so streets and buildings show through. */
const ZOOM_FILL = [
  "interpolate",
  ["linear"],
  ["zoom"],
  12,
  0.62,
  15,
  0.35,
] as unknown as number;
const fmtFt = (v: number) => `${Math.round(v).toLocaleString("en-US")} ft`;
const SCORE_BINS = scoring.bins.score;
const TRACT_LAYERS = [
  "tract-fill",
  "tract-line",
  "tract-focus",
  "tract-flip",
  "tract-hover",
  "tract-sel-glow",
  "tract-sel",
];
const OVERLAY_SUFFIXES = [
  "-fill",
  "-casing",
  "-line",
  "-hover",
  "-sel-glow",
  "-sel",
  "-label",
] as const;
const DEFAULT_PAD = { top: 60, right: 60, bottom: 60, left: 60 };

function tint(hex: string, amt: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (v: number) => Math.round(v + (255 - v) * amt);
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

/** Non-residential tracts are drawn in a flat light grey whatever the metric. */
const withNonResidential = (
  expr: ExpressionSpecification | string,
): ExpressionSpecification =>
  [
    "case",
    ["!", ["to-boolean", ["get", "residential"]]],
    NON_RESIDENTIAL,
    expr,
  ] as unknown as ExpressionSpecification;

// ------------------------------------------------------------------ overlay helpers
interface OverlayRec {
  cfg: OverlayLayer;
  /** Feature state applied so far (per id) under `key`. */
  values: Map<string, number>;
  key: "v" | "k";
  selected: string | null;
  hovered: string | null;
  handlers: {
    move: (e: MapLayerMouseEvent) => void;
    leave: () => void;
    click: (e: MapLayerMouseEvent) => void;
  };
}

const overlaySource = (id: string) => `ov-${id}`;
const fillVisible = (cfg: OverlayLayer) => !!cfg.fill || !!cfg.interactive;
function fillColor(cfg: OverlayLayer): ExpressionSpecification | string {
  const p = cfg.fill?.paint;
  if (p?.kind === "cat") return catExpression(p.palette);
  if (p?.kind === "seq") return seqExpression(p.palette, p.bins ?? SCORE_BINS);
  if (p?.kind === "relief") return "rgba(0,0,0,0)";
  return cfg.fill?.color ?? "#94a3b8";
}
const fillOpacityOf = (cfg: OverlayLayer): number | ExpressionSpecification =>
  cfg.fill?.opacity ?? (cfg.fill ? ZOOM_FILL : 0);
function linePaint(line: OverlayLayer["line"]) {
  const p: Record<string, unknown> = {
    "line-color": line.color,
    "line-width": line.width,
    "line-opacity": line.opacity ?? 1,
  };
  if (line.dash) p["line-dasharray"] = line.dash;
  return p;
}
const sameLine = (a: OverlayLayer["line"], b: OverlayLayer["line"]) =>
  a.color === b.color &&
  a.width === b.width &&
  a.opacity === b.opacity &&
  String(a.dash ?? "") === String(b.dash ?? "") &&
  a.casing?.width === b.casing?.width &&
  a.casing?.opacity === b.casing?.opacity &&
  a.casing?.color === b.casing?.color &&
  a.label?.minzoom === b.label?.minzoom &&
  a.label?.color === b.label?.color;
/** Casing or label layers must be added or removed, not repainted. */
const lineStructureChanged = (
  a: OverlayLayer["line"],
  b: OverlayLayer["line"],
) =>
  !!a.casing !== !!b.casing ||
  (a.label?.field ?? null) !== (b.label?.field ?? null);

const boundsCache = new WeakMap<OverlayFC, Map<string, Bounds | null>>();
function featureBounds(
  data: OverlayFC,
  idField: string,
  id: string,
): Bounds | null {
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
  const [hover, setHover] = useState<{
    overlay: string | null;
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [flat, setFlat] = useState(false);
  const [elev, setElev] = useState<number | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const live = useRef(props);
  live.current = props;
  const fillOpacity = props.fillOpacity ?? ZOOM_FILL;
  const st = useRef({
    values: new Map<string, number>(),
    kind: "" as "" | "seq" | "cat" | "relief",
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
    introDone: !props.intro,
    dem: null as DemConfig | null,
    firstSymbol: undefined as string | undefined,
    overlayAnchor: undefined as string | undefined,
    /** Overlay lines and labels go here: above contours and 3D buildings, below the basemap labels. */
    lineAnchor: undefined as string | undefined,
    /** Font stack the basemap uses, or null when the style has no glyphs (fallback style): then no overlay labels. */
    labelFont: null as string[] | null,
    overlays: new Map<string, OverlayRec>(),
    overlayOrder: "",
    hoverOverlay: null as string | null,
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
        attributionControl: {
          compact: true,
          customAttribution: [
            dem.attribution,
            "Search © OpenStreetMap / Photon · US Census Geocoder",
          ],
        },
        canvasContextAttributes: { antialias: true },
        fadeDuration: 200,
      });
      mapRef.current = map;
      (window as unknown as { __map?: MLMap }).__map = map;
      live.current.onMapReady?.(map);
      if (live.current.interactive ?? true)
        map.addControl(
          new maplibregl.NavigationControl({
            visualizePitch: true,
            showCompass: true,
          }),
          "bottom-right",
        );
      // Gentler scroll and trackpad zoom than MapLibre's default (1/450 and 1/100).
      map.scrollZoom.setWheelZoomRate(1 / 900);
      map.scrollZoom.setZoomRate(1 / 220);
      map.on("style.load", () => {
        if (!map) return;
        setup(map, introOn);
        setReady(true);
        if (introOn) runIntro(map);
        else {
          st.introDone = true;
          live.current.onIntroPhase?.("done");
        }
      });
      map.on("error", (e) => {
        const msg = String((e as { error?: Error }).error?.message ?? "");
        if (!/Failed to fetch|AJAXError|NetworkError|Load failed/.test(msg))
          console.warn("[map]", msg);
      });
    });
    return () => {
      disposed = true;
      for (const k of [
        "tween",
        "bldRaf",
        "terrainRaf",
        "orbitRaf",
        "elevRaf",
      ] as const)
        cancelAnimationFrame(st[k]);
      markerRef.current?.remove();
      markerRef.current = null;
      if (map) {
        live.current.sync?.maps.delete(map);
        live.current.sync?.wanted.delete(map);
        map.remove();
      }
      mapRef.current = null;
      st.overlays.clear();
      st.overlayOrder = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setup(map: MLMap, introOn = false) {
    if (introOn) {
      try {
        map.setProjection({ type: "globe" });
      } catch {
        /* older engines */
      }
    }
    try {
      map.setSky({
        "sky-color": "#dfe9f3",
        "horizon-color": "#f4efe8",
        "fog-color": "#f6f4f1",
        "sky-horizon-blend": 0.6,
        "horizon-fog-blend": 0.6,
        "fog-ground-blend": 0.25,
        "atmosphere-blend": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          1,
          7,
          1,
          10,
          0,
        ],
      });
    } catch {
      /* sky unsupported */
    }
    const layers = map.getStyle().layers ?? [];
    const firstSymbol = layers.find((l) => l.type === "symbol")?.id;
    st.firstSymbol = firstSymbol;
    for (const l of layers)
      if (l.type === "symbol" && /poi|housenum/.test(l.id))
        map.setLayoutProperty(l.id, "visibility", "none");

    // Elevation: hill shading only when asked for, 3D terrain on demand, hypsometric tint for the Elevation layer.
    const hv = live.current.hillshade
      ? ("visible" as const)
      : ("none" as const);
    const dem = st.dem!;
    const demSrc = {
      type: "raster-dem" as const,
      tiles: dem.tiles,
      encoding: dem.encoding,
      tileSize: dem.tileSize,
      maxzoom: dem.maxzoom,
    };
    map.addSource("dem-terrain", demSrc);
    map.addSource("dem-hillshade", demSrc);
    try {
      map.addLayer(
        {
          id: "hillshade",
          type: "hillshade",
          source: "dem-hillshade",
          layout: { visibility: hv },
          paint: {
            "hillshade-method": "multidirectional",
            "hillshade-exaggeration": 0.35,
            "hillshade-highlight-color": [
              "#ffffff",
              "#ffffff",
              "#ffffff",
              "#ffffff",
            ],
            "hillshade-shadow-color": [
              "#6b6258",
              "#7a7168",
              "#6b6258",
              "#8a8177",
            ],
            "hillshade-accent-color": "#8a8177",
          } as never,
        },
        firstSymbol,
      );
    } catch {
      map.addLayer(
        {
          id: "hillshade",
          type: "hillshade",
          source: "dem-hillshade",
          layout: { visibility: hv },
          paint: {
            "hillshade-exaggeration": 0.3,
            "hillshade-shadow-color": "#6b6258",
            "hillshade-highlight-color": "#ffffff",
            "hillshade-accent-color": "#8a8177",
          },
        },
        firstSymbol,
      );
    }
    try {
      const stops: unknown[] = [];
      for (const [ft, c] of ELEV_STOPS_FT) stops.push(ft / M_TO_FT, c);
      map.addLayer(
        {
          id: "relief",
          type: "color-relief",
          source: "dem-hillshade",
          layout: { visibility: "none" },
          paint: {
            "color-relief-color": [
              "interpolate",
              ["linear"],
              ["elevation"],
              ...stops,
            ],
            "color-relief-opacity": 0.9,
          },
        } as never,
        "hillshade",
      );
    } catch {
      /* color-relief needs MapLibre >= 5.6 */
    }

    // Tracts (the built-in layers Match and the compare views paint; hidden when baseTracts is false)
    const tractsOn = live.current.baseTracts !== false;
    const vis = {
      visibility: tractsOn ? ("visible" as const) : ("none" as const),
    };
    map.addSource("tracts", {
      type: "geojson",
      data: tractsFC as never,
      promoteId: "GEOID",
    });
    const p0 = live.current.paint;
    map.addLayer(
      {
        id: "tract-fill",
        type: "fill",
        source: "tracts",
        layout: vis,
        paint: {
          "fill-color": withNonResidential(
            p0.kind === "cat"
              ? catExpression(p0.palette)
              : p0.kind === "relief"
                ? "rgba(0,0,0,0)"
                : seqExpression(p0.palette, p0.bins ?? SCORE_BINS),
          ),
          "fill-opacity": introOn ? 0 : fillOpacity,
          "fill-opacity-transition": { duration: 900, delay: 0 },
        },
      },
      firstSymbol,
    );
    map.addLayer(
      {
        id: "tract-line",
        type: "line",
        source: "tracts",
        layout: vis,
        paint: {
          "line-color": "#ffffff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.3, 14, 1.2],
          "line-opacity": 0.85,
        },
      },
      firstSymbol,
    );
    map.addLayer(
      {
        id: "tract-focus",
        type: "line",
        source: "tracts",
        layout: vis,
        filter: ["to-boolean", ["get", "focus"]],
        paint: {
          "line-color": "#475569",
          "line-width": 1.3,
          "line-dasharray": [2, 1.6],
          "line-opacity": 0.7,
        },
      },
      firstSymbol,
    );
    map.addLayer(
      {
        id: "tract-flip",
        type: "line",
        source: "tracts",
        layout: vis,
        paint: {
          "line-color": "#0f172a",
          "line-width": [
            "case",
            ["boolean", ["feature-state", "flip"], false],
            2.2,
            0,
          ],
          "line-width-transition": { duration: 350, delay: 0 },
        },
      },
      firstSymbol,
    );
    map.addLayer(
      {
        id: "tract-hover",
        type: "line",
        source: "tracts",
        layout: vis,
        paint: {
          "line-color": "#334155",
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            2,
            0,
          ],
        },
      },
      firstSymbol,
    );
    map.addLayer(
      {
        id: "tract-sel-glow",
        type: "line",
        source: "tracts",
        layout: vis,
        paint: {
          "line-color": VIOLET,
          "line-blur": 6,
          "line-opacity": 0.45,
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            12,
            0,
          ],
        },
      },
      firstSymbol,
    );
    map.addLayer(
      {
        id: "tract-sel",
        type: "line",
        source: "tracts",
        layout: vis,
        paint: {
          "line-color": VIOLET,
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            3.2,
            0,
          ],
        },
      },
      firstSymbol,
    );

    // Contour lines in feet from the same elevation tiles, visible with Terrain from z13.
    try {
      map.addSource("contours", {
        type: "vector",
        tiles: [contourSourceUrl(dem)],
        maxzoom: 15,
      });
      const cvis =
        live.current.terrain && !live.current.lite ? "visible" : "none";
      map.addLayer(
        {
          id: "contour-minor",
          type: "line",
          source: "contours",
          "source-layer": "contours",
          minzoom: 13,
          filter: ["==", ["get", "level"], 0],
          layout: { visibility: cvis },
          paint: {
            "line-color": "#57534e",
            "line-opacity": 0.32,
            "line-width": 0.6,
          },
        },
        firstSymbol,
      );
      map.addLayer(
        {
          id: "contour-major",
          type: "line",
          source: "contours",
          "source-layer": "contours",
          minzoom: 13,
          filter: [">", ["get", "level"], 0],
          layout: { visibility: cvis },
          paint: {
            "line-color": "#44403c",
            "line-opacity": 0.6,
            "line-width": 1.2,
          },
        },
        firstSymbol,
      );
      if (map.getStyle().glyphs) {
        map.addLayer({
          id: "contour-label",
          type: "symbol",
          source: "contours",
          "source-layer": "contours",
          minzoom: 13.5,
          filter: [">", ["get", "level"], 0],
          layout: {
            visibility: cvis,
            "symbol-placement": "line",
            "text-field": [
              "concat",
              ["number-format", ["get", "ele"], { locale: "en-US" }],
              " ft",
            ],
            "text-font": ["Noto Sans Regular"],
            "text-size": 12,
            "text-max-angle": 30,
            "symbol-spacing": 320,
          },
          paint: {
            "text-color": "#44403c",
            "text-halo-color": "rgba(255,255,255,0.9)",
            "text-halo-width": 1.6,
          },
        });
      }
    } catch (e) {
      console.info("[map] contours unavailable", e);
    }

    // Buildings: muted OSM backdrop everywhere; detailed focus-tract buildings when the pipeline provides them.
    const bvis = {
      visibility:
        live.current.buildings === false
          ? ("none" as const)
          : ("visible" as const),
    };
    if (map.getSource("openmaptiles")) {
      map.addLayer(
        {
          id: "osm-3d",
          type: "fill-extrusion",
          source: "openmaptiles",
          "source-layer": "building",
          minzoom: 14,
          layout: bvis,
          paint: {
            "fill-extrusion-color": "#e7e5e4",
            "fill-extrusion-height": [
              "interpolate",
              ["linear"],
              ["zoom"],
              14,
              0,
              14.6,
              ["coalesce", ["get", "render_height"], 0],
            ],
            "fill-extrusion-base": [
              "interpolate",
              ["linear"],
              ["zoom"],
              14,
              0,
              14.6,
              ["coalesce", ["get", "render_min_height"], 0],
            ],
            "fill-extrusion-opacity": 0.5,
          },
        },
        firstSymbol,
      );
    }
    if (buildingsFC.features.length) {
      map.addSource("focus-bld", {
        type: "geojson",
        data: buildingsFC as never,
      });
      map.addLayer(
        {
          id: "focus-3d",
          type: "fill-extrusion",
          source: "focus-bld",
          minzoom: 12,
          layout: bvis,
          paint: {
            "fill-extrusion-color": [
              "case",
              ["==", ["coalesce", ["get", "src"], "default"], "default"],
              "#e7e5e4",
              "#d6d3d1",
            ],
            "fill-extrusion-height": ["get", "h"],
            "fill-extrusion-opacity": 0.92,
            "fill-extrusion-vertical-gradient": true,
          },
        },
        firstSymbol,
      );
    }
    // Overlay fills go under contours and buildings, like the tract layers; their lines and labels sit above them.
    st.overlayAnchor =
      ["contour-minor", "osm-3d", "focus-3d"].find((l) => map.getLayer(l)) ??
      firstSymbol;
    st.lineAnchor = firstSymbol;
    const fontLayer = layers.find(
      (l) =>
        l.type === "symbol" &&
        Array.isArray(
          (l as { layout?: Record<string, unknown> }).layout?.["text-font"],
        ),
    );
    st.labelFont =
      map.getStyle().glyphs && fontLayer
        ? ((fontLayer as { layout?: Record<string, unknown> }).layout?.[
            "text-font"
          ] as string[])
        : null;

    // Interaction (tract layers)
    map.on("mousemove", "tract-fill", (e) => {
      if (live.current.baseTracts === false) return;
      const f = e.features?.[0] as MapGeoJSONFeature | undefined;
      const id = f ? String(f.id ?? f.properties?.GEOID) : null;
      if (id !== st.hovered) {
        if (st.hovered)
          map.setFeatureState(
            { source: "tracts", id: st.hovered },
            { hover: false },
          );
        if (id) map.setFeatureState({ source: "tracts", id }, { hover: true });
        st.hovered = id;
        live.current.onHover?.(id);
      }
      map.getCanvas().style.cursor = id ? "pointer" : "";
      setHover(id ? { overlay: null, id, x: e.point.x, y: e.point.y } : null);
    });
    map.on("mouseleave", "tract-fill", () => {
      if (st.hovered) {
        map.setFeatureState(
          { source: "tracts", id: st.hovered },
          { hover: false },
        );
        live.current.onHover?.(null);
      }
      st.hovered = null;
      map.getCanvas().style.cursor = "";
      setHover((h) => (h && h.overlay === null ? null : h));
    });
    map.on("mousemove", (e) => {
      if (!live.current.elevationReadout) return;
      cancelAnimationFrame(st.elevRaf);
      const ll = e.lngLat;
      st.elevRaf = requestAnimationFrame(() => {
        if (st.terrainE > 0.05) {
          const v = map.queryTerrainElevation(ll);
          setElev(
            v != null && Number.isFinite(v)
              ? (v / st.terrainE) * M_TO_FT
              : null,
          );
        } else setElev(null);
      });
    });
    map.on("mouseout", () => {
      cancelAnimationFrame(st.elevRaf);
      setElev(null);
    });
    map.on("click", "tract-fill", (e) => {
      if (live.current.baseTracts === false) return;
      const f = e.features?.[0];
      if (f && st.introDone)
        live.current.onSelect?.(String(f.id ?? f.properties?.GEOID));
    });

    // Pair sync: mirror the zoom level only; each map keeps its own center, tilt and rotation (panning stays independent).
    const sync = live.current.sync;
    if (sync) {
      sync.maps.add(map);
      map.on("move", (e) => {
        if (
          !sync.enabled ||
          sync.lock ||
          !(e as { originalEvent?: Event }).originalEvent
        )
          return;
        sync.lock = true;
        for (const other of sync.maps)
          if (other !== map) other.jumpTo({ zoom: map.getZoom() });
        sync.lock = false;
      });
    }
  }

  // ------------------------------------------------------------ overlays
  function flyToBounds(map: MLMap, b: Bounds) {
    st.camAt = performance.now();
    const cam = map.cameraForBounds(b, {
      padding: live.current.padding ?? DEFAULT_PAD,
      bearing: -20,
    });
    if (!cam) return;
    let zoom = Math.min((cam.zoom ?? 14) - 0.35, 16);
    // Paired maps share one zoom level: the smallest either map needs, and the other map follows (keeping its center).
    const sync = live.current.sync;
    if (sync) {
      if (cam.center) sync.wanted.set(map, { zoom, center: cam.center });
    }
    if (sync?.enabled) {
      zoom = Math.min(...[...sync.wanted.values()].map((w) => w.zoom));
      for (const other of sync.maps) {
        if (other === map || Math.abs(other.getZoom() - zoom) < 0.01) continue;
        const own = sync.wanted.get(other); // finish on its own tract, even if its flight is still running
        const to = {
          zoom,
          ...(own ? { center: own.center, pitch: 60, bearing: -20 } : {}),
        };
        if (live.current.lite) other.jumpTo(to);
        else
          other.easeTo({
            ...to,
            duration: 1200,
            easing: easeInOutCubic,
            essential: true,
          });
      }
    }
    const target = { center: cam.center, zoom, pitch: 60, bearing: -20 };
    if (live.current.lite) map.jumpTo(target);
    else
      map.easeTo({
        ...target,
        duration: 1200,
        easing: easeInOutCubic,
        essential: true,
      });
  }

  function applyOverlayValues(map: MLMap, rec: OverlayRec) {
    const paint = rec.cfg.fill?.paint;
    if (!paint || paint.kind === "relief") return;
    const source = overlaySource(rec.cfg.id);
    const key = paint.kind === "seq" ? "v" : "k";
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
    if (rec.selected)
      map.setFeatureState({ source, id: rec.selected }, { selected: false });
    if (id) map.setFeatureState({ source, id }, { selected: true });
    rec.selected = id;
    if (id && cfg.zoomTo && st.introDone) {
      const b = featureBounds(cfg.data, cfg.idField, id);
      if (b) flyToBounds(map, b);
    }
  }

  function clearOverlayHover(map: MLMap, rec: OverlayRec) {
    if (rec.hovered) {
      map.setFeatureState(
        { source: overlaySource(rec.cfg.id), id: rec.hovered },
        { hover: false },
      );
      rec.hovered = null;
      live.current.onHover?.(null, rec.cfg.id);
    }
    if (st.hoverOverlay === rec.cfg.id) {
      st.hoverOverlay = null;
      map.getCanvas().style.cursor = "";
      setHover((h) => (h && h.overlay === rec.cfg.id ? null : h));
    }
  }

  function addOverlay(map: MLMap, cfg: OverlayLayer) {
    const source = overlaySource(cfg.id);
    const anchor = st.overlayAnchor;
    const lineAnchor = st.lineAnchor;
    map.addSource(source, {
      type: "geojson",
      data: cfg.data as never,
      promoteId: cfg.idField,
    });
    map.addLayer(
      {
        id: `${cfg.id}-fill`,
        type: "fill",
        source,
        layout: { visibility: fillVisible(cfg) ? "visible" : "none" },
        paint: {
          "fill-color": fillColor(cfg) as never,
          "fill-opacity": fillOpacityOf(cfg) as never,
          "fill-opacity-transition": { duration: 300, delay: 0 },
        },
      },
      anchor,
    );
    if (cfg.line.casing) {
      map.addLayer(
        {
          id: `${cfg.id}-casing`,
          type: "line",
          source,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": cfg.line.casing.color,
            "line-width": cfg.line.casing.width as never,
            "line-opacity": cfg.line.casing.opacity ?? 0.85,
          },
        },
        lineAnchor,
      );
    }
    map.addLayer(
      {
        id: `${cfg.id}-line`,
        type: "line",
        source,
        layout: { "line-join": "round" },
        paint: linePaint(cfg.line) as never,
      },
      lineAnchor,
    );
    map.addLayer(
      {
        id: `${cfg.id}-hover`,
        type: "line",
        source,
        paint: {
          "line-color": "#334155",
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            2,
            0,
          ],
        },
      },
      lineAnchor,
    );
    map.addLayer(
      {
        id: `${cfg.id}-sel-glow`,
        type: "line",
        source,
        paint: {
          "line-color": VIOLET,
          "line-blur": 6,
          "line-opacity": 0.45,
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            12,
            0,
          ],
        },
      },
      lineAnchor,
    );
    map.addLayer(
      {
        id: `${cfg.id}-sel`,
        type: "line",
        source,
        paint: {
          "line-color": VIOLET,
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            3.2,
            0,
          ],
        },
      },
      lineAnchor,
    );
    if (cfg.line.label && st.labelFont) {
      const lb = cfg.line.label;
      map.addLayer(
        {
          id: `${cfg.id}-label`,
          type: "symbol",
          source,
          minzoom: lb.minzoom ?? 11,
          layout: {
            "symbol-placement": "point",
            "text-field": ["get", lb.field],
            "text-font": st.labelFont,
            "text-size": lb.size ?? 12,
            "text-letter-spacing": 0.03,
            "text-padding": 6,
            "text-max-width": 8,
          },
          paint: {
            "text-color": lb.color ?? "#0f172a",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.6,
            "text-opacity": cfg.line.opacity ?? 1,
          },
        },
        lineAnchor,
      );
    }
    const rec: OverlayRec = {
      cfg,
      values: new Map(),
      key: "k",
      selected: null,
      hovered: null,
      handlers: {
        move: (e) => {
          const r = st.overlays.get(cfg.id);
          if (!r?.cfg.interactive) return;
          const f = e.features?.[0] as MapGeoJSONFeature | undefined;
          const fid = f ? String(f.id ?? f.properties?.[r.cfg.idField]) : null;
          if (fid !== r.hovered) {
            if (r.hovered)
              map.setFeatureState({ source, id: r.hovered }, { hover: false });
            if (fid) map.setFeatureState({ source, id: fid }, { hover: true });
            r.hovered = fid;
            st.hoverOverlay = fid ? cfg.id : null;
            live.current.onHover?.(fid, cfg.id);
          }
          map.getCanvas().style.cursor = fid ? "pointer" : "";
          setHover(
            fid
              ? { overlay: cfg.id, id: fid, x: e.point.x, y: e.point.y }
              : null,
          );
        },
        leave: () => {
          const r = st.overlays.get(cfg.id);
          if (r) clearOverlayHover(map, r);
        },
        click: (e) => {
          const r = st.overlays.get(cfg.id);
          if (!r?.cfg.interactive) return;
          const f = e.features?.[0];
          if (f && st.introDone)
            r.cfg.onSelect?.(String(f.id ?? f.properties?.[r.cfg.idField]));
        },
      },
    };
    map.on("mousemove", `${cfg.id}-fill`, rec.handlers.move);
    map.on("mouseleave", `${cfg.id}-fill`, rec.handlers.leave);
    map.on("click", `${cfg.id}-fill`, rec.handlers.click);
    st.overlays.set(cfg.id, rec);
    applyOverlayValues(map, rec);
    applyOverlaySelection(map, rec);
  }

  function removeOverlay(map: MLMap, rec: OverlayRec) {
    const { id } = rec.cfg;
    clearOverlayHover(map, rec);
    map.off("mousemove", `${id}-fill`, rec.handlers.move);
    map.off("mouseleave", `${id}-fill`, rec.handlers.leave);
    map.off("click", `${id}-fill`, rec.handlers.click);
    for (const s of OVERLAY_SUFFIXES)
      if (map.getLayer(`${id}${s}`)) map.removeLayer(`${id}${s}`);
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
    if (lineStructureChanged(cfg.line, prev.line)) {
      removeOverlay(map, rec);
      addOverlay(map, cfg);
      return;
    }
    rec.cfg = cfg;
    const fillId = `${cfg.id}-fill`;
    let dataChanged = false;
    if (cfg.data !== prev.data) {
      (
        map.getSource(overlaySource(cfg.id)) as GeoJSONSource | undefined
      )?.setData(cfg.data as never);
      rec.values.clear();
      rec.selected = null;
      if (rec.hovered) clearOverlayHover(map, rec);
      dataChanged = true;
    }
    const fillChanged =
      dataChanged ||
      cfg.fill?.paint !== prev.fill?.paint ||
      cfg.fill?.color !== prev.fill?.color ||
      !cfg.fill !== !prev.fill;
    if (fillChanged)
      map.setPaintProperty(fillId, "fill-color", fillColor(cfg) as never);
    if (fillChanged || cfg.fill?.opacity !== prev.fill?.opacity)
      map.setPaintProperty(fillId, "fill-opacity", fillOpacityOf(cfg) as never);
    if (fillVisible(cfg) !== fillVisible(prev))
      map.setLayoutProperty(
        fillId,
        "visibility",
        fillVisible(cfg) ? "visible" : "none",
      );
    if (!sameLine(cfg.line, prev.line)) {
      const lp = linePaint(cfg.line);
      for (const k of ["line-color", "line-width", "line-opacity"])
        map.setPaintProperty(`${cfg.id}-line`, k, lp[k] as never);
      map.setPaintProperty(
        `${cfg.id}-line`,
        "line-dasharray",
        (cfg.line.dash ?? null) as never,
      );
      if (cfg.line.casing && map.getLayer(`${cfg.id}-casing`)) {
        map.setPaintProperty(
          `${cfg.id}-casing`,
          "line-color",
          cfg.line.casing.color as never,
        );
        map.setPaintProperty(
          `${cfg.id}-casing`,
          "line-width",
          cfg.line.casing.width as never,
        );
        map.setPaintProperty(
          `${cfg.id}-casing`,
          "line-opacity",
          (cfg.line.casing.opacity ?? 0.85) as never,
        );
      }
      if (map.getLayer(`${cfg.id}-label`)) {
        map.setPaintProperty(
          `${cfg.id}-label`,
          "text-opacity",
          (cfg.line.opacity ?? 1) as never,
        );
        map.setPaintProperty(
          `${cfg.id}-label`,
          "text-color",
          (cfg.line.label?.color ?? "#0f172a") as never,
        );
      }
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
    for (const rec of [...st.overlays.values()])
      if (!ids.has(rec.cfg.id)) removeOverlay(map, rec);
    for (const cfg of next) {
      const rec = st.overlays.get(cfg.id);
      if (rec) updateOverlay(map, rec, cfg);
      else addOverlay(map, cfg);
    }
    const order = next.map((o) => o.id).join("|");
    if (order !== st.overlayOrder) {
      for (const cfg of next)
        for (const s of OVERLAY_SUFFIXES)
          if (map.getLayer(`${cfg.id}${s}`))
            map.moveLayer(
              `${cfg.id}${s}`,
              s === "-fill" ? st.overlayAnchor : st.lineAnchor,
            );
      st.overlayOrder = order;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.overlays, ready]);

  // built-in tract layers on/off
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const vis = props.baseTracts === false ? "none" : "visible";
    for (const l of TRACT_LAYERS)
      if (map.getLayer(l)) map.setLayoutProperty(l, "visibility", vis);
    if (props.baseTracts === false && st.hovered) {
      map.setFeatureState(
        { source: "tracts", id: st.hovered },
        { hover: false },
      );
      st.hovered = null;
      setHover((h) => (h && h.overlay === null ? null : h));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.baseTracts, ready]);

  // 3D buildings on/off
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const vis = props.buildings === false ? "none" : "visible";
    for (const l of ["osm-3d", "focus-3d"])
      if (map.getLayer(l)) map.setLayoutProperty(l, "visibility", vis);
  }, [props.buildings, ready]);

  // ------------------------------------------------------------ recolor (tweened through feature-state)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const { paint } = props;
    const relief = paint.kind === "relief";
    if (map.getLayer("relief"))
      map.setLayoutProperty(
        "relief",
        "visibility",
        relief ? "visible" : "none",
      );
    if (relief) {
      map.setPaintProperty("tract-fill", "fill-color", "rgba(0,0,0,0)");
      st.kind = "relief";
      return;
    }
    if (paint.kind !== st.kind || paint.kind === "cat" || paint.bins) {
      map.setPaintProperty(
        "tract-fill",
        "fill-color",
        withNonResidential(
          paint.kind === "seq"
            ? seqExpression(paint.palette, paint.bins ?? SCORE_BINS)
            : catExpression(paint.palette),
        ),
      );
    }
    const kindChanged = paint.kind !== st.kind;
    st.kind = paint.kind;
    cancelAnimationFrame(st.tween);
    const key = paint.kind === "seq" ? "v" : "k";
    const from = new Map(st.values);
    const to = new Map<string, number>();
    for (const [id, v] of paint.values) to.set(id, v == null ? -1 : v);
    const apply = (t: number) => {
      for (const [id, target] of to) {
        const a = from.get(id);
        let v = target;
        if (
          paint.kind === "seq" &&
          a != null &&
          a >= 0 &&
          target >= 0 &&
          !kindChanged
        )
          v = a + (target - a) * t;
        if (st.values.get(id) !== v) {
          map.setFeatureState({ source: "tracts", id }, { [key]: v });
          st.values.set(id, v);
        }
      }
    };
    if (props.lite || paint.kind === "cat" || kindChanged) {
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
    for (const id of st.flips)
      if (!next.has(id))
        map.setFeatureState({ source: "tracts", id }, { flip: false });
    for (const id of next)
      if (!st.flips.has(id))
        map.setFeatureState({ source: "tracts", id }, { flip: true });
    st.flips = new Set(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.flips, ready]);

  // ------------------------------------------------------------ intro: globe spin, then fly to Pittsburgh
  function runIntro(map: MLMap) {
    live.current.onIntroPhase?.("spin");
    // The intro never holds the map hostage: the first drag, scroll, pinch or tap ends it at once, lands on
    // Pittsburgh and hands the map over (the same as "Skip intro").
    const el = map.getCanvasContainer();
    const takeOver = () => {
      el.removeEventListener("pointerdown", takeOver);
      el.removeEventListener("wheel", takeOver);
      el.removeEventListener("touchstart", takeOver);
      if (st.introDone) return;
      finishIntro(map);
      map.stop();
      map.jumpTo(PGH_VIEW);
    };
    el.addEventListener("pointerdown", takeOver, { passive: true });
    el.addEventListener("wheel", takeOver, { passive: true });
    el.addEventListener("touchstart", takeOver, { passive: true });
    map.easeTo({ center: [-96, 38], duration: 2200, easing: (t) => t });
    map.once("moveend", () => {
      if (st.introDone) return;
      live.current.onIntroPhase?.("fly");
      map.flyTo({ ...PGH_VIEW, duration: 5000, curve: 1.5, essential: true });
      map.once("moveend", () => finishIntro(map));
    });
  }
  function finishIntro(map: MLMap) {
    if (st.introDone) return;
    st.introDone = true;
    if (map.getLayer("tract-fill"))
      map.setPaintProperty("tract-fill", "fill-opacity", fillOpacity);
    live.current.onIntroPhase?.("done");
  }
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !props.skipSignal || st.introDone) return;
    finishIntro(map);
    map.stop();
    map.jumpTo(PGH_VIEW);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.skipSignal, ready]);

  // ------------------------------------------------------------ selection spotlight: the rest of the map dims a little
  // The selected place (an interactive overlay's selection, else the selected city tract) keeps its colors; a light
  // shade with a hole cut for it covers everything else, under the labels.
  const selGeom = useMemo(() => {
    for (const o of props.overlays ?? []) {
      if (!o.interactive || !o.selectedId) continue;
      const f = (o.data.features as { properties?: Record<string, unknown>; geometry?: unknown }[]).find((x) => String(x.properties?.[o.idField]) === o.selectedId);
      if (f?.geometry) return { key: `${o.id}:${o.selectedId}`, geometry: f.geometry as { type: string; coordinates: unknown } };
    }
    if (props.selectedId && props.baseTracts !== false) {
      const f = tractsFC.features.find((x) => x.properties.GEOID === props.selectedId);
      if (f?.geometry) return { key: `tract:${props.selectedId}`, geometry: f.geometry as { type: string; coordinates: unknown } };
    }
    return null;
  }, [props.overlays, props.selectedId, props.baseTracts]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!map.getSource("sel-dim")) {
      map.addSource("sel-dim", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer(
        { id: "sel-dim", type: "fill", source: "sel-dim", paint: { "fill-color": "#0f172a", "fill-opacity": 0, "fill-opacity-transition": { duration: props.lite ? 0 : 450, delay: 0 } } },
        st.firstSymbol,
      );
    }
    // A white glow and a violet line around the hole, so even a dark-colored place reads clearly against the shade.
    if (!map.getLayer("sel-halo")) {
      map.addLayer(
        { id: "sel-halo", type: "line", source: "sel-dim", paint: { "line-color": "#ffffff", "line-width": 6, "line-blur": 1.5, "line-opacity": 0, "line-opacity-transition": { duration: props.lite ? 0 : 450, delay: 0 } } },
        st.firstSymbol,
      );
      map.addLayer(
        { id: "sel-edge", type: "line", source: "sel-dim", paint: { "line-color": VIOLET, "line-width": 2.5, "line-opacity": 0, "line-opacity-transition": { duration: props.lite ? 0 : 450, delay: 0 } } },
        st.firstSymbol,
      );
    }
    // Keep the shade and its border above every fill and line added since, and under the labels.
    for (const id of ["sel-dim", "sel-halo", "sel-edge"]) {
      if (st.firstSymbol && map.getLayer(st.firstSymbol)) map.moveLayer(id, st.firstSymbol);
      else map.moveLayer(id);
    }
    const src = map.getSource("sel-dim") as maplibregl.GeoJSONSource;
    if (!selGeom) {
      map.setPaintProperty("sel-dim", "fill-opacity", 0);
      map.setPaintProperty("sel-halo", "line-opacity", 0);
      map.setPaintProperty("sel-edge", "line-opacity", 0);
      return;
    }
    src.setData({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: spotlightRings(selGeom.geometry) } } as never);
    map.setPaintProperty("sel-dim", "fill-opacity", props.spotlightDim ?? SPOTLIGHT_DIM);
    map.setPaintProperty("sel-halo", "line-opacity", 0.95);
    map.setPaintProperty("sel-edge", "line-opacity", 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selGeom?.key, ready, props.overlays]);

  // ------------------------------------------------------------ selection: outline, camera, buildings grow
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const id = props.selectedId;
    if (st.selected && st.selected !== id)
      map.setFeatureState(
        { source: "tracts", id: st.selected },
        { selected: false },
      );
    if (id) map.setFeatureState({ source: "tracts", id }, { selected: true });
    const changed = st.selected !== id;
    st.selected = id;
    if (!id || !changed || !st.introDone) return;
    const b = tractBounds.get(id);
    if (b) flyToBounds(map, b);
    // The grow re-sets a data-driven paint property every frame, which makes MapLibre re-tile the building source each
    // time; paired maps (Compare) skip it, since two of them at once made switching places lag.
    if (map.getLayer("focus-3d") && !live.current.sync) {
      cancelAnimationFrame(st.bldRaf);
      const setH = (m: number) =>
        map.setPaintProperty("focus-3d", "fill-extrusion-height", [
          "*",
          ["get", "h"],
          ["case", ["==", ["get", "GEOID"], id], m, 1],
        ]);
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
    if (!map || !ready || !map.getLayer("focus-3d")) return;
    const id = props.selectedId ?? "";
    const c = props.buildingColor ?? "#a8a29e";
    const src = ["coalesce", ["get", "src"], "default"];
    map.setPaintProperty("focus-3d", "fill-extrusion-color", [
      "case",
      ["==", ["get", "GEOID"], id],
      ["match", src, "default", tint(c, 0.62), "accessory", tint(c, 0.35), c],
      ["match", src, "default", "#ebe9e6", "#d6d3d1"],
    ] as never);
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
      const label = document.createElement("div");
      label.className = "vp-pin-label";
      m.getElement().appendChild(label);
      markerRef.current = m;
    }
    m.setLngLat([pin.lng, pin.lat]).addTo(map);
    const label = m.getElement().querySelector(".vp-pin-label");
    if (label) label.textContent = pin.label;
    if (performance.now() - st.camAt > 100) {
      const target = {
        center: [pin.lng, pin.lat] as [number, number],
        zoom: Math.max(map.getZoom(), 14.5),
      };
      if (props.lite) map.jumpTo(target);
      else map.flyTo({ ...target, duration: 1400, essential: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.pin, ready]);

  // terrain exaggeration eases in when a tract is selected (or always, for the hero and the Terrain layer)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const want =
      props.terrain &&
      !props.lite &&
      (!!props.selectedId || !!props.terrainAlways)
        ? 1.2
        : 0;
    const contoursOn = props.terrain && !props.lite;
    for (const l of ["contour-minor", "contour-major", "contour-label"])
      if (map.getLayer(l))
        map.setLayoutProperty(l, "visibility", contoursOn ? "visible" : "none");
    cancelAnimationFrame(st.terrainRaf);
    const from = st.terrainE;
    const setE = (e: number) => {
      st.terrainE = e;
      try {
        if (e <= 0.001) map.setTerrain(null);
        else map.setTerrain({ source: "dem-terrain", exaggeration: e });
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

  // hill shading on / off
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (map.getLayer("hillshade"))
      map.setLayoutProperty(
        "hillshade",
        "visibility",
        props.hillshade ? "visible" : "none",
      );
  }, [props.hillshade, ready]);

  // Two things lay the map flat, and both give the tilt back: holding the Command key with the pointer over the
  // map, and zooming out until the view takes in five miles around the city limits (lib/farView). The second is
  // checked when a move ends, so it never cuts into a zoom in progress.
  useEffect(() => {
    const map = mapRef.current;
    const node = el.current;
    if (!map || !node || !ready || props.interactive === false) return;
    let over = false;
    let held = false;
    let far = false;
    /** The tilt to come back to while the map is laid flat; null while it is not. */
    let tilt: number | null = null;
    /** A pitch the map is on its way to. Tilting by hand cancels it. */
    let want: number | null = null;
    const ms = props.lite ? 0 : 450;
    const ease = (pitch: number) => {
      want = pitch;
      map.easeTo({ pitch, duration: ms, essential: true });
    };
    const sync = () => {
      if (!st.introDone) return;
      const pitch = map.getPitch();
      if (held || far) {
        if (tilt == null) tilt = pitch;
        if (pitch > 0.5) ease(0);
        else want = null;
      } else if (tilt != null) {
        const back = tilt;
        tilt = null;
        // Something else (a flight to a place) may already have tilted the map: then there is nothing to give back.
        if (pitch < 0.5 && back > 0.5) ease(back);
        else want = null;
      } else if (want != null && Math.abs(pitch - want) > 0.5) ease(want);
      else want = null;
      setFlat(held);
    };
    // A move that ends because another one started fires 'moveend' from inside that new move; starting a camera
    // change right there breaks the map library. So look on the next frame, and only once the map is still.
    let raf = 0;
    const settle = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(settleNow);
    };
    const settleNow = () => {
      if (map.isMoving() || map.isEasing()) return;
      const box = map.getContainer().getBoundingClientRect();
      const threshold = farZoom(box.width, box.height);
      if (threshold != null) far = isFar(map.getZoom(), threshold, far);
      sync();
    };
    const byHand = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) want = null;
    };
    const down = (e: KeyboardEvent) => {
      if (e.key !== "Meta" || !over || e.repeat || held) return;
      held = true;
      sync();
    };
    const release = () => {
      if (!held) return;
      held = false;
      sync();
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Meta") release();
    };
    const enter = () => (over = true);
    const leave = () => (over = false);
    node.addEventListener("mouseenter", enter);
    node.addEventListener("mousemove", enter);
    node.addEventListener("mouseleave", leave);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", release);
    map.on("moveend", settle);
    map.on("pitchstart", byHand);
    settle();
    return () => {
      cancelAnimationFrame(raf);
      map.off("moveend", settle);
      map.off("pitchstart", byHand);
      node.removeEventListener("mouseenter", enter);
      node.removeEventListener("mousemove", enter);
      node.removeEventListener("mouseleave", leave);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", release);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.interactive, props.lite, ready]);

  // camera moves asked for by the quick tour
  const cueDone = useRef(0);
  useEffect(() => {
    const map = mapRef.current;
    const cue = props.cue;
    if (
      !map ||
      !ready ||
      !cue ||
      cue.nonce === cueDone.current ||
      !st.introDone
    )
      return;
    cueDone.current = cue.nonce;
    // Stop whatever is moving, then start the tour's move on the next frame (never from inside another move).
    map.stop();
    const lite = !!props.lite;
    const raf = requestAnimationFrame(() => {
      if (cue.kind === "orbit") {
        const bearing = map.getBearing() + (cue.turn ?? 90);
        if (lite) map.jumpTo({ bearing });
        else map.easeTo({ bearing, duration: cue.duration, easing: (t) => t, essential: true });
        return;
      }
      if (!cue.view) return;
      if (lite) map.jumpTo(cue.view);
      else map.easeTo({ ...cue.view, duration: cue.duration, easing: easeInOutCubic, essential: true });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.cue, ready]);

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
    const evs = [
      "pointerdown",
      "pointermove",
      "wheel",
      "keydown",
      "touchstart",
    ] as const;
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
    let raf = 0,
      last = 0;
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

  const tooltipFor = hover
    ? hover.overlay
      ? props.overlays?.find((o) => o.id === hover.overlay)?.tooltip
      : props.tooltip
    : undefined;

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${props.className ?? ""}`}
    >
      <div ref={el} style={{ position: "absolute", inset: 0 }} />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-[#eef0f2]">
          <div className="flex items-center gap-2 text-small text-slate-600">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeOpacity=".2"
                strokeWidth="3"
              />
              <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            Loading map…
          </div>
        </div>
      )}
      {hover && tooltipFor && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-lg bg-slate-900/92 px-3 py-2 text-small text-white shadow-lg backdrop-blur"
          style={{ left: hover.x, top: hover.y }}
        >
          {tooltipFor(hover.id)}
        </div>
      )}
      {flat && (
        <div className="pointer-events-none absolute left-1/2 top-28 z-20 -translate-x-1/2 rounded-full bg-slate-900/90 px-3 py-1 text-small font-medium text-white shadow-md">
          Flat view · release ⌘ to tilt back
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
