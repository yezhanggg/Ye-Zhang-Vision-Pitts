// The Second opinion (Ye, 2026-10-27): on a click, the review's findings go to Claude (Haiku, api/chat mode "review"),
// which says in under 90 words what matters most and one change to try. The rules decide; the model only reads their
// findings, under the chat's number check. Cached per facts for the visit; off over file:// and when no key is set.
// Online only: loaded on demand.
import { useCallback, useEffect, useState } from 'react';
import type { Review } from './review';

export type OpinionState = { status: 'idle' | 'loading' } | { status: 'off'; why: string } | { status: 'ok'; text: string; checked: boolean };

const cache = new Map<string, { text: string; checked: boolean }>();
let serviceOff: string | null = null;
const LIMIT = 2500;

export const OFF_WORDS = {
  file: 'The second opinion needs the online site.',
  key: 'The second opinion is not set up: the site needs an Anthropic API key.',
  down: 'The second opinion did not answer; try again later.',
};

/** The facts for a project review: what was tested, the verdict, every finding and the fixes, with their numbers. */
export function reviewFacts(what: string, inputs: [string, string][], r: Review): string {
  const lines = [
    `PROJECT\n${what}`,
    `INPUTS\n${inputs.map(([k, v]) => `${k}: ${v}`).join('\n')}`,
    `VERDICT (the tool's rules)\n${r.line}`,
    `FINDINGS\n${r.findings.map((f) => `[${f.tone}] ${f.title}: ${f.text}`).join('\n')}`,
    r.fixes.length ? `FIXES THE RULES COMPUTED\n${r.fixes.map((f) => f.label).join('\n')}` : '',
  ].filter(Boolean);
  return lines.join('\n\n').slice(0, LIMIT);
}

export const OPINION_QUESTION = 'Give your second opinion on this project review.';

/** Ask once per facts, on demand. `ask` is the button; the state follows the current facts. */
export function useSecondOpinion(facts: string | null, question = OPINION_QUESTION): { state: OpinionState; ask: () => void } {
  const [state, setState] = useState<OpinionState>({ status: 'idle' });
  const key = facts ? `${question}|${facts}` : null;
  useEffect(() => {
    const hit = key ? cache.get(key) : null;
    setState(hit ? { status: 'ok', ...hit } : { status: 'idle' });
  }, [key]);
  const ask = useCallback(() => {
    if (!facts || !key) return;
    if (location.protocol === 'file:') return setState({ status: 'off', why: OFF_WORDS.file });
    if (serviceOff) return setState({ status: 'off', why: serviceOff });
    setState({ status: 'loading' });
    fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question, facts, history: [], mode: 'review' }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { ok?: boolean; text?: string; checked?: boolean; reason?: string } | null) => {
        if (j?.ok && j.text) {
          const v = { text: j.text, checked: j.checked !== false };
          cache.set(key, v);
          setState({ status: 'ok', ...v });
          return;
        }
        if (j && /no_api_key|_(401|403)$/.test(j.reason ?? '')) serviceOff = OFF_WORDS.key;
        setState({ status: 'off', why: serviceOff ?? OFF_WORDS.down });
      })
      .catch(() => setState({ status: 'off', why: OFF_WORDS.down }));
  }, [facts, key, question]);
  return { state, ask };
}
