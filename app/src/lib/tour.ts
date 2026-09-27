// The quick tour: fifteen short steps that dim the screen except one part of the interface and say what it does,
// while the map moves on its own to show what the tool can do. Explore first (5 steps); Analysis only if the
// visitor asks for it (10 steps: Place, Compare places, Equity & policy). Whatever the tour changes (painted variable, selected place, open panels) is put
// back when it ends, so it leaves nothing behind.
import { create } from 'zustand';
import { PGH_CENTER, PGH_VIEW } from './mapStyle';
import { useApp, type AppState } from './store';

/** Hazelwood, one of the bundled demo tracts. */
export const TOUR_TRACT = '42003562300';

export type TourTarget = 'sections' | 'rail' | 'summary' | 'ask' | 'subtabs' | 'right' | 'compare' | 'compare-places' | 'compare-focus' | 'compare-income' | 'compare-glance' | 'equity-bar' | 'equity-levers';
export type Placement = 'bottom' | 'right' | 'left';
export type Part = 'explore' | 'analysis';

export interface CameraView {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}
/** A camera move for the map of one section. `orbit` turns the bearing by `turn` degrees at a steady pace. */
export interface Cue {
  nonce: number;
  part: Part;
  kind: 'ease' | 'orbit';
  view?: Partial<CameraView>;
  turn?: number;
  duration: number;
}

export interface TourStep {
  id: string;
  part: Part;
  target: TourTarget;
  placement: Placement;
  title: string;
  text: string;
  /** Runs when the step opens. */
  enter?: () => void;
  camera?: Omit<Cue, 'nonce' | 'part'>;
  /** The last Explore step offers the fork; the last Analysis step says Finish. */
  last?: 'fork' | 'finish';
}

export const TOUR_COPY = {
  notice: 'New here? Take the quick tour',
  start: 'Start tour',
  close: 'Close',
  gotIt: 'Got it',
  end: 'End guide',
  toAnalysis: 'Continue to Analysis',
  keepExploring: 'Keep exploring',
  finish: 'Finish',
  button: 'Tour',
  buttonTitle: 'Take the quick tour',
  of: (part: Part, n: number, total: number) => `${part === 'explore' ? 'Explore' : 'Analysis'} · ${n} of ${total}`,
};

const openLeft = () => {
  const s = useApp.getState();
  if (!s.ui.left) s.setUi({ left: true });
};

export const STEPS: TourStep[] = [
  {
    id: 'tabs',
    part: 'explore',
    target: 'sections',
    placement: 'bottom',
    title: 'Two ways in',
    text: 'Explore lets you browse the data freely. Analysis helps you compare places and housing options.',
    camera: { kind: 'orbit', turn: 110, duration: 9000 },
  },
  {
    id: 'rail',
    part: 'explore',
    target: 'rail',
    placement: 'right',
    title: 'What the map shows',
    text: 'Choose Pittsburgh or the whole county, open one boundary, and color the map by any figure under Data.',
    enter: openLeft,
    camera: { kind: 'ease', view: { center: PGH_CENTER, zoom: 9.4, bearing: 0 }, duration: 2600 },
  },
  {
    id: 'summary',
    part: 'explore',
    target: 'summary',
    placement: 'left',
    title: 'A summary of any place',
    text: 'Click any place for its summary. With a figure painted, the summary shows only that figure.',
    enter: () => useApp.getState().setBrowse({ variable: 'med_gross_rent', selected: { level: 'tract', geoid: TOUR_TRACT } }),
  },
  {
    id: 'ask',
    part: 'explore',
    target: 'ask',
    placement: 'left',
    title: 'Search or ask',
    text: 'Type a place to jump there, or ask a question about it. Searching is free; answers come from the tool’s own figures.',
  },
  {
    id: 'fork',
    part: 'explore',
    target: 'sections',
    placement: 'bottom',
    title: 'That’s Explore',
    text: 'Keep browsing on your own, or take a quick look at Analysis.',
    camera: { kind: 'ease', view: PGH_VIEW, duration: 2600 },
    last: 'fork',
  },
  {
    id: 'subtabs',
    part: 'analysis',
    target: 'subtabs',
    placement: 'bottom',
    title: 'Three readings',
    text: 'Read one place, compare two places side by side, or look at equity and policy.',
    camera: { kind: 'orbit', turn: 70, duration: 8000 },
  },
  {
    id: 'plan',
    part: 'analysis',
    target: 'rail',
    placement: 'right',
    title: 'Set the question',
    text: 'Pick the issue you are focusing on and who you are planning for. The map shows where each housing type fits.',
    enter: openLeft,
    camera: { kind: 'ease', view: { center: [-79.94, 40.45], zoom: 12.2, pitch: 55, bearing: -40 }, duration: 3200 },
  },
  {
    id: 'reading',
    part: 'analysis',
    target: 'right',
    placement: 'left',
    title: 'Evidence, not a verdict',
    text: 'Click a tract for its reading and the data behind it. The tool offers evidence; the decision stays with you.',
    enter: () => useApp.getState().select(TOUR_TRACT),
  },
  {
    id: 'compare',
    part: 'analysis',
    target: 'subtabs',
    placement: 'bottom',
    title: 'Compare places',
    text: 'Pick two places and read them side by side: the same measures, the same focus, and what differs.',
    enter: () => useApp.getState().setMode('tracts'),
  },
  {
    id: 'compare-places',
    part: 'analysis',
    target: 'compare-places',
    placement: 'bottom',
    title: 'Choose two places',
    text: 'Search a neighborhood, tract or address for place A and place B. The arrows between them swap the two.',
  },
  {
    id: 'compare-focus',
    part: 'analysis',
    target: 'compare-focus',
    placement: 'bottom',
    title: 'One focus for both',
    text: 'Pick what matters most, such as keeping renters housed. Both places are judged by the same focus, so the comparison is fair.',
  },
  {
    id: 'compare-income',
    part: 'analysis',
    target: 'compare-income',
    placement: 'bottom',
    title: 'Who you plan for',
    text: 'Set the income level of the household you have in mind. It is shared with the Place tab.',
  },
  {
    id: 'compare-glance',
    part: 'analysis',
    target: 'compare-glance',
    placement: 'right',
    title: 'Side by side',
    text: 'The same measures for both places, row by row. The place with more need or better access is shaded.',
    enter: () => {
      // The rows sit below the maps: bring them into view first.
      if (typeof window === 'undefined') return;
      window.setTimeout(() => document.querySelector('[data-tour="compare-glance"]')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 350);
    },
  },
  {
    id: 'equity',
    part: 'analysis',
    target: 'subtabs',
    placement: 'bottom',
    title: 'Equity & policy',
    text: 'Map one need at a time, such as the rent gap or the distance to frequent transit, for the income level you care about.',
    enter: () => useApp.getState().setMode('scenarios'),
  },
  {
    id: 'levers',
    part: 'analysis',
    target: 'equity-levers',
    placement: 'bottom',
    title: 'Test a policy',
    text: 'Switch on a lever, such as ADUs by right, to outline every tract it would reach. Results export as a report.',
    last: 'finish',
  },
];
export const PART_STEPS = (part: Part) => STEPS.filter((s) => s.part === part);

