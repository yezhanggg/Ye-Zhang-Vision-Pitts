import { describe, expect, it } from 'vitest';
import { answersFor, GROUP_OF, inputsFor, LEVELS } from './levels';

describe('the three levels', () => {
  it('read Parcel, Tract, ZIP code in that order', () => {
    expect(LEVELS.map((l) => l.label)).toEqual(['Parcel', 'Tract', 'ZIP code']);
  });

  it('every level asks for the same project, capital, open space and policies; the Parcel level adds the lot', () => {
    expect(inputsFor('parcel', true)).toEqual(['site', 'project', 'money', 'open', 'policy']);
    for (const level of ['tract', 'zip'] as const) expect(inputsFor(level, true)).toEqual(['project', 'money', 'open', 'policy']);
  });

  it('before a site is picked, the Parcel level offers Find places', () => {
    expect(inputsFor('parcel', false)).toEqual(['project', 'finder']);
  });

  it('every question points at a group its level has, where it has inputs', () => {
    for (const a of answersFor('parcel')) expect(inputsFor('parcel', true)).toContain(GROUP_OF[a]);
    expect(inputsFor('tract', true)).toContain(GROUP_OF.need);
    expect(answersFor('tract')).toContain('need');
  });
});
