// A lot and its zoning, in one card: the county's lot facts (LotCard) and what the City's zoning code allows there
// (lib/zoning/capacity): the district, the housing it allows by right and with approval, the units by right on this
// lot, the minimum lot, height, setbacks, floor area and coverage where set, and the inclusionary overlay. Shown on
// the right at the Parcel level of Place (Browse and Test) and when a lot is clicked under Parcels in Explore.
// A reading of the code, not a zoning determination. Lot facts only. Online only: loaded on demand.
import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '../../../lib/format';
import { lotName, lotSize } from '../../../lib/explore/parcelShadow';
import type { SiteLot } from '../../../lib/project/store';
import { districtName, homesByRight, STANDARD_BY_CODE, STANDARDS, storiesOf, type UseKey, type UseStatus } from '../../../lib/zoning/capacity';
import LotCard from './LotCard';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const APPROVAL: Partial<Record<UseStatus, string>> = { A: 'administrator exception', S: 'special exception', C: 'conditional use' };
const USE_SHORT: Record<UseKey, string> = {
  single_detached: 'single-unit detached',
  single_attached: 'rowhouse',
  two_unit: 'two-unit',
  three_unit: 'three-unit',
  multi_unit: 'multi-unit (4+)',
  elderly_limited: 'senior (limited)',
  elderly_general: 'senior (general)',
};
const USES = Object.keys(USE_SHORT) as UseKey[];
const READ = new Date(`${STANDARDS.current_through}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const Row = ({ k, children, title }: { k: string; children: ReactNode; title?: string }) => (
  <div className="flex items-baseline justify-between gap-3 px-2.5 py-1.5" title={title}>
    <dt className="shrink-0 text-slate-700">{k}</dt>
    <dd className="text-right font-medium text-slate-900">{children}</dd>
  </div>
);

/** What the zoning code allows on the lot, row by row. */
export function ZoningRows({ lot, izo }: { lot: SiteLot; izo: boolean | null }) {
  const code = lot.district;
  const std = code ? STANDARD_BY_CODE.get(code) : undefined;
  if (!code) return <p className="px-2.5 py-2 text-small text-slate-700">No City zoning district read at this lot (outside Pittsburgh, or a right of way).</p>;
  if (!std)
    return (
      <p className="px-2.5 py-2 text-small leading-snug text-slate-700">
        <b className="font-semibold">{code}</b>: not computed here{STANDARDS.not_computed[code] ? ` (${STANDARDS.not_computed[code]})` : ''}. Check Title Nine or the Zoning Administrator.
      </p>
    );
  const by = homesByRight(std, lot.sqft, lot.frontageFt, lot.depthFt);
  const yes = USES.filter((u) => std.uses[u] === 'P' || std.uses[u] === 'P/S').map((u) => `${USE_SHORT[u]}${std.uses[u] === 'P/S' ? ' (lots 35 ft wide or less)' : ''}`);
  const ask = USES.filter((u) => APPROVAL[std.uses[u]]).map((u) => `${USE_SHORT[u]} (${APPROVAL[std.uses[u]]})`);
  const stories = storiesOf(std);
  return (
    <>
      <Row k="District" title={`${STANDARDS.code}, ${std.section}`}>
        {code} · {districtName(code)}
      </Row>
      <Row k="Units by right here" title={by.formula}>
        {by.below_min ? <span className="text-rose-700">none: under the minimum lot</span> : `up to ${by.homes}`}
      </Row>
      <Row k="Allowed by right">{yes.length ? yes.join(', ') : 'no housing'}</Row>
      {ask.length > 0 && <Row k="With approval">{ask.join(', ')}</Row>}
      <Row k="Minimum lot">
        {n0(std.min_lot_sqft)} sq ft{lot.sqft > 0 ? (lot.sqft >= std.min_lot_sqft ? ' · this lot meets it' : ' · this lot is smaller') : ''}
      </Row>
      <Row k="Height">{[stories != null ? `${stories} stories` : null, std.max_height_ft != null ? `${std.max_height_ft} ft` : null].filter(Boolean).join(', ') || 'not set'}</Row>
      <Row k="Setbacks" title="Front, rear, and the two sides together">
        front {std.front_ft} · rear {std.rear_ft} · sides {std.side_total_ft} ft
      </Row>
      {std.max_far != null && <Row k="Floor area ratio">{std.max_far}:1</Row>}
      {std.max_coverage != null && <Row k="Lot coverage">{Math.round(std.max_coverage * 100)}%</Row>}
      {izo && <Row k="Inclusionary overlay">{`${Math.round(STANDARDS.inclusionary.share * 100)}% of ${STANDARDS.inclusionary.min_homes}+ units at ${STANDARDS.inclusionary.ami_rental}% AMI`}</Row>}
      {(std.notes.length > 0 || !std.verified) && (
        <div className="px-2.5 py-1.5 text-caption leading-snug text-slate-600">
          {!std.verified && 'Standards not verified against the code. '}
          {std.notes.join(' ')}
        </div>
      )}
    </>
  );
}

/** One line for a folded card: the use, the area, the district and the units by right. */
export function lotLine(lot: SiteLot): string {
  const std = lot.district ? STANDARD_BY_CODE.get(lot.district) : undefined;
  const by = std ? homesByRight(std, lot.sqft, lot.frontageFt, lot.depthFt) : null;
  return [lotSize(lot.sqft), lot.district ?? 'no district read', by ? (by.below_min ? 'under the minimum lot' : `up to ${by.homes} unit${by.homes === 1 ? '' : 's'} by right`) : null].filter(Boolean).join(' · ');
}

/**
 * The lot and its zoning. `fold`: start folded to one line (Test a project, where the results follow); open
 * otherwise (Browse, Explore).
 */
export default function LotZoning({ lot, izo, fold = false }: { lot: SiteLot; izo: boolean | null; fold?: boolean }) {
  const [open, setOpen] = useState(!fold);
  return (
    <section className="rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200" data-lot-zoning>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start justify-between gap-2 text-left">
        <span className="min-w-0">
          <span className="block text-small font-semibold text-slate-900">Site and zoning · {lotName(lot.label)}</span>
          {!open && <span className="block truncate text-caption text-slate-600">{lotLine(lot)}</span>}
        </span>
        <ChevronDown className={cx('mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <div className="text-caption font-semibold uppercase tracking-wide text-slate-500">The lot</div>
          <LotCard lot={lot} izo={izo} zoning={false} />
          <div className="text-caption font-semibold uppercase tracking-wide text-slate-500">Zoning</div>
          <dl className="divide-y divide-stone-100 overflow-hidden rounded-xl bg-white text-small ring-1 ring-stone-200/80" data-lot-zoning-rows>
            <ZoningRows lot={lot} izo={izo} />
          </dl>
          <p className="text-caption leading-snug text-slate-500">
            A reading of{' '}
            <a href={STANDARDS.url} target="_blank" rel="noreferrer" className="underline decoration-slate-300 underline-offset-2 hover:text-slate-800">
              Title Nine
            </a>{' '}
            (current through {READ}) and county lot records, not a zoning determination. No owner, value or sale.
          </p>
        </div>
      )}
    </section>
  );
}
