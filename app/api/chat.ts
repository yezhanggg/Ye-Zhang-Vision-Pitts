// Vercel serverless function: answers a question about the place on the map from facts the app already holds.
//
// Rules (see README "AI use"):
//  1. The model receives the question and a facts text the browser built from the tool's own published data: census
//     values, the tool's analysis of city tracts, area aggregates of asking rents. It never sees raw records and
//     never computes a score.
//  2. Every number in the answer must appear in the facts or in the conversation. If some cannot be traced, the model
//     gets one retry that names them; if the second answer still has some, it is returned with checked:false and the
//     app says so beside the answer.
//  3. The API key lives in the environment; the browser never sees it. Inputs are size-limited and nothing is stored.
//  4. Tokens are money. The facts go first, right after the system text, so that a second question about the same
//     place repeats the same opening and the provider can bill it as cached input. Only the last exchange is sent as
//     history, answers are capped, and a question already answered while this function is warm is served from memory.
//
// The provider code repeats api/explain.ts on purpose: every file in api/ deploys as its own function, so this one
// does not depend on a neighbor being bundled with it.
// Provider: DeepSeek when DEEPSEEK_API_KEY is set, otherwise Claude when ANTHROPIC_API_KEY is set.
// EXPLAIN_PROVIDER=deepseek|anthropic forces one; CHAT_MODEL (then EXPLAIN_MODEL) overrides the model id.

export interface Turn {
  role: 'user' | 'assistant';
  text: string;
}
export interface ChatPayload {
  question: string;
  facts: string;
  history?: Turn[];
}
interface Provider {
  id: 'deepseek' | 'anthropic';
  label: string;
  key: string;
  model: string;
}

export const LIMITS = { question: 400, facts: 16000, history: 2, turn: 1500 };
const MAX_TOKENS = 380;
export const FACTS_ACK = 'Understood. I will answer from these facts only.';
const TEMPERATURE = 0.2;

export function pickProvider(env: Record<string, string | undefined>): Provider | null {
  const want = (env.EXPLAIN_PROVIDER ?? '').trim().toLowerCase();
  const model = env.CHAT_MODEL || env.EXPLAIN_MODEL;
  const deepseek: Provider | null = env.DEEPSEEK_API_KEY ? { id: 'deepseek', label: 'DeepSeek', key: env.DEEPSEEK_API_KEY, model: model || 'deepseek-flash' } : null;
  const anthropic: Provider | null = env.ANTHROPIC_API_KEY ? { id: 'anthropic', label: 'Claude', key: env.ANTHROPIC_API_KEY, model: model || 'claude-sonnet-5' } : null;
  if (want === 'deepseek') return deepseek;
  if (want === 'anthropic' || want === 'claude') return anthropic;
  return deepseek ?? anthropic;
}

export const SYSTEM = `You are the assistant inside VisionPitts, a housing data map of Pittsburgh and Allegheny County, Pennsylvania.
You answer questions from residents, planners and community staff in plain language.

Rules:
1. Use only the FACTS given at the start of the conversation. They come from the tool's own data. If they do not cover the question, say so in one sentence and name what the facts do cover.
2. Never invent, estimate or calculate a number. Quote figures exactly as they are written in the facts. Compare with words (higher, lower, about the same, the highest nearby) instead of working out differences or percentages.
3. Describe the data, not the people: no stereotypes, no judgments about residents, no advice on where to live, invest or build.
4. "Asking rent" figures come from licensed listings and lean toward market-rate units. Say so only when you quote an asking rent. "Median gross rent" is a census figure and needs no such note.
5. Plain text only: no markdown, no asterisks, no headings. At most 120 words.
6. Begin with one or two plain sentences that answer the question. When asked to describe the surroundings, name the nearest places and say what stands out about them and about the selected place. Add short lines that start with "• " only to compare figures, five lines at most. Do not repeat the facts line by line.`;

/** Trims and bounds what the browser sent. Null when it is not a usable request. */
export function clean(body: unknown): ChatPayload | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.question !== 'string' || typeof b.facts !== 'string') return null;
  const question = b.question.trim().slice(0, LIMITS.question);
  const facts = b.facts.trim();
  if (!question || !facts || facts.length > LIMITS.facts) return null;
  const history: Turn[] = [];
  if (Array.isArray(b.history)) {
    for (const t of b.history.slice(-LIMITS.history)) {
      const turn = t as Partial<Turn> | null;
      if (turn && (turn.role === 'user' || turn.role === 'assistant') && typeof turn.text === 'string' && turn.text.trim()) history.push({ role: turn.role, text: turn.text.trim().slice(0, LIMITS.turn) });
    }
  }
  // A conversation starts with the user and alternates; anything else is dropped rather than repaired.
  const ok = history.every((t, i) => t.role === (i % 2 === 0 ? 'user' : 'assistant')) && history.length % 2 === 0;
  return { question, facts, history: ok ? history : [] };
}

/** Facts first (the part that repeats from one question to the next), then the last exchange, then the question. */
export function buildMessages(p: ChatPayload): Turn[] {
  return [{ role: 'user', text: `FACTS\n${p.facts}` }, { role: 'assistant', text: FACTS_ACK }, ...(p.history ?? []), { role: 'user', text: `QUESTION\n${p.question}` }];
}

