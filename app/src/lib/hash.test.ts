import { describe, expect, it } from 'vitest';
import { encodeHash, parseHash } from './hash';
import { defaultLayers, useApp, type AppState } from './store';
import { tractById, tracts } from './data';

// A ranked city tract (Hazelwood) when the bundle has it, else any bundled tract.
const TRACT = tractById.has('42003562300') ? '42003562300' : tracts[0].GEOID;
const W = 'need:2,market_strength:0.5,displacement_risk:3,subsidy_eligible:1.5,transit_access:1,flood_exposure:1';
// Node has no matchMedia, so the store's lite default is false; pin it anyway so a round trip never emits lite=1.
const base = (): AppState => ({ ...useApp.getState(), lite: false, pin: null });

describe('parseHash', () => {
  it('reads a pre-split matchmaker link (m=explore with c/w) as Analysis → Match', () => {
    const p = parseHash(`m=explore&t=${TRACT}&w=${W}&c=top`);
    expect(p.mode).toBe('match');
    expect(p.lastAnalysis).toBe('match');
    expect(p.selectedId).toBe(TRACT);
    expect(p.metric).toEqual({ kind: 'top' });
    expect(p.weights?.need).toBe(2);
    expect(p.weights?.market_strength).toBe(0.5);
    expect(p.weights?.displacement_risk).toBe(3);
  });

  it('reads Explore layers, level and variable exactly as written', () => {
    const p = parseHash('m=explore&L=tracts,city&g=bg&v=pop');
    expect(p.mode).toBe('explore');
    expect(p.lastAnalysis).toBeUndefined();
    // L lists the layers that are on; bg stays off here even though g=bg (the store turns it on via setBrowse, parseHash is pure).
    expect(p.layers).toEqual({ buildings: false, terrain: false, hillshade: false, tracts: true, bg: false, zcta: false, muni: false, county: false, city: true });
    expect(p.browse).toEqual({ level: 'bg', variable: 'pop', selected: null });
  });

  it('reads a selected unit', () => {
    const p = parseHash('m=explore&g=zcta&u=zcta:15207');
    expect(p.browse).toEqual({ level: 'zcta', variable: null, selected: { level: 'zcta', geoid: '15207' } });
    const m = parseHash('m=explore&g=muni&u=muni:4200366576');
    expect(m.browse).toEqual({ level: 'muni', variable: null, selected: { level: 'muni', geoid: '4200366576' } });
    expect(parseHash('m=explore&u=zcta:abc').browse).toBeUndefined();
    expect(parseHash('m=explore&u=state:15207').browse).toBeUndefined();
  });

  it('drops a variable id that does not look like one', () => {
    const p = parseHash('m=explore&v=DROP TABLE');
    expect(p.mode).toBe('explore');
    expect(p.browse?.variable ?? null).toBeNull();
  });

  it('ignores an unknown mode, layer or level', () => {
    expect(parseHash('m=bogus').mode).toBeUndefined();
    expect(parseHash('m=explore&L=tracts,lava').layers?.tracts).toBe(true);
    expect(parseHash('m=explore&g=planet').browse).toBeUndefined();
  });

  it('lite=1 sets lite and turns terrain off', () => {
    const p = parseHash('m=match&lite=1');
    expect(p.lite).toBe(true);
    expect(p.layers?.terrain).toBe(false);
    const q = parseHash('m=explore&L=buildings,terrain,tracts&lite=1');
    expect(q.layers).toEqual({ buildings: true, terrain: false, hillshade: false, tracts: true, bg: false, zcta: false, muni: false, county: false, city: false });
  });

  it('accepts a leading # and an empty hash', () => {
    expect(parseHash('#m=tracts').mode).toBe('tracts');
    expect(parseHash('')).toEqual({});
  });
});

describe('encodeHash', () => {
  it('round-trips an Explore state', () => {
    const state: AppState = {
      ...base(),
      mode: 'explore',
      layers: { ...defaultLayers(false), bg: true },
      browse: { level: 'zcta', variable: 'renter_share', selected: { level: 'zcta', geoid: '15207' } },
    };
    const p = parseHash(encodeHash(state));
    expect(p.mode).toBe('explore');
    expect(p.layers).toEqual(state.layers);
    expect(p.browse).toEqual(state.browse);
  });

  it('writes Explore params only for an Explore state', () => {
    const q = new URLSearchParams(encodeHash({ ...base(), mode: 'explore', selectedId: TRACT }));
    expect(q.get('m')).toBe('explore');
    expect(q.get('L')).toBe('buildings,terrain,tracts,city');
    for (const k of ['t', 'b', 'w', 's', 'sa', 'sb', 'c', 'g', 'v', 'u', 'lite']) expect(q.has(k)).toBe(false);
  });

  it('writes Analysis params only for an Analysis state', () => {
    const state: AppState = { ...base(), mode: 'match', selectedId: TRACT, browse: { level: 'bg', variable: 'pop', selected: null } };
    const q = new URLSearchParams(encodeHash(state));
    expect(q.get('m')).toBe('match');
    expect(q.get('t')).toBe(TRACT);
    for (const k of ['w', 's', 'sa', 'sb', 'c', 'L']) expect(q.has(k)).toBe(true);
    for (const k of ['g', 'v', 'u']) expect(q.has(k)).toBe(false);
    const p = parseHash(q.toString());
    expect(p.mode).toBe('match');
    expect(p.selectedId).toBe(TRACT);
    expect(p.weights).toEqual(state.weights);
    expect(p.metric).toEqual(state.metric);
    expect(p.browse).toBeUndefined();
  });
});
