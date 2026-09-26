// Read-only access to the Supabase project through PostgREST with the public anon key (row-level security allows
// select only). `supabase` is null when the VITE_ variables are unset or the app runs from a file:// export, and
// callers then keep the bundled city subset. No SDK: plain fetch keeps the single-file export small.

export interface SupabaseConfig {
  url: string;
  key: string;
}

function detect(): SupabaseConfig | null {
  const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
  const key = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !key) return null;
  try {
    if (typeof location !== 'undefined' && location.protocol === 'file:') return null;
  } catch {
    /* no location in tests */
  }
  return { url: url.replace(/\/+$/, ''), key };
}

export const supabase: SupabaseConfig | null = detect();

export class RestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'RestError';
    this.status = status;
  }
}

/** PostgREST serves at most this many rows per request (project default). */
export const PAGE_SIZE = 1000;

export interface RestOptions {
  signal?: AbortSignal;
  /** Total budget for every page together. */
  timeoutMs?: number;
  pageSize?: number;
}

/**
 * GET rows from a table, following `limit`/`offset` pages until a short page arrives.
 * Throws on a non-2xx status, an abort or the total timeout; never returns a partial result.
 */
export async function restGet<T>(table: string, params: Record<string, string>, opts: RestOptions = {}): Promise<T[]> {
  if (!supabase) throw new Error('supabase is not configured');
  const { timeoutMs = 8000, pageSize = PAGE_SIZE } = opts;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  const onAbort = () => ctl.abort();
  if (opts.signal?.aborted) ctl.abort();
  opts.signal?.addEventListener('abort', onAbort, { once: true });
  const headers = { apikey: supabase.key, Authorization: `Bearer ${supabase.key}`, Accept: 'application/json' };
  const out: T[] = [];
  try {
    for (let offset = 0; ; offset += pageSize) {
      const q = new URLSearchParams(params);
      q.set('limit', String(pageSize));
      q.set('offset', String(offset));
      const r = await fetch(`${supabase.url}/rest/v1/${table}?${q.toString()}`, { signal: ctl.signal, headers });
      if (!r.ok) throw new RestError(r.status, `${table}: HTTP ${r.status}`);
      const page = (await r.json()) as unknown;
      if (!Array.isArray(page)) throw new RestError(r.status, `${table}: unexpected response body`);
      out.push(...(page as T[]));
      if (page.length < pageSize) break;
    }
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
  return out;
}
