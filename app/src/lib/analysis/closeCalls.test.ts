import { describe, expect, it } from 'vitest';
import type { OverlayFC, OverlayLayer } from '../../components/MapView';
import type { FC, TractFeature } from '../types';
import { closeCallFC, closeCallIds, closeCallOverlay } from './closeCalls';
import { resultOf, tractOf } from './testkit';

const results = new Map([
  ['close', resultOf([['townhome', 0.7], ['adu', 0.68]])],
  ['tie', resultOf([['townhome', 0.7], ['adu', 0.699]])],
  ['clear', resultOf([['townhome', 0.7], ['adu', 0.6]])],
  ['edge', resultOf([['townhome', 0.7], ['adu', 0.66]])],
  ['alone', resultOf([['townhome', 0.7], ['adu', null]])],
  ['none', resultOf([])],
]);
const feature = (id: string): TractFeature => ({ type: 'Feature', properties: tractOf({}, { GEOID: id }), geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } });
const fc: FC<TractFeature> = { type: 'FeatureCollection', features: ['close', 'tie', 'clear', 'edge', 'alone', 'none', 'other'].map(feature) };

describe('closeCallIds', () => {
  it('lists tracts whose top two are within the close margin, ties included, one scored type excluded', () => {
    expect(closeCallIds(results, 0.03)).toEqual(['close', 'tie']);
    expect(closeCallIds(results, 0.05)).toEqual(['close', 'tie', 'edge']);
    expect(closeCallIds(results, 0.005)).toEqual(['tie']);
  });
});

describe('closeCallFC and closeCallOverlay', () => {
  it('keeps only those features, in collection order, as an overlay MapView accepts', () => {
    const out = closeCallFC(results, fc, 0.03);
    expect(out.features.map((f) => f.properties.GEOID)).toEqual(['close', 'tie']);
    const asOverlayData: OverlayFC = out;
    expect(asOverlayData.type).toBe('FeatureCollection');
    const layer: OverlayLayer = closeCallOverlay(results, fc, 0.03);
    expect(layer.id).toBe('close-calls');
    expect(layer.line.dash).toEqual([2, 2]);
    expect(layer.interactive).toBe(false);
    expect(layer.data.features.length).toBe(2);
  });
});
