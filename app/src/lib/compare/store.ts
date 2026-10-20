// Compare places: whether A and B share one set of settings or each has its own. Side A always uses the Place tab's settings; with "Separate" on, side B uses its own copy
// (lib/project/side), which starts as a copy of A. In memory only.
import { create } from 'zustand';
import { focusTracts } from '../data';
import { useApp } from '../store';
import { copyAToB } from '../project/side';

export interface CompareSettings {
  separate: boolean;
}

export const useCompare = create<CompareSettings>(() => ({ separate: false }));

/** Split or join the settings. Splitting copies A's to B; joining with the same place on both sides moves B to another. */
export function setSeparate(on: boolean) {
  if (on === useCompare.getState().separate) return;
  if (on) copyAToB();
  else {
    const { selectedId, compareId } = useApp.getState();
    if (selectedId && selectedId === compareId) useApp.setState({ compareId: focusTracts.find((t) => t.GEOID !== selectedId)?.GEOID ?? null });
  }
  useCompare.setState({ separate: on });
}
