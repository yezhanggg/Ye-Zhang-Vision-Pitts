// The "why" sentence. Starts as a template built from the computed values and swaps in a Claude-written version
// from /api/explain when that service is configured and its number check passes. Never blocks the interface.
import { useEffect, useState } from 'react';
import { scoring, typologyById, factorById, tractLabel } from './data';
import { templateSummary, type TractResult } from './derived';
import type { Stability } from './scoring';
import type { TractProps, Weights } from './types';

export interface Explanation {
  text: string;
  source: 'template' | 'claude';
  model?: string;
}

const memo = new Map<string, Explanation>();
let serviceDown = false;

export function useExplanation(t: TractProps, r: TractResult, weights: Weights, stability: Stability | null, presetLabel: string | null): Explanation {
  const template = templateSummary(t, r);
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
        .then((j: { ok: boolean; reason?: string; text?: string; model?: string } | null) => {
          if (!j) return;
          if (j.ok && j.text) {
            const e: Explanation = { text: j.text, source: 'claude', model: j.model };
            memo.set(key, e);
            setState(e);
          } else if (j.reason === 'no_api_key') serviceDown = true;
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
