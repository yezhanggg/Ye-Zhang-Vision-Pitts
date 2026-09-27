// The "why" sentence. Starts as the deterministic rationale (lib/analysis.whySentence, the sentence of record) and
// swaps in an AI-written version (DeepSeek or Claude, whichever the deployment is configured with) from /api/explain
// when that service answers and its number check passes. Never blocks the interface.
//
// Not called from the Analysis tab since update 3 (Sun 2026-09-27): the place page reads as evidence blocks and a
// rules-based recommendation, and an AI paragraph that restates the same numbers in a second voice added nothing a
// reader could check that the template did not already say. The hook is kept (it compiles and its endpoint still
// works) for the Explore question box and for a future opt-in; nothing here is rendered by MatchView.
import { useEffect, useState } from 'react';
import { scoring, typologyById, factorById, tractLabel } from './data';
import type { TractResult } from './derived';
import { rationale, whySentence, type Rationale } from './analysis/rationale';
import type { Stability } from './scoring';
import type { TractProps, Weights } from './types';

export interface Explanation {
  text: string;
  source: 'template' | 'ai';
  /** Service that wrote the text ("DeepSeek", "Claude") and its model id. */
  provider?: string;
  model?: string;
}

const memo = new Map<string, Explanation>();
let serviceDown = false;

export function useExplanation(t: TractProps, r: TractResult, weights: Weights, stability: Stability | null, presetLabel: string | null, ra?: Rationale): Explanation {
  const template = whySentence(t, ra ?? rationale(t, r, weights));
  const key = JSON.stringify([t.GEOID, weights, r.topScore]);
  const [state, setState] = useState<Explanation>(() => memo.get(key) ?? { text: template, source: 'template' });
  useEffect(() => {
    const cached = memo.get(key);
    if (cached) return setState(cached);
    setState({ text: template, source: 'template' });
    if (!r.top || !t.residential || serviceDown || typeof fetch !== 'function' || location.protocol === 'file:') return;
    const ctl = new AbortController();
    const top = r.scores.find((s) => s.typology === r.top)!;
    const body = {
      tract: { geoid: t.GEOID, name: t.name, neighborhood: t.neighborhood, watch_list: t.watch_list, residential: t.residential, label: tractLabel(t) },
      presetLabel: presetLabel ?? 'custom',
      weights,
      factors: scoring.factors.map((f) => ({ id: f.id, label: f.label, percentile: t[f.id] as number | null, confidence: t[`${f.id}_conf`] as string | null })),
      ranking: r.ranking.map((k) => ({ typology: k, label: typologyById.get(k)!.label, score: r.scores.find((s) => s.typology === k)!.score as number })),
      parts: top.parts.map((x) => ({ factor: x.factor, label: factorById.get(x.factor)!.label, percentile: x.x, lift_pts: x.lift * 100, wants: x.d >= 0 ? 'high' : 'low' })),
      stability: stability ? { share: stability.share, draws: stability.draws } : null,
    };
    const timer = setTimeout(() => {
      fetch('/api/explain', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((j: { ok: boolean; reason?: string; text?: string; model?: string; provider?: string } | null) => {
          if (!j) return;
          if (j.ok && j.text) {
            const e: Explanation = { text: j.text, source: 'ai', model: j.model, provider: j.provider };
            memo.set(key, e);
            setState(e);
          } else if (j.reason === 'no_api_key' || /_(401|402|403)$/.test(j.reason ?? '')) serviceDown = true; // no key, bad key or no balance: stop asking this session
        })
        .catch(() => undefined);
    }, 400);
    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}
