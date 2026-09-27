import { describe, expect, it } from 'vitest';
import type { Scenario } from '../types';
import { alreadySaved, findDuplicate, nextName, presetFor, sameWeightsAs, uniqueName } from './scenarios';
import { CFG, FACTORS, ones } from './testkit';

const presets = CFG.presets;
const balanced = ones();
const anti = presets[1].weights;
const saved: Scenario[] = [
  { id: 's1', name: 'Balanced', weights: balanced },
  { id: 's2', name: 'Anti-displacement', weights: anti },
  { id: 's3', name: 'My plan', weights: { ...balanced, need: 2.5 } },
];

describe('sameWeightsAs and findDuplicate', () => {
  it('compares the listed factors only, a missing weight as 0', () => {
    expect(sameWeightsAs(balanced, { ...balanced }, FACTORS)).toBe(true);
    expect(sameWeightsAs(balanced, { ...balanced, need: 1.1 }, FACTORS)).toBe(false);
    expect(sameWeightsAs({ need: 0 }, {}, ['need'])).toBe(true);
    expect(sameWeightsAs(balanced, { ...balanced, extra: 9 }, FACTORS)).toBe(true);
  });
  it('finds the saved scenario with the same weights', () => {
    expect(findDuplicate(saved, { ...anti }, FACTORS)?.id).toBe('s2');
    expect(findDuplicate(saved, { ...balanced, need: 2.5 }, FACTORS)?.id).toBe('s3');
    expect(findDuplicate(saved, { ...balanced, need: 2.4 }, FACTORS)).toBeNull();
    expect(alreadySaved(saved[1])).toBe('Already saved as Anti-displacement.');
  });
});

describe('nextName', () => {
  it('a preset keeps its label while the weights match, and any preset the weights move to', () => {
    expect(nextName('Balanced', balanced, presets, FACTORS)).toBe('Balanced');
    expect(nextName('Balanced', { ...anti }, presets, FACTORS)).toBe('Anti-displacement');
    expect(presetFor({ ...anti }, presets, FACTORS)?.id).toBe('anti_displacement');
  });
  it('becomes "(edited)" once, and returns to the label when the weights return', () => {
    const moved = { ...anti, need: 2.5 };
    expect(nextName('Anti-displacement', moved, presets, FACTORS)).toBe('Anti-displacement (edited)');
    expect(nextName('Anti-displacement (edited)', { ...moved, flood_exposure: 0.4 }, presets, FACTORS)).toBe('Anti-displacement (edited)');
    expect(nextName('Anti-displacement (edited)', { ...anti }, presets, FACTORS)).toBe('Anti-displacement');
  });
  it('leaves custom names alone and names an empty one after a matching preset', () => {
    expect(nextName('My plan', balanced, presets, FACTORS)).toBe('My plan');
    expect(nextName('My plan (edited)', { ...balanced, need: 3 }, presets, FACTORS)).toBe('My plan (edited)');
    expect(nextName('Scenario 3', { ...balanced, need: 3 }, presets, FACTORS)).toBe('Scenario 3');
    expect(nextName('', balanced, presets, FACTORS)).toBe('Balanced');
    expect(nextName('', { ...balanced, need: 3 }, presets, FACTORS)).toBe('');
  });
  it('treats a preset that predates a factor as weighing it 1, like a shared link', () => {
    const old = [{ id: 'balanced', label: 'Balanced', weights: { need: 1 } }];
    expect(nextName('Balanced', balanced, old, FACTORS)).toBe('Balanced');
  });
});

describe('uniqueName', () => {
  it('numbers a name that is already taken, skipping the scenario being renamed', () => {
    expect(uniqueName('Balanced', saved)).toBe('Balanced 2');
    expect(uniqueName('Balanced', saved, 's1')).toBe('Balanced');
    expect(uniqueName('Balanced', [...saved, { id: 's4', name: 'Balanced 2', weights: {} }])).toBe('Balanced 3');
    expect(uniqueName('New', saved)).toBe('New');
  });
});