/** The app state the tour may change, taken when it starts. */
export type Snapshot = Pick<AppState, 'mode' | 'lastAnalysis' | 'browse' | 'layers' | 'browsePanel' | 'selectedId' | 'compareId' | 'pin'> & { left: boolean };
export function takeSnapshot(s: AppState): Snapshot {
  return { mode: s.mode, lastAnalysis: s.lastAnalysis, browse: s.browse, layers: s.layers, browsePanel: s.browsePanel, selectedId: s.selectedId, compareId: s.compareId, pin: s.pin, left: s.ui.left };
}
/** The patch that puts the state back. `keepMode` leaves the visitor in the section the tour ended in. */
export function restorePatch(snap: Snapshot, keepMode: boolean): Partial<AppState> {
  const patch: Partial<AppState> = { browse: snap.browse, layers: snap.layers, browsePanel: snap.browsePanel, selectedId: snap.selectedId, compareId: snap.compareId, pin: snap.pin };
  if (!keepMode) {
    patch.mode = snap.mode;
    patch.lastAnalysis = snap.lastAnalysis;
  }
  return patch;
}

interface TourState {
  active: boolean;
  step: number;
  /** The start notice was answered (started or closed). Reset on every fresh open of the tool. */
  noticeClosed: boolean;
  cue: Cue | null;
  snapshot: Snapshot | null;
  start: () => void;
  next: () => void;
  toAnalysis: () => void;
  /** Stays in the section the tour ended in unless `keepMode` is false (then the section it started from). */
  end: (keepMode?: boolean) => void;
  closeNotice: () => void;
  /** A fresh open of the tool: the notice comes back, any tour stops. */
  reset: () => void;
}

let nonce = 0;
function open(i: number) {
  const step = STEPS[i];
  if (!step) return;
  step.enter?.();
  const cue: Cue | null = step.camera ? { ...step.camera, nonce: ++nonce, part: step.part } : null;
  useTour.setState({ step: i, ...(cue ? { cue } : {}) });
}

export const useTour = create<TourState>((set, get) => ({
  active: false,
  step: 0,
  noticeClosed: false,
  cue: null,
  snapshot: null,
  start: () => {
    const app = useApp.getState();
    const snapshot = get().active && get().snapshot ? get().snapshot : takeSnapshot(app);
    set({ active: true, noticeClosed: true, snapshot });
    // The tour starts from a clean Explore screen.
    if (app.mode !== 'explore') app.setMode('explore');
    app.set({ browse: { ...app.browse, variable: null, selected: null }, browsePanel: false });
    open(0);
  },
  next: () => {
    const { step, active } = get();
    if (!active) return;
    const s = STEPS[step];
    if (s?.last) return get().end(true);
    open(step + 1);
  },
  toAnalysis: () => {
    const snap = get().snapshot;
    // Put Explore back as it was before the tour, then move on.
    if (snap) useApp.setState({ browse: snap.browse, layers: snap.layers, browsePanel: snap.browsePanel, pin: snap.pin, selectedId: snap.selectedId });
    useApp.getState().setMode('match');
    open(STEPS.findIndex((s) => s.part === 'analysis'));
  },
  end: (keepMode = true) => {
    const snap = get().snapshot;
    const part = STEPS[get().step]?.part ?? 'explore';
    if (snap) {
      useApp.setState(restorePatch(snap, keepMode));
      if (!snap.left) useApp.getState().setUi({ left: false });
    }
    // Back to the city view in whichever map the tour ended on.
    set({ active: false, snapshot: null, cue: { nonce: ++nonce, part: keepMode ? part : 'explore', kind: 'ease', view: PGH_VIEW, duration: 1800 } });
  },
  closeNotice: () => set({ noticeClosed: true }),
  reset: () => set({ active: false, step: 0, noticeClosed: false, snapshot: null, cue: null }),
}));
