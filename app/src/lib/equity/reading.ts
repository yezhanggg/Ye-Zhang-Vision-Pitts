// VisionPitts Insight: a short reading of the Equity & policy tab written by VisionPitts-Chat (DeepSeek) from the same
// facts the chat gets. It is shown only when the service answers and every number in it was matched to those facts;
// otherwise nothing is shown and the deterministic sentences stand alone. Cached per facts text for the session.
import { useEffect, useState } from 'react';

export type ReadingState = { status: 'idle' | 'loading' | 'off' } | { status: 'ok'; text: string };

const cache = new Map<string, string>();
let serviceOff = false;

/** The question when no policy is on: the measure, the place and its surroundings, and a takeaway (no lever talk). */
export const READING_QUESTION_NO_POLICY =
  'Write a plain-language reading for a Pittsburgh planner in 4 to 6 sentences, as one paragraph with no bullet points or headings: what this measure shows across the city, which neighborhoods need it most, and how the selected place (if any) compares with the places around it, naming them; no policy is switched on, so do not describe the policy levers. End with one sentence that starts with "Takeaway:". Use only numbers that appear in the facts.';

/** True when an Insight for these facts was already written this session (shown again without asking). */
export const hasReading = (facts: string | null, question: string = READING_QUESTION): boolean => !!facts && cache.has(`${question.length}|${facts}`);

export const READING_QUESTION =
  'Write a plain-language reading for a Pittsburgh planner in 4 to 6 sentences, as one paragraph with no bullet points or headings: for each policy that is switched on, what it changes for the places with the most need on this measure, naming neighborhoods; how the selected place compares with the places around it; and end with one sentence that starts with "Takeaway:". Use only numbers that appear in the facts.';

/** Keep the prose: drop bullet lists and headings the model may append. */
export function proseOnly(text: string): string {
  const keep: string[] = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (/^([•*-]|\d+\.)\s/.test(t) || /^#+\s/.test(t)) break;
    if (t) keep.push(t);
  }
  return keep.join(' ').replace(/\*\*/g, '').trim();
}

export function useEquityReading(facts: string | null, enabled: boolean, question: string = READING_QUESTION): ReadingState {
  const [state, setState] = useState<ReadingState>({ status: 'idle' });
  useEffect(() => {
    if (!facts || !enabled) return setState({ status: 'idle' });
    const key = `${question.length}|${facts}`;
    const hit = cache.get(key);
    if (hit) return setState({ status: 'ok', text: hit });
    if (serviceOff || typeof fetch !== 'function' || location.protocol === 'file:') return setState({ status: 'off' });
    setState({ status: 'loading' });
    const ctl = new AbortController();
    const timer = window.setTimeout(() => {
      fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question, facts, history: [] }), signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { ok?: boolean; text?: string; checked?: boolean; reason?: string } | null) => {
          const text = j?.ok && j.text && j.checked !== false ? proseOnly(j.text) : '';
          if (text) {
            cache.set(key, text);
            setState({ status: 'ok', text });
          } else {
            if (j && /no_api_key|_(401|402|403)$/.test(j.reason ?? '')) serviceOff = true;
            setState({ status: 'off' });
          }
        })
        .catch((e) => {
          if ((e as Error)?.name !== 'AbortError') setState({ status: 'off' });
        });
    }, 700);
    return () => {
      window.clearTimeout(timer);
      ctl.abort();
    };
  }, [facts, enabled, question]);
  return state;
}
