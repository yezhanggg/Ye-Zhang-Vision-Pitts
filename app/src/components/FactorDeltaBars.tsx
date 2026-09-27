import { missingText, type SafeDeltaRow } from '../lib/analysis/compare';
import { fLabel } from '../lib/derived';
import { pctShort } from '../lib/copy';
import { cx } from '../lib/format';
import type { TractProps } from '../lib/types';

/** A graded subsidy value in two words (1 = tax-credit area, 0.5 = OZ or CDBG only, 0 = none). */
const subsidyShort = (x: number) => (x >= 0.75 ? 'fully eligible' : x >= 0.25 ? 'partly eligible' : 'not eligible');

/** A factor whose contribution gap is below this (score points on 0–1) is listed under "Other factors". */
const MEANINGFUL = 0.005;
/** Always show at least this many compared rows, even when every gap is small. */
const MIN_SHOWN = 3;

/** Hex color with an alpha suffix, for a light tint of a side's color. */
const tint = (hex: string, a: string) => (/^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${a}` : hex);

/**
 * "Why they differ" as a two-sided table: place A's column on the left, place B's on the right, the factor in the
 * middle with an arrow pointing to the side it favors for the basis type. Rows come from `factorDeltasSafe`; a factor
 * missing on either side reads "no data" in grey, never favors anyone and sits last. Factors with little effect are
 * folded under "Other factors (n)".
 */
export default function FactorDeltaBars({ rows, ta, tb, colorA, colorB, labelA, labelB, typology }: { rows: SafeDeltaRow[]; ta: TractProps; tb: TractProps; colorA: string; colorB: string; labelA: string; labelB: string; typology: string }) {
  const compared = rows.filter((r) => r.missing == null);
  const missing = rows.filter((r) => r.missing != null);
  const big = compared.filter((r) => r.gap != null && Math.abs(r.gap) >= MEANINGFUL);
  const main = big.length >= MIN_SHOWN ? big : compared.slice(0, MIN_SHOWN);
  const rest = compared.filter((r) => !main.includes(r));
  const shown = [...main, ...missing];

  const val = (x: number | null, subsidy: boolean) => (x == null ? 'no data' : subsidy ? subsidyShort(x) : pctShort(x));
  const favors = (r: SafeDeltaRow): 'a' | 'b' | null => (r.gap == null || Math.abs(r.gap) < 0.002 ? null : r.gap > 0 ? 'a' : 'b');

  const row = (r: SafeDeltaRow) => {
    const sub = r.factor === 'subsidy_eligible';
    const gone = r.missing != null;
    const f = favors(r);
    const note = missingText(r, ta, tb);
    const title = note ?? (f === 'a' ? `Favors ${labelA} for ${typology}` : f === 'b' ? `Favors ${labelB} for ${typology}` : `Little effect on the ${typology} match`);
    const cell = (side: 'a' | 'b') => {
      const v = side === 'a' ? r.a : r.b;
      const win = f === side;
      const color = side === 'a' ? colorA : colorB;
      return (
        <td className={cx('px-2 py-1.5 text-caption', side === 'a' ? 'rounded-l-md text-right' : 'rounded-r-md text-left', v == null ? 'italic text-slate-400' : win ? 'font-semibold' : 'text-slate-600')} style={win ? { color, background: tint(color, '14') } : undefined}>
          {val(v, sub)}
        </td>
      );
    };
    return (
      <tr key={r.factor} data-row={r.factor} data-missing={r.missing ?? undefined} title={title} aria-label={`${fLabel(r.factor)}: ${title}`} className="border-t border-stone-100">
        {cell('a')}
        <td className={cx('px-1 py-1.5 text-center text-caption', gone ? 'text-slate-400' : 'font-medium text-slate-800')}>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 text-right font-bold" style={{ color: colorA }} aria-hidden>
              {f === 'a' ? '◀' : ''}
            </span>
            {fLabel(r.factor)}
            <span className="w-3 text-left font-bold" style={{ color: colorB }} aria-hidden>
              {f === 'b' ? '▶' : ''}
            </span>
          </span>
        </td>
        {cell('b')}
      </tr>
    );
  };

  const head = (
    <thead>
      <tr className="text-caption">
        <th className="w-[30%] px-2 pb-1.5 text-right font-semibold" style={{ color: colorA }}>
          <span className="inline-flex items-center justify-end gap-1.5">
            <span className="truncate" title={labelA}>{labelA}</span>
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded text-[10px] font-bold text-white" style={{ background: colorA }}>
              A
            </span>
          </span>
        </th>
        <th className="px-1 pb-1.5 text-center font-medium text-slate-500">Factor</th>
        <th className="w-[30%] px-2 pb-1.5 text-left font-semibold" style={{ color: colorB }}>
          <span className="inline-flex items-center gap-1.5">
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded text-[10px] font-bold text-white" style={{ background: colorB }}>
              B
            </span>
            <span className="truncate" title={labelB}>{labelB}</span>
          </span>
        </th>
      </tr>
    </thead>
  );

  return (
    <div className="rounded-xl bg-white p-2 ring-1 ring-stone-200/80">
      <table className="w-full table-fixed border-separate border-spacing-0" data-testid="delta-rows">
        {head}
        <tbody>
          {shown.map(row)}
        </tbody>
      </table>
      {rest.length > 0 && (
        <details className="group mt-1">
          <summary className="cursor-pointer select-none rounded-md px-2 py-1 text-caption font-medium text-slate-600 hover:bg-stone-50">Other factors ({rest.length}) · little effect</summary>
          <table className="w-full table-fixed border-separate border-spacing-0">
            <colgroup>
              <col className="w-[30%]" />
              <col />
              <col className="w-[30%]" />
            </colgroup>
            <tbody>
              {rest.map(row)}
            </tbody>
          </table>
        </details>
      )}
      <p className="mt-1.5 px-2 text-caption text-slate-500">
        <span style={{ color: colorA }}>◀</span> / <span style={{ color: colorB }}>▶</span> points to the place the factor favors for {typology}, using your priorities. Percentages compare each place with all residential city tracts.
      </p>
    </div>
  );
}
