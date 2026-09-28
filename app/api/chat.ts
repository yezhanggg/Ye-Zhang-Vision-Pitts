// Vercel serverless function: answers a question about the place on the map from facts the app already holds.
//
// Rules (see README "AI use"):
//  1. The model receives the question and a facts text the browser built from the tool's own published data: census
//     values, the tool's analysis of city tracts, area aggregates of asking rents. It never sees raw records and
//     never computes a score.
//  1b. Scope: Pittsburgh / Allegheny County housing and the tool's data. Other questions get one polite sentence (a
//     permissive keyword pre-check catches the obvious ones before any model call). In-scope questions the facts do
//     not cover may get general background from the model, labelled as such and without figures.
//  2. Every number in the answer must appear in the facts or in the conversation. If some cannot be traced, the model
//     gets one retry that names them; if the second answer still has some, it is returned with checked:false and the
//     app says so beside the answer.
//  3. The API key lives in the environment; the browser never sees it. Inputs are size-limited and nothing is stored.
//  4. Tokens are money. The facts go first, right after the system text, so that a second question about the same
//     place repeats the same opening and the provider can bill it as cached input. Only the last exchange is sent as
//     history, answers are capped, and a question already answered while this function is warm is served from memory.
//
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
export const FACTS_ACK = 'Understood. I will answer from these facts first.';
/** The one-sentence answer to a question outside the tool's scope. */
export const DECLINE = 'I can only help with Pittsburgh housing and the data in VisionPitts.';
/** How an answer from general knowledge (not from the facts) is labelled. */
export const GENERAL_LABEL = 'General background (not from VisionPitts data)';
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

Scope: Pittsburgh and Allegheny County housing, neighborhoods, affordability, rents, zoning, transit, flooding, demographics, housing policy and programs, and the data in this tool. If a question is about anything else, reply with exactly this one sentence and nothing more: "${DECLINE}"

Rules:
1. Answer from the FACTS given at the start of the conversation first. They come from the tool's own data. When they cover the question, use only them.
2. When the question is in scope but the facts do not cover it, you may add a short explanation from general knowledge in plain words. Put it after any answer from the facts, on its own line beginning "${GENERAL_LABEL}: ". In that part state no figures at all: no numbers, years, amounts or percentages that are not written in the facts.
3. Never invent, estimate or calculate a number. Quote figures exactly as they are written in the facts. Compare with words (higher, lower, about the same, the highest nearby) instead of working out differences or percentages.
4. Describe the data, not the people: no stereotypes, no judgments about residents, no advice on where to live, invest or build.
5. "Asking rent" figures come from licensed listings and lean toward market-rate units. Say so only when you quote an asking rent. "Median gross rent" is a census figure and needs no such note.
6. Plain text only: no markdown, no asterisks, no headings. At most 120 words.
7. Begin with one or two plain sentences that answer the question. When asked to describe the surroundings, name the nearest places and say what stands out about them and about the selected place. Add short lines that start with "• " only to compare figures, five lines at most. Do not repeat the facts line by line.`;

// A light pre-check, so an obviously unrelated request never reaches (or bills) the model. It is permissive on purpose:
// it only declines when the question reads as a known off-topic request AND names nothing in scope (a housing word,
// Pittsburgh, or any place written in the facts). Everything else goes to the model, which applies the scope rule.
const OFF_TOPIC = [
  /\b(recipe|cook(ing)?|bake|baking)\b/,
  /\b(write|compose)\b.*\b(poem|song|story|essay|lyrics|haiku)\b/,
  /\b(poem|haiku|limerick|joke|riddle)\b/,
  /\b(python|javascript|typescript|c\+\+|sql query|html|css|regex|debug)\b/,
  /\bwrite (me )?(some |a )?(code|script|program|function)\b/,
  /\b(translate|translation)\b/,
  /\b(stock|crypto|bitcoin|forex)\b/,
  /\b(movie|film|tv show|netflix|celebrity|video game)\b/,
  /\b(horoscope|zodiac|astrology)\b/,
  /\b(diagnos\w*|symptom|medication|prescription)\b/,
  /\b(homework|solve for x|derivative|integral|equation)\b/,
  /\b(capital of|president of|who won|world cup|super bowl|olympics)\b/,
];
const IN_SCOPE = /\b(pittsburgh|allegheny|pennsylvania|pa\b|pgh|neighbou?rhood|tract|block group|municipalit|borough|township|housing|house|home|homes|rent|rents|renter|renting|lease|landlord|tenant|evict|afford|income|mortgage|property|zoning|zone|density|units?|building|develop|transit|bus|port authority|prt|commute|flood|river|demograph|population|census|acs|poverty|vacan|displace|gentrif|equity|lihtc|subsid|voucher|section 8|hud|fmr|policy|program|tax|assess|market|visionpitts|map|data|score|match)/;
/** True only for a question that is clearly about something outside the tool's scope. */
export function offTopic(question: string, facts = ''): boolean {
  const q = question.toLowerCase();
  if (!OFF_TOPIC.some((re) => re.test(q))) return false;
  if (IN_SCOPE.test(q)) return false;
  // A place named in the facts (Hazelwood, Greenfield, Mt. Lebanon…) keeps the question in scope.
  const names = new Set((facts.match(/\b[A-Z][a-z]{3,}\b/g) ?? []).map((w) => w.toLowerCase()));
  return !q.split(/[^a-z]+/).some((w) => w.length >= 4 && names.has(w));
}

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
  let payload: ChatPayload | null;
  try {
    payload = clean(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
  } catch {
    payload = null;
  }
  if (!payload) return res.status(400).json({ ok: false, reason: 'bad_request' });
  // Declined without calling the model: no key needed, no tokens spent. It has no figures, so it is checked.
  if (offTopic(payload.question, payload.facts)) return res.status(200).json({ ok: true, text: DECLINE, provider: provider?.label ?? 'VisionPitts', model: provider?.model, checked: true, unmatched: [], declined: true, usage: { input: 0, cached: 0, output: 0 } });
  if (!provider) return res.status(200).json({ ok: false, reason: 'no_api_key' });

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
