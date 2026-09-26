// Vercel serverless function: a Claude-written explanation of numbers that were computed in code.
//
// Rules (see README "AI tools used"):
//  1. The model receives only computed values (percentiles, scores, stability) and plain labels. It never sees raw data
//     and never computes a score.
//  2. Every number in the model's text must appear in the values it was given (in any of a few display formats).
//     If any number cannot be traced, the endpoint returns ok:false and the app shows its template sentence instead.
//  3. The API key lives in the Vercel environment (ANTHROPIC_API_KEY); the browser never sees it.

interface Payload {
  tract: { geoid: string; name: string; neighborhood: string | null; watch_list: boolean; residential: boolean };
  presetLabel: string;
  weights: Record<string, number>;
  factors: { id: string; label: string; percentile: number | null; confidence: string | null }[];
  ranking: { typology: string; label: string; score: number }[];
  parts: { factor: string; label: string; percentile: number; lift_pts: number; wants: 'high' | 'low' }[];
  stability: { share: number; draws: number } | null;
}

const MODEL = process.env.EXPLAIN_MODEL || 'claude-sonnet-5';
const cache = new Map<string, { text: string; model: string }>();

export default async function handler(req: { method?: string; body?: unknown }, res: { status: (n: number) => { json: (b: unknown) => void } }) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, reason: 'POST only' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(200).json({ ok: false, reason: 'no_api_key' });
  let payload: Payload;
  try {
    payload = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as Payload;
  } catch {
    return res.status(400).json({ ok: false, reason: 'bad_json' });
  }
  const cacheKey = JSON.stringify([payload.tract.geoid, payload.weights, payload.ranking.map((r) => r.score.toFixed(3))]);
  const hit = cache.get(cacheKey);
  if (hit) return res.status(200).json({ ok: true, ...hit, cached: true });

  const prompt = buildPrompt(payload);
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 400, temperature: 0.2, system: SYSTEM, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!r.ok) return res.status(200).json({ ok: false, reason: `anthropic_${r.status}` });
  const data = (await r.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? []).map((c) => c.text ?? '').join('').trim();
  const check = verifyNumbers(text, payload);
  if (!check.ok) return res.status(200).json({ ok: false, reason: 'number_check_failed', unmatched: check.unmatched, text });
  const out = { text, model: MODEL };
  cache.set(cacheKey, out);
  return res.status(200).json({ ok: true, ...out });
}

const SYSTEM = `You write short, plain-language explanations for city planners and community development staff in Pittsburgh.
You are given numbers that were already computed by code. You must not compute, estimate or invent any number.
Use only the numbers provided, written exactly as given (percentiles as "72nd percentile", scores with two decimals,
stability as "N of 10"). Do not mention any other figure. Do not recommend building anything; describe what the ranking
says under the given weights and how stable it is. 3 to 4 sentences, no bullet points, no headings.`;

function buildPrompt(p: Payload): string {
  const lines = [
    `Tract: ${p.tract.neighborhood ?? p.tract.name} (${p.tract.name}). Weights preset: ${p.presetLabel}.`,
    `Ranking (score 0-1): ${p.ranking.map((r) => `${r.label} ${r.score.toFixed(2)}`).join('; ')}.`,
    `Top typology's factor contributions vs a middling tract (percentage points of score): ${p.parts
      .map((x) => `${x.label} at the ${ordinal(x.percentile)} (${x.wants === 'high' ? 'wants high' : 'wants low'}) ${x.lift_pts >= 0 ? '+' : ''}${x.lift_pts.toFixed(1)}`)
      .join('; ')}.`,
    p.stability ? `Stability: the top pick stays first in ${Math.round(p.stability.share * 10)} of 10 weight nudges.` : 'Stability: not computed.',
    `Confidence tags: ${p.factors.map((f) => `${f.label} ${f.confidence ?? 'no data'}`).join('; ')}.`,
    p.tract.watch_list ? 'This tract is on the watch list (high need, rising market since 2016).' : '',
    'Write the explanation now.',
  ];
  return lines.filter(Boolean).join('\n');
}

export function ordinal(p: number): string {
  const n = Math.max(1, Math.min(99, Math.round(p * 100)));
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]) + ' percentile';
}

/** Every number in `text` must be one of the numbers we handed the model, in some display form. */
export function verifyNumbers(text: string, p: Payload): { ok: boolean; unmatched: string[] } {
  const allowed = new Set<string>();
  const add = (n: number) => {
    for (const s of [String(n), n.toFixed(0), n.toFixed(1), n.toFixed(2), Math.round(n * 100).toString(), (n * 100).toFixed(1)]) allowed.add(s.replace(/^0+(?=\d)/, ''));
  };
  for (const r of p.ranking) add(r.score);
  for (const f of p.factors) if (f.percentile != null) add(f.percentile);
  for (const x of p.parts) {
    add(x.percentile);
    add(x.lift_pts);
    add(Math.abs(x.lift_pts));
  }
  if (p.stability) {
    add(p.stability.share);
    allowed.add(String(Math.round(p.stability.share * 10)));
    allowed.add('10');
  }
  for (const y of ['2016', '2021', '50']) allowed.add(y); // "2016", "≤50% AMI" are labels, not results
  const found = text.match(/-?\d+(?:\.\d+)?/g) ?? [];
  const unmatched = found.filter((n) => !allowed.has(n.replace(/^0+(?=\d)/, '')) && !allowed.has(n.replace(/^-/, '')));
  return { ok: unmatched.length === 0, unmatched };
}
