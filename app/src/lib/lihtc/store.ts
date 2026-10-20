// What has been entered on the tax credit score sheet. Entries about the project (unit mix, team, financing) stay when
// another place is picked; entries about the site (a Walk Score, a school score, the kind of parcel) are kept per place.
// Saved in this browser only, never in the URL.
import { create } from 'zustand';
import { TRANSIT_KEY, isSiteLine, type Answer, type Answers, type Item, type Setup } from './score';

const KEY = 'visionpitts.lihtc.v1';

export interface Entries {
  sheet: string;
  setup: Setup;
  /** Sheet id → entries about the project. */
  project: Record<string, Answers>;
  /** "sheet id|GEOID" → entries about the site. */
  site: Record<string, Answers>;
}

export const DEFAULT_ENTRIES: Entries = { sheet: 'pa-2025-2026', setup: { kind: 'new', occupancy: 'general', credit: 'nine' }, project: {}, site: {} };

const siteKey = (sheet: string, geoid: string) => `${sheet}|${geoid}`;

/** Everything entered for one sheet at one place. */
export const answersFor = (e: Entries, sheet: string, geoid: string): Answers => ({ ...(e.project[sheet] ?? {}), ...(e.site[siteKey(sheet, geoid)] ?? {}) });

/**
 * One entry put where it belongs; null or undefined clears it. With `keepEmpty` (the line has a value from the plan)
 * an empty entry is kept as an explicit null, so a typed "none" overrides the plan; `forget` removes the entry.
 */
export function putAnswer(e: Entries, sheet: string, geoid: string, item: Item | typeof TRANSIT_KEY, value: Answer, keepEmpty = false, forget = false): Entries {
  const forSite = item === TRANSIT_KEY || isSiteLine(item);
  const id = item === TRANSIT_KEY ? TRANSIT_KEY : item.id;
  const bag = forSite ? 'site' : 'project';
  const key = forSite ? siteKey(sheet, geoid) : sheet;
  const next = { ...(e[bag][key] ?? {}) };
  if (forget) delete next[id];
  else if (value == null || value === '' || value === false) {
    if (keepEmpty) next[id] = value === false ? false : null;
    else delete next[id];
  } else next[id] = value;
  // "Not within half a mile" has to be kept: it overrides a measured yes.
  if (item === TRANSIT_KEY && value === false) next[id] = false;
  return { ...e, [bag]: { ...e[bag], [key]: next } };
}

/** The sheet's entries for one place removed (project entries for the sheet, and this place's site entries). */
export function clearSheet(e: Entries, sheet: string, geoid: string): Entries {
  const project = { ...e.project };
  const site = { ...e.site };
  delete project[sheet];
  delete site[siteKey(sheet, geoid)];
  return { ...e, project, site };
}

function load(): Entries {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<Entries>) : null;
    if (saved && typeof saved.sheet === 'string' && saved.setup && saved.project && saved.site) return { ...DEFAULT_ENTRIES, ...saved, setup: { ...DEFAULT_ENTRIES.setup, ...saved.setup } };
  } catch {
    /* unreadable or blocked storage: start empty */
  }
  return DEFAULT_ENTRIES;
}

export const useLihtc = create<Entries>(() => load());

useLihtc.subscribe((e) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(e));
  } catch {
    /* private window or full storage: the entries last for the session */
  }
});
