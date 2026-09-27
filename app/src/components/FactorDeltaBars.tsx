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

/** Hex color with an alpha suffix, for a light tint of a side's color ("14" is about 8%). */
const tint = (hex: string, a: string) => (/^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${a}` : hex);

/**
 * "Why they differ" as a three-column table in the same row rhythm as At a glance: the factor, then place A's and
 * place B's values right-aligned. The side a factor favors for the basis type gets a light tint of its color and a
 * small ● marker. Rows come from `factorDeltasSafe`; a factor missing on either side reads "no data" in grey, never
 * favors anyone and sits last. Factors with little effect are folded under "Other factors (n)".
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

  const cols = (
    <colgroup>
      <col />
      <col className="w-[30%]" />
      <col className="w-[30%]" />
    </colgroup>
  );

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
        <td className={cx('px-2 py-1.5 text-right text-small tnum', v == null ? 'text-caption text-slate-400' : 'font-medium text-slate-900')} style={win ? { background: tint(color, '14') } : undefined}>
          {win && (
            <span className="mr-1.5 align-middle text-[9px] leading-none" style={{ color }} aria-hidden>
              ●
            </span>
          )}
          {val(v, sub)}
        </td>
      );
    };
    return (
      <tr key={r.factor} data-row={r.factor} data-missing={r.missing ?? undefined} title={title} aria-label={`${fLabel(r.factor)}: ${title}`} className="border-t border-stone-200/70">
        <td className={cx('py-1.5 pr-2 text-small leading-snug', gone ? 'text-slate-400' : 'text-slate-600')}>{fLabel(r.factor)}</td>
        {cell('a')}
        {cell('b')}
      </tr>
    );
  };

  const head = (
    <thead>
      <tr className="text-caption">
        <th className="pb-1 text-left font-normal text-slate-500">Factor</th>
        {([['A', labelA, colorA], ['B', labelB, colorB]] as const).map(([tag, label, color]) => (
          <th key={tag} className="truncate border-b-2 pb-1 text-right font-medium" style={{ color, borderColor: color }} title={label}>
            {tag}
            <span className="mx-1 text-slate-300">·</span>
            {label}
          </th>
        ))}
      </tr>
    </thead>
  );

  return (
    <div>
      <table className="w-full table-fixed border-collapse" data-testid="delta-rows">
        {cols}
        {head}
        <tbody className="border-b border-stone-200/70">{shown.map(row)}</tbody>
      </table>
      {rest.length > 0 && (
        <details className="group mt-1">
          <summary className="cursor-pointer select-none py-1 text-caption text-slate-600 hover:text-slate-900">Other factors ({rest.length}) · little effect</summary>
          <table className="w-full table-fixed border-collapse">
            {cols}
            <tbody className="border-b border-stone-200/70">{rest.map(row)}</tbody>
          </table>
        </details>
      )}
      <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
        ● and the shading mark the place the factor favors for {typology}, using your priorities. Percentages compare each place with all residential city tracts.
      </p>
    </div>
  );
}
