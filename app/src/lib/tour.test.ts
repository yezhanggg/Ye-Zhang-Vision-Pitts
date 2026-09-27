import { beforeEach, describe, expect, it } from 'vitest';
import { PART_STEPS, STEPS, TOUR_TRACT, restorePatch, takeSnapshot, useTour } from './tour';
import { defaultBrowse, useApp } from './store';
import { tractById } from './data';

describe('the steps', () => {
  it('are five in Explore and six in Analysis, each with a target, a title and a short text', () => {
    expect(PART_STEPS('explore')).toHaveLength(5);
    expect(PART_STEPS('analysis')).toHaveLength(6);
    for (const s of STEPS) {
      expect(s.target).toBeTruthy();
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.text.split(' ').length).toBeLessThanOrEqual(25);
    }
    expect(STEPS[4].last).toBe('fork');
    expect(STEPS[STEPS.length - 1].last).toBe('finish');
    expect(STEPS.filter((s) => s.last)).toHaveLength(2);
  });
  it('use a demo tract that is in the bundle', () => {
    expect(tractById.has(TOUR_TRACT)).toBe(true);
  });
});

describe('restorePatch', () => {
  it('puts back what the tour touched, and the section only when asked', () => {
    const snap = takeSnapshot({ ...useApp.getState(), mode: 'match', selectedId: null, browsePanel: false, browse: defaultBrowse() });
    expect(restorePatch(snap, true)).toEqual({ browse: snap.browse, layers: snap.layers, browsePanel: false, selectedId: null, compareId: snap.compareId, pin: snap.pin });
    expect(restorePatch(snap, false).mode).toBe('match');
  });
});

describe('the tour store', () => {
  beforeEach(() => {
    useTour.getState().reset();
    useApp.setState({ mode: 'explore', browse: defaultBrowse(), browsePanel: false, selectedId: null, compareId: null });
  });
  it('starts at step 1, closes the notice, and paints and selects the demo tract at step 3', () => {
    useTour.getState().start();
    expect(useTour.getState()).toMatchObject({ active: true, step: 0, noticeClosed: true });
    useTour.getState().next();
    useTour.getState().next();
    expect(useApp.getState().browse.selected?.geoid).toBe(TOUR_TRACT);
    expect(useApp.getState().browse.variable).toBe('med_gross_rent');
  });
  it('ends at the fork without Analysis, and leaves nothing behind', () => {
    useTour.getState().start();
    for (let i = 0; i < 5; i++) useTour.getState().next();
    expect(useTour.getState().active).toBe(false);
    expect(useApp.getState().browse).toEqual(defaultBrowse());
    expect(useApp.getState().mode).toBe('explore');
  });
  it('continues through Place, Compare places and Equity & policy, and Finish keeps the visitor in Analysis with the old selection back', () => {
    useTour.getState().start();
    for (let i = 0; i < 4; i++) useTour.getState().next();
    useTour.getState().toAnalysis();
    expect(useApp.getState().mode).toBe('match');
    expect(STEPS[useTour.getState().step].id).toBe('subtabs');
    expect(useApp.getState().selectedId).toBeNull();
    useTour.getState().next();
    useTour.getState().next();
    expect(useApp.getState().selectedId).toBe(TOUR_TRACT);
    useTour.getState().next();
    expect(useApp.getState().mode).toBe('tracts');
    useTour.getState().next();
    expect(useApp.getState().mode).toBe('scenarios');
    useTour.getState().next();
    expect(STEPS[useTour.getState().step].last).toBe('finish');
    useTour.getState().next();
    expect(useTour.getState().active).toBe(false);
    expect(useApp.getState().mode).toBe('scenarios');
    expect(useApp.getState().selectedId).toBeNull();
  });
  it('comes back on a fresh open', () => {
    useTour.getState().closeNotice();
    useTour.getState().reset();
    expect(useTour.getState().noticeClosed).toBe(false);
  });
});
