// Search: instant local matches (neighborhoods + tracts), then online geocoders.
//   Photon (komoot)     search-as-you-type, CORS, biased to the city bbox
//   US Census Geocoder  on Enter for street addresses; JSONP; returns the tract GEOID directly
//   Nominatim (OSM)     last resort on Enter, at most one request per second
import { focusTracts, neighborhoodsFC, tractAt, tractById, tractLabel, tracts } from './data';
import { CITY_BBOX, inCityBox } from './geo';
import type { TractProps } from './types';

export type ResultKind = 'neighborhood' | 'tract' | 'address';
export interface GeoResult {
  kind: ResultKind;
  label: string;
  sub?: string;
  geoid?: string | null;
  center?: [number, number];
  via?: 'local' | 'photon' | 'census' | 'nominatim';
}

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.'’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const ALIASES: Record<string, string> = { mount: 'mt', saint: 'st' };
const abbrev = (s: string) => fold(s).split(' ').map((w) => ALIASES[w] ?? w).join(' ');

function matchRank(hay: string, q: string): number {
  if (!q) return -1;
  if (hay === q) return 0;
  if (hay.startsWith(q)) return 1;
  if (hay.includes(` ${q}`)) return 2;
  if (hay.includes(q)) return 3;
  return -1;
}
const rankBoth = (key: string, q: string) => {
  const a = matchRank(key, fold(q)), b = matchRank(key, abbrev(q));
  return a < 0 ? b : b < 0 ? a : Math.min(a, b);
};

interface LocalPlace { name: string; key: string; tract: string | null; center: [number, number] }
let placesCache: LocalPlace[] | null = null;
function places(): LocalPlace[] {
  placesCache ??= neighborhoodsFC.features.map((f) => ({ name: f.properties.name, key: `${fold(f.properties.name)} ${abbrev(f.properties.name)}`, tract: f.properties.tract, center: f.properties.c }));
  return placesCache;
}
let tractKeys: [TractProps, string][] | null = null;
const tractKey = (t: TractProps) => `${fold(t.neighborhood ?? '')} ${fold(t.name)} ${t.GEOID} ${t.GEOID.slice(5)} ${t.GEOID.slice(5).replace(/^0+/, '')}`;

/** Instant offline matches: neighborhoods first, then tracts. */
export function localMatches(q: string, max = { places: 5, tracts: 6 }): GeoResult[] {
  const s = fold(q);
  if (!s) return [];
  const ps = places()
    .map((p) => ({ p, r: rankBoth(p.key, q) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || a.p.name.length - b.p.name.length)
    .slice(0, max.places)
    .map(({ p }): GeoResult => ({ kind: 'neighborhood', label: p.name, sub: 'Pittsburgh neighborhood', geoid: p.tract ?? tractAt(p.center[0], p.center[1]), center: p.center, via: 'local' }));
  tractKeys ??= tracts.map((t) => [t, tractKey(t)]);
  const digits = /^\d+(\.\d+)?$/.test(s.replace(/\s/g, ''));
  const ts = tractKeys
    .map(([t, key]) => {
      let r = rankBoth(key, q);
      if (digits && (t.GEOID === s || t.GEOID.endsWith(s) || t.name.endsWith(` ${s}`))) r = 0;
      return { t, r };
    })
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || Number(!!b.t.focus) - Number(!!a.t.focus))
    .slice(0, max.tracts)
    .map(({ t }): GeoResult => ({ kind: 'tract', label: tractLabel(t), sub: `${t.name} · Pittsburgh`, geoid: t.GEOID, via: 'local' }));
  return [...ps, ...ts];
}

export const quickPicks = (): GeoResult[] => focusTracts.map((t) => ({ kind: 'tract' as const, label: tractLabel(t), sub: `${t.name} · demo tract`, geoid: t.GEOID, via: 'local' as const }));

// ------------------------------------------------------------------ Photon
const PHOTON = 'https://photon.komoot.io/api/';
const photonCache = new Map<string, GeoResult[]>();
interface PhotonFeature { geometry: { coordinates: [number, number] }; properties: Record<string, string | undefined> }

export async function photonSuggest(q: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const s = q.trim();
  if (s.length < 3) return [];
  const key = s.toLowerCase();
  const hit = photonCache.get(key);
  if (hit) return hit;
  const url = `${PHOTON}?q=${encodeURIComponent(s)}&bbox=${CITY_BBOX.join(',')}&lat=40.44&lon=-79.99&limit=5&lang=en`;
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`photon ${r.status}`);
  const j = (await r.json()) as { features?: PhotonFeature[] };
  const out: GeoResult[] = [];
  for (const f of j.features ?? []) {
    const [lng, lat] = f.geometry.coordinates;
    if (!inCityBox(lng, lat)) continue;
    const p = f.properties;
    const street = [p.housenumber, p.street].filter(Boolean).join(' ');
    const label = p.name ?? street ?? 'Unnamed place';
    const sub = [...new Set([p.name && street ? street : null, p.locality ?? p.district, p.city ?? p.county].filter(Boolean))].join(', ');
    out.push({ kind: 'address', label: label || street, sub, center: [lng, lat], via: 'photon' });
  }
  photonCache.set(key, out);
  return out;
}