const NUMBER = /\d[\d,]*(?:\.\d+)?/g;
const norm = (s: string) => s.replace(/,/g, '').replace(/^0+(?=\d)/, '').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
/**
 * Every number in `text` must be written somewhere in `sources` (thousands separators and trailing zeros aside).
 * A figure with decimals may also be quoted rounded to a whole number or to one decimal. Whole numbers up to 12 pass
 * as counts and list positions.
 */
export function checkNumbers(text: string, sources: string[]): { ok: boolean; unmatched: string[] } {
  const allowed = new Set<string>();
  for (let i = 0; i <= 12; i++) allowed.add(String(i));
  for (const src of sources) {
    for (const raw of src.match(NUMBER) ?? []) {
      const n = norm(raw);
      allowed.add(n);
      const v = Number(n);
      if (Number.isFinite(v) && n.includes('.')) {
        allowed.add(norm(v.toFixed(1)));
        allowed.add(String(Math.round(v)));
      }
    }
  }
  const unmatched = [...new Set((text.match(NUMBER) ?? []).map(norm).filter((n) => !allowed.has(n)))];
  return { ok: unmatched.length === 0, unmatched };
}

/** Plain text: the interface does not render markdown. */
export const tidy = (s: string) => s.replace(/\*\*/g, '').replace(/^#+\s*/gm, '').replace(/^\s*[-*]\s+/gm, '• ').trim();

export interface Usage {
  input: number;
  /** Input tokens the provider billed at its cached rate. */
  cached: number;
  output: number;
}
type Done = { ok: true; text: string; usage: Usage } | { ok: false; status: number };
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

async function complete(p: Provider, messages: Turn[]): Promise<Done> {
  if (p.id === 'deepseek') {
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${p.key}` },
      body: JSON.stringify({ model: p.model, max_tokens: MAX_TOKENS, temperature: TEMPERATURE, thinking: { type: 'disabled' }, messages: [{ role: 'system', content: SYSTEM }, ...messages.map((m) => ({ role: m.role, content: m.text }))] }),
    });
    if (!r.ok) return { ok: false, status: r.status };
    const data = (await r.json()) as { choices?: { message?: { content?: string } }[]; usage?: Record<string, unknown> };
    const u = data.usage ?? {};
    return { ok: true, text: (data.choices?.[0]?.message?.content ?? '').trim(), usage: { input: num(u.prompt_tokens), cached: num(u.prompt_cache_hit_tokens), output: num(u.completion_tokens) } };
  }
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': p.key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: p.model, max_tokens: MAX_TOKENS, temperature: TEMPERATURE, system: SYSTEM, messages: messages.map((m) => ({ role: m.role, content: m.text })) }),
  });
  if (!r.ok) return { ok: false, status: r.status };
  const data = (await r.json()) as { content?: { type: string; text?: string }[]; usage?: Record<string, unknown> };
  const u = data.usage ?? {};
  return { ok: true, text: (data.content ?? []).map((c) => c.text ?? '').join('').trim(), usage: { input: num(u.input_tokens), cached: num(u.cache_read_input_tokens), output: num(u.output_tokens) } };
}

/** Answers given while this function instance is warm, by provider, facts, history and question. */
const warm = new Map<string, Record<string, unknown>>();
const WARM_MAX = 200;

export default async function handler(req: { method?: string; body?: unknown }, res: { status: (n: number) => { json: (b: unknown) => void } }) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, reason: 'POST only' });
  const provider = pickProvider(process.env);
  if (!provider) return res.status(200).json({ ok: false, reason: 'no_api_key' });
  let payload: ChatPayload | null;
  try {
    payload = clean(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
  } catch {
    payload = null;
  }
  if (!payload) return res.status(400).json({ ok: false, reason: 'bad_request' });

  const messages = buildMessages(payload);
  const cacheKey = JSON.stringify([provider.id, provider.model, messages]);
  const hit = warm.get(cacheKey);
  if (hit) return res.status(200).json({ ...hit, cached: true, usage: { input: 0, cached: 0, output: 0 } });
  const sources = [payload.facts, payload.question, ...(payload.history ?? []).map((t) => t.text)];
  const first = await complete(provider, messages);
  if (!first.ok) return res.status(200).json({ ok: false, reason: `${provider.id}_${first.status}` });
  const usage: Usage = { ...first.usage };
  let text = tidy(first.text);
  let check = checkNumbers(text, sources);
  if (!check.ok) {
    const again = await complete(provider, [...messages, { role: 'assistant', text: first.text }, { role: 'user', text: `These numbers are not in the facts: ${check.unmatched.join(', ')}. Rewrite the answer using only figures written in the facts, exactly as written. Do not calculate anything.` }]);
    if (again.ok) {
      usage.input += again.usage.input;
      usage.cached += again.usage.cached;
      usage.output += again.usage.output;
      const t2 = tidy(again.text);
      const c2 = checkNumbers(t2, sources);
      if (c2.unmatched.length < check.unmatched.length) {
        text = t2;
        check = c2;
      }
    }
  }
  if (!text) return res.status(200).json({ ok: false, reason: 'empty_answer' });
  const out = { ok: true, text, provider: provider.label, model: provider.model, checked: check.ok, unmatched: check.unmatched };
  if (check.ok) {
    if (warm.size >= WARM_MAX) warm.delete(warm.keys().next().value as string);
    warm.set(cacheKey, out);
  }
  return res.status(200).json({ ...out, usage });
}
