// One box for two jobs. What the visitor typed is sorted here, in the browser and for free, into "find a place"
// or "ask a question", so the paid model is only called for questions. Nothing here touches the network.
import { looksLikeAddress } from '../geocode';
import type { UnitFC } from './types';

export type IntentKind = 'place' | 'address' | 'question';
export interface Intent {
  kind: IntentKind;
  /** The text to search with: what was typed, without a leading "go to", "find", "where is"… */
  query: string;
}

/** "go to Hazelwood", "where is 15207": a search said as a sentence. The rest is the place. */
const NAVIGATE = /^(?:go to|zoom to|fly to|take me to|jump to|search for|search|find|locate|show me|show|open|where is|where's|wheres)\s+(.+?)\s*\??$/i;
/** Words a question or a request for words starts with. */
const ASKS = /^(?:what|whats|what's|why|how|which|who|whom|when|is|are|was|were|does|do|did|can|could|should|would|will|compare|describe|explain|summari[sz]e|tell|list|give|rank|help|any|anything)\b/i;
const LONG = 6;

/**
 * place: a short name ("Hazelwood", "Ross township", "15207", "Tract 5623").
 * address: starts with a house number ("4800 Forbes Ave").
 * question: ends with "?", starts like a question or a request, or runs to six words or more.
 */
export function classify(text: string): Intent {
  const t = text.trim().replace(/\s+/g, ' ');
  if (!t) return { kind: 'place', query: '' };
  const nav = NAVIGATE.exec(t);
  if (nav && nav[1].split(' ').length < LONG) return { kind: looksLikeAddress(nav[1]) ? 'address' : 'place', query: nav[1] };
  if (/\?$/.test(t)) return { kind: 'question', query: t };
  if (looksLikeAddress(t)) return { kind: 'address', query: t };
  if (ASKS.test(t) || t.split(' ').length >= LONG) return { kind: 'question', query: t };
  return { kind: 'place', query: t };
}

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.]+/g, ' ').trim();
export interface UnitMatch {
  geoid: string;
  label: string;
  sub: string | null;
}
/** Shapes of the open boundary whose name, neighborhood or code matches: names that start with the text first. */
export function unitMatches(q: string, fc: UnitFC, max = 5): UnitMatch[] {
  const s = fold(q);
  if (s.length < 2) return [];
  const out: { m: UnitMatch; rank: number }[] = [];
  for (const f of fc.features) {
    const p = f.properties;
    const name = fold(p.name ?? ''), hood = fold(String(p.neighborhood ?? ''));
    const rank = hood && hood.startsWith(s) ? 0 : name.startsWith(s) ? 1 : p.GEOID === s ? 1 : name.includes(` ${s}`) || hood.includes(` ${s}`) ? 2 : name.includes(s) || hood.includes(s) ? 3 : -1;
    if (rank < 0) continue;
    out.push({ m: { geoid: p.GEOID, label: p.neighborhood ? String(p.neighborhood) : p.name, sub: p.neighborhood ? p.name : null }, rank });
  }
  return out.sort((a, b) => a.rank - b.rank || a.m.label.length - b.m.label.length || a.m.label.localeCompare(b.m.label)).slice(0, max).map((x) => x.m);
}
