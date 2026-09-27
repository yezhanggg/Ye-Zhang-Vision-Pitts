// Shared pieces of the place blocks (A–G on the Analysis tab): one sentence, a small table, a grey source line.
// Every value may be null; the copy then reads "not available" and nothing is imputed or computed here.
import { createContext, useContext, type ReactNode } from 'react';
import { cx, isNum } from '../../lib/format';
import type { BandId, TypeBandId } from '../../lib/place/types';
import { ObservedBadge, SectionTitle } from '../primitives';

export const NA = 'not available';

/** A value through a formatter, or "not available". */
export const na = (v: number | null | undefined, f: (v: number) => string): string => (isNum(v) ? f(v) : NA);
export const money = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;
export const int = (v: number) => Math.round(v).toLocaleString('en-US');
export const pct = (v: number, d = 0) => `${v.toFixed(d)}%`;
/** A share on the 0–1 scale as a percent. */
export const share = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
export const miles = (v: number) => `${v < 0.1 ? v.toFixed(2) : v.toFixed(1)} mi`;

export const BAND_IDS: BandId[] = ['le30', 'b30_50', 'b50_80', 'b80_100', 'gt100'];
export const TYPE_BAND_IDS: TypeBandId[] = ['le30', 'b30_50', 'b50_80', 'gt80'];
export const BAND_LABEL: Record<BandId | 'gt80', string> = { le30: '≤ 30% AMI', b30_50: '30–50%', b50_80: '50–80%', b80_100: '80–100%', gt100: '> 100%', gt80: '> 80%' };
/** The band in a sentence: "at most 30%", "between 30 and 50%", "above 100%". */
export const bandPhrase = (b: BandId | 'gt80'): string => ({ le30: 'at most 30%', b30_50: 'between 30% and 50%', b50_80: 'between 50% and 80%', b80_100: 'between 80% and 100%', gt100: 'more than 100%', gt80: 'more than 80%' })[b];

/** The grey "Source · vintage · calculation" line under every block. */
export function SourceLine({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('text-caption leading-snug text-slate-500', className)}>{children}</div>;
}

/** Inside a fold (Analysis > Match) the fold already shows the block's title: the block drops its own heading. */
export const BareBlock = createContext(false);

/** One evidence block: a title with the observed badge, one sentence, the table, the source line. */
export function Block({ title, sub, right, sentence, children, source, tone = 'observed' }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; sentence?: ReactNode; children?: ReactNode; source: ReactNode; tone?: 'observed' | 'values' | 'plain' }) {
  const bare = useContext(BareBlock);
  if (bare) {
    return (
      <section>
        {sub && <div className="mb-1 text-caption text-slate-600">{sub}</div>}
        {sentence && <p className="text-small leading-snug text-slate-800">{sentence}</p>}
        {children}
        <SourceLine className="mt-1.5">{source}</SourceLine>
      </section>
    );
  }
  return (
    <section>
      <SectionTitle right={right ?? (tone === 'observed' ? <ObservedBadge small /> : undefined)} sub={sub}>
        {title}
      </SectionTitle>
      {sentence && <p className="text-body text-slate-800">{sentence}</p>}
      {children}
      <SourceLine className="mt-1.5">{source}</SourceLine>
    </section>
  );
}

/** A small table: a header row, then rows of cells. The first column is the label; numbers are right-aligned. */
export function Table({ head, rows, className, caption }: { head?: ReactNode[]; rows: { key: string; cells: ReactNode[]; muted?: boolean; strong?: boolean; title?: string }[]; className?: string; caption?: string }) {
  return (
    <div className={cx('mt-2 overflow-hidden rounded-xl bg-white ring-1 ring-stone-200/80', className)}>
      <table className="w-full border-collapse text-small">
        {caption && <caption className="sr-only">{caption}</caption>}
        {head && (
          <thead>
            <tr className="bg-stone-50 text-caption text-slate-600">
              {head.map((h, i) => (
                <th key={i} scope="col" className={cx('px-2.5 py-1.5 font-medium', i === 0 ? 'text-left' : 'text-right')}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-stone-100">
          {rows.map((r) => (
            <tr key={r.key} title={r.title} className={cx(r.muted && 'text-slate-500', r.strong && 'bg-violet-50/60')}>
              {r.cells.map((c, i) => (
                <td key={i} className={cx('px-2 py-1.5', i === 0 ? 'whitespace-nowrap text-left text-slate-800' : 'text-right tnum text-slate-900', r.strong && i === 0 && 'font-semibold')}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A value with its margin of error muted beside it, or "not available". */
export function WithMoe({ v, moe, f = int }: { v: number | null; moe?: number | null; f?: (v: number) => string }) {
  if (!isNum(v)) return <span className="text-slate-500">{NA}</span>;
  return (
    <>
      {f(v)}
      {isNum(moe) && moe > 0 && <span className="text-caption text-slate-500"> ±{f(moe)}</span>}
    </>
  );
}

/** A key–value list for blocks that are a few facts rather than a grid. */
export function Facts({ items }: { items: { k: ReactNode; v: ReactNode; key: string; title?: string }[] }) {
  return (
    <dl className="mt-2 divide-y divide-stone-100 overflow-hidden rounded-xl bg-white text-small ring-1 ring-stone-200/80">
      {items.map((it) => (
        <div key={it.key} title={it.title} className="flex items-baseline justify-between gap-3 px-2.5 py-1.5">
          <dt className="text-slate-700">{it.k}</dt>
          <dd className="text-right tnum font-medium text-slate-900">{it.v}</dd>
        </div>
      ))}
    </dl>
  );
}