// ------------------------------------------------------------------ Census (JSONP, no CORS on this endpoint)
let cbSeq = 0;
const CENSUS = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress';
export function withCityState(address: string): string {
  const a = address.trim();
  if (/\b(pa|pennsylvania)\b/i.test(a)) return a;
  return /,/.test(a) ? `${a}, PA` : `${a}, Pittsburgh, PA`;
}

export function censusLookup(address: string, timeoutMs = 5000): Promise<GeoResult | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') return resolve(null);
    const name = `vp_cb_${++cbSeq}`;
    const w = window as unknown as Record<string, unknown>;
    const script = document.createElement('script');
    let done = false;
    const finish = (v: GeoResult | null) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      w[name] = () => {
        delete w[name];
      };
      script.remove();
      resolve(v);
    };
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    w[name] = (data: unknown) => {
      try {
        const m = (data as { result?: { addressMatches?: Array<{ coordinates: { x: number; y: number }; matchedAddress?: string; geographies?: Record<string, Array<{ GEOID?: string }>> }> } })?.result?.addressMatches?.[0];
        if (!m) return finish(null);
        const geoid = m.geographies?.['Census Tracts']?.[0]?.GEOID ?? null;
        const label = (m.matchedAddress ?? address).replace(/\b([A-Z])([A-Z]+)\b/g, (_s, a: string, b: string) => a + b.toLowerCase()).replace(/, Pa, /, ', PA ');
        finish({ kind: 'address', label, geoid, center: [m.coordinates.x, m.coordinates.y], via: 'census' });
      } catch {
        finish(null);
      }
    };
    script.async = true;
    script.onerror = () => finish(null);
    script.src = `${CENSUS}?address=${encodeURIComponent(withCityState(address))}&benchmark=Public_AR_Current&vintage=Current_Current&layers=Census%20Tracts&format=json&callback=${name}`;
    document.head.appendChild(script);
  });
}

// ------------------------------------------------------------------ Nominatim
let lastNominatim = 0;
export async function nominatimSearch(q: string, signal?: AbortSignal): Promise<GeoResult | null> {
  const wait = lastNominatim + 1000 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatim = Date.now();
  const [w, s, e, n] = CITY_BBOX;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=1&countrycodes=us&viewbox=${w},${n},${e},${s}&bounded=1`;
  const r = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!r.ok) return null;
  const j = (await r.json()) as Array<{ lat: string; lon: string; display_name: string; name?: string }>;
  const hit = j[0];
  if (!hit) return null;
  const parts = hit.display_name.split(', ');
  return { kind: 'address', label: hit.name || parts[0], sub: parts.slice(1, 3).join(', '), center: [Number(hit.lon), Number(hit.lat)], via: 'nominatim' };
}

// ------------------------------------------------------------------ resolution
export const looksLikeAddress = (q: string) => /^\d+[a-z]?\s+\w/i.test(q.trim());
export type Resolved = { ok: true; result: GeoResult; geoid: string } | { ok: false; reason: 'outside' | 'notfound' };

export function resolveResult(r: GeoResult): Resolved {
  if (r.geoid && tractById.has(r.geoid)) return { ok: true, result: r, geoid: r.geoid };
  if (r.center) {
    const id = tractAt(r.center[0], r.center[1]);
    return id ? { ok: true, result: r, geoid: id } : { ok: false, reason: 'outside' };
  }
  if (r.geoid) return { ok: false, reason: 'outside' };
  return { ok: false, reason: 'notfound' };
}

/** Enter: addresses go Census → Photon → Nominatim; other text goes local → Photon → Nominatim. */
export async function searchOnEnter(q: string, signal?: AbortSignal): Promise<Resolved> {
  const text = q.trim();
  if (!text) return { ok: false, reason: 'notfound' };
  const attempts: (() => Promise<GeoResult | null | undefined>)[] = [];
  if (looksLikeAddress(text)) attempts.push(() => censusLookup(text));
  else attempts.push(async () => localMatches(text)[0]);
  attempts.push(async () => (await photonSuggest(text, signal))[0]);
  attempts.push(() => nominatimSearch(text, signal));
  let outside: Resolved | null = null;
  for (const fn of attempts) {
    if (signal?.aborted) break;
    try {
      const r = await fn();
      if (!r) continue;
      const res = resolveResult(r);
      if (res.ok) return res;
      if (res.reason === 'outside') outside = res;
    } catch {
      /* next */
    }
  }
  return outside ?? { ok: false, reason: 'notfound' };
}
