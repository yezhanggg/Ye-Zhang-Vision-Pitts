// Which question of the project card is open on the Place tab's right panel, one at a time. The left panel shows every
// input at once (place/flat); "Change … on the left" scrolls it to the matching section. In memory only.
import { create } from 'zustand';
import { useApp } from '../store';

export type EditPart = 'setup' | 'need' | 'build' | 'score' | 'pencil' | 'policy' | 'open';

export const useEditPart = create<{ open: EditPart | null }>(() => ({ open: 'setup' }));

export const toggleEditPart = (p: EditPart) => useEditPart.setState((s) => ({ open: s.open === p ? null : p }));

/** The Place tab's numbered group (place/levels) that holds a part's inputs. */
const PLACE_GROUP: Record<EditPart, string> = { setup: 'project', need: 'project', build: 'site', score: 'money', pencil: 'money', policy: 'policy', open: 'open' };

/** Open a part's inputs in the left panel (opening the panel too) and bring them into view, in the view on screen only
 *  (Compare places can stay mounted behind the Place tab with sections of the same names). */
export function editOn(p: EditPart) {
  useEditPart.setState({ open: p });
  if (!useApp.getState().ui.left) useApp.getState().setUi({ left: true });
  window.setTimeout(() => {
    const root = document.querySelector('[data-view][data-active="true"]') ?? document;
    (root.querySelector(`[data-edit="${PLACE_GROUP[p]}"]`) ?? root.querySelector(`[data-edit="${p}"]`))?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, 300);
}
