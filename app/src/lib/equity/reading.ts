// "In plain words": a short reading of the Equity & policy tab written by VisionPitts-Chat (DeepSeek) from the same
// facts the chat gets. It is shown only when the service answers and every number in it was matched to those facts;
// otherwise nothing is shown and the deterministic sentences stand alone. Cached per facts text for the session.
import { useEffect, useState } from 'react';

export type ReadingState = { status: 'idle' | 'loading' | 'off' } | { status: 'ok'; text: string };

const cache = new Map<string, string>();
let serviceOff = false;

export const READING_QUESTION =
  'Write a plain-language reading of this tab for a Pittsburgh planner in 4 to 6 sentences, as one paragraph with no bullet points or headings: what the map shows for this measure, where need concentrates, and, for each policy that is switched on, what it changes for the places with the most need. If no policy is on, say what the reader could try. Use only numbers that appear in the facts.';

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

export function useEquityReading(facts: string | null, enabled: boolean): ReadingState {
  const [state, setState] = useState<ReadingState>({ status: 'idle' });
  useEffect(() => {
    if (!facts || !enabled) return setState({ status: 'idle' });
    const hit = cache.get(facts);
    if (hit) return setState({ status: 'ok', text: hit });
    if (serviceOff || typeof fetch !== 'function' || location.protocol === 'file:') return setState({ status: 'off' });
    setState({ status: 'loading' });
    const ctl = new AbortController();
    const timer = window.setTimeout(() => {
      fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: READING_QUESTION, facts, history: [] }), signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { ok?: boolean; text?: string; checked?: boolean; reason?: string } | null) => {
          const text = j?.ok && j.text && j.checked !== false ? proseOnly(j.text) : '';
          if (text) {
            cache.set(facts, text);
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
  }, [facts, enabled]);
  return state;
}
