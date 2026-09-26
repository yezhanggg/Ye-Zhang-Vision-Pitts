export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export const fmtInt = (v: unknown) => (isNum(v) ? Math.round(v).toLocaleString('en-US') : '—');
export const fmtMoney = (v: unknown) => (isNum(v) ? `$${Math.round(v).toLocaleString('en-US')}` : '—');
export const fmtPct = (v: unknown, d = 0) => (isNum(v) ? `${(v * 100).toFixed(d)}%` : '—');
export const fmtNum = (v: unknown, d = 2) => (isNum(v) ? v.toFixed(d) : '—');
export const score100 = (v: number | null | undefined) => (v == null ? '—' : (v * 100).toFixed(0));
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export const ordinalSuffix = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
