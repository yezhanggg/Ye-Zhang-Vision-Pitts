import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_ENTRIES, useLihtc } from '../lihtc/store';
import { usePlan } from '../place/planStore';
import { setSeparate, useCompare } from '../compare/store';
import { useApp } from '../store';
import { copyAToB, entriesFor, setFinancingOn, SIDE_A, SIDE_B, usePlanB, useProjectB } from './side';
import { DEFAULT_PROJECT, useProject } from './store';

beforeEach(() => {
  usePlan.getState().setPlan({ level: 50, homes: null, focus: 'anti_displacement' });
  useProject.setState(structuredClone(DEFAULT_PROJECT), true);
  useProjectB.setState(structuredClone(DEFAULT_PROJECT), true);
  useLihtc.setState(structuredClone(DEFAULT_ENTRIES), true);
  useCompare.setState({ separate: false });
});

describe('side B settings', () => {
  it('starts as a copy of A and then changes on its own', () => {
    usePlan.getState().setPlan({ level: 30, homes: 24, focus: 'market_led' });
    useProject.setState({ stories: 6 });
    copyAToB();
    expect(usePlanB.getState()).toMatchObject({ level: 30, homes: 24, focus: 'market_led' });
    expect(useProjectB.getState().stories).toBe(6);
    usePlanB.getState().setPlan({ level: 80 });
    useProjectB.setState({ stories: 3 });
    expect(usePlan.getState().level).toBe(30);
    expect(useProject.getState().stories).toBe(6);
  });

  it('keeps its own setPlan after the copy', () => {
    copyAToB();
    usePlanB.getState().setPlan({ homes: 99 });
    expect(usePlan.getState().homes).toBeNull();
    expect(usePlanB.getState().homes).toBe(99);
  });

  it('financing on B does not touch the shared tax credit setup', () => {
    setFinancingOn(SIDE_B, 'four');
    expect(useProjectB.getState().pencil.branch).toBe('four');
    expect(useLihtc.getState().setup.credit).toBe('nine');
    setFinancingOn(SIDE_A, 'four');
    expect(useLihtc.getState().setup.credit).toBe('four');
  });

  it("scores B's sheet for B's chosen credit", () => {
    const e = useLihtc.getState();
    expect(entriesFor(SIDE_B, e, { ...DEFAULT_PROJECT, pencil: { branch: 'four' } }).setup.credit).toBe('four');
    expect(entriesFor(SIDE_B, e, { ...DEFAULT_PROJECT, pencil: { branch: 'market' } })).toEqual(e);
    expect(entriesFor(SIDE_B, e, DEFAULT_PROJECT, true).setup.occupancy).toBe('senior');
    expect(entriesFor(SIDE_A, e, { ...DEFAULT_PROJECT, pencil: { branch: 'four' } })).toBe(e);
  });
});

describe('Compare settings', () => {
  it('copies A to B when split, and moves B off A when joined', () => {
    usePlan.getState().setPlan({ level: 80 });
    setSeparate(true);
    expect(useCompare.getState().separate).toBe(true);
    expect(usePlanB.getState().level).toBe(80);
    useApp.setState({ selectedId: '42003562300', compareId: '42003562300' });
    setSeparate(false);
    expect(useCompare.getState().separate).toBe(false);
    expect(useApp.getState().compareId).not.toBe('42003562300');
  });
});
