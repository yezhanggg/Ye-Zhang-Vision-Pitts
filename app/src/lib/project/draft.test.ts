import { beforeEach, describe, expect, it } from 'vitest';
import { dropLotSuggestion, suggestForLot } from './draft';
import { SIDE_B, usePlanB, useProjectB } from './side';
import { DEFAULT_PROJECT, parseProject } from './store';

beforeEach(() => {
  useProjectB.setState(structuredClone(DEFAULT_PROJECT), true);
  usePlanB.getState().setPlan({ homes: null });
});

describe('a picked lot suggests units and stories', () => {
  it('fills the example units and the default stories, once per lot', () => {
    suggestForLot(SIDE_B, 'a:1', { units: 1, stories: 2 });
    expect(usePlanB.getState().homes).toBe(1);
    expect(useProjectB.getState()).toMatchObject({ stories: 2, suggested: { lot: 'a:1', units: 1, stories: 2 } });
    usePlanB.getState().setPlan({ homes: 6 });
    suggestForLot(SIDE_B, 'a:1', { units: 1, stories: 2 });
    expect(usePlanB.getState().homes).toBe(6);
  });

  it('a new lot replaces the last suggestion but never what the person typed', () => {
    suggestForLot(SIDE_B, 'a:1', { units: 1, stories: 2 });
    suggestForLot(SIDE_B, 'b:2', { units: 30, stories: 4 });
    expect(usePlanB.getState().homes).toBe(30);
    expect(useProjectB.getState().stories).toBe(4);
    usePlanB.getState().setPlan({ homes: 24 });
    useProjectB.setState({ stories: 5 });
    suggestForLot(SIDE_B, 'c:3', { units: 2, stories: 3 });
    expect(usePlanB.getState().homes).toBe(24);
    expect(useProjectB.getState()).toMatchObject({ stories: 5, suggested: { lot: 'c:3', units: null, stories: null } });
  });

  it('leaving the Parcel level puts the example back, but keeps what the person typed', () => {
    suggestForLot(SIDE_B, 'a:1', { units: 1, stories: 2 });
    dropLotSuggestion(SIDE_B);
    expect(usePlanB.getState().homes).toBeNull();
    expect(useProjectB.getState().stories).toBe(DEFAULT_PROJECT.stories);
    expect(useProjectB.getState().suggested).toBeUndefined();
    suggestForLot(SIDE_B, 'a:1', { units: 1, stories: 2 });
    usePlanB.getState().setPlan({ homes: 8 });
    dropLotSuggestion(SIDE_B);
    expect(usePlanB.getState().homes).toBe(8);
  });

  it('keeps an own mix and typed stories from the start', () => {
    useProjectB.setState({ mode: 'mine', stories: 6 });
    suggestForLot(SIDE_B, 'a:1', { units: 1, stories: 2 });
    expect(usePlanB.getState().homes).toBeNull();
    expect(useProjectB.getState().stories).toBe(6);
  });

  it('after a reload puts the suggested units back once, not after the person clears them', () => {
    useProjectB.setState({ stories: 2, suggested: { lot: 'saved:9', units: 1, stories: 2 } });
    suggestForLot(SIDE_B, 'saved:9', { units: 1, stories: 2 });
    expect(usePlanB.getState().homes).toBe(1);
    usePlanB.getState().setPlan({ homes: null });
    suggestForLot(SIDE_B, 'saved:9', { units: 1, stories: 2 });
    expect(usePlanB.getState().homes).toBeNull();
  });

  it('is saved with the project', () => {
    expect(parseProject(JSON.stringify({ suggested: { lot: 'a:1', units: 1, stories: null } })).suggested).toEqual({ lot: 'a:1', units: 1, stories: null });
    expect(parseProject(JSON.stringify({ suggested: { units: 1 } })).suggested).toBeUndefined();
  });
});
