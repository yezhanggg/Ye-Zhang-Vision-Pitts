// Block F: zoning and programs, two lines never merged. Zoning = district land shares from WPRDC plus a by-right
// annotation per typology from an unverified table (always suffixed "(unverified)", never a gate), or
// "Zoning: not checked by this tool." when the pipeline has no zoning for the tract. Programs = QCT / DDA /
// Opportunity Zone / CDBG, which are what the subsidy factor reads; they are not zoning and are never called so.
import { isNum } from '../../lib/format';
import { scoring } from '../../lib/data';
import type { PlaceMeasures, Typology, ZoningStatus } from '../../lib/place/types';
import { Block, NA, SourceLine, Table } from './shared';

const STATUS_TEXT: Record<ZoningStatus, string> = { yes: 'by right', conditional: 'conditional use', no: 'not permitted', unknown: 'unknown' };
const STATUS_TONE: Record<ZoningStatus, string> = { yes: 'text-emerald-800', conditional: 'text-amber-900', no: 'text-rose-800', unknown: 'text-slate-500' };
const TYPES: Typology[] = ['adu', 'duplex_triplex', 'townhome', 'small_apartment', 'senior'];
const typeLabel = (k: Typology) => scoring.typologies.find((t) => t.id === k)?.label ?? k;
const yn = (v: boolean | null) => (v == null ? NA : v ? 'yes' : 'no');

/** District shares as "R1D-M 62% · LNC 20%", largest first, shares under 1% dropped. */
export function districtText(shares: Record<string, number>): string {
  const rows = Object.entries(shares)
    .filter(([, v]) => isNum(v) && v >= 1)
    .sort((a, b) => b[1] - a[1]);
  return rows.length ? rows.map(([k, v]) => `${k} ${Math.round(v)}%`).join(' · ') : NA;
}

export default function ZoningPrograms({ place }: { place: PlaceMeasures }) {
  const z = place.zoning;
  const p = place.programs;
  const byRight = z ? TYPES.filter((k) => z.by_type[k] === 'yes') : [];
  return (
    <Block
      title="Zoning and programs"
      sub="Two separate facts: what the zoning map says, and which federal or city programs apply."
      tone="observed"
      source={<>Source · Zoning: City of Pittsburgh zoning districts via WPRDC (share of tract land by district); by-right annotations from a 16-row reading of Title 9, unverified · Programs: HUD QCT and DDA 2026 · U.S. Treasury Opportunity Zones · City of Pittsburgh CDBG areas 2018 · Programs are what the subsidy factor reads; they are not zoning.</>}
    >
      <div className="mt-1 space-y-2">
        <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-stone-200/80">
          {z ? (
            <>
              <div className="text-small text-slate-800">
                <b className="text-slate-900">Zoning here:</b> {districtText(z.shares)}
                {byRight.length > 0 && (
                  <>
                    ; {byRight.map(typeLabel).join(', ')} by right <span className="text-slate-500">(unverified)</span>
                  </>
                )}
                .
              </div>
              <Table
                className="mt-1.5"
                caption="By-right annotation per housing type (unverified)"
                rows={TYPES.map((k) => ({ key: k, cells: [typeLabel(k), <span className={STATUS_TONE[z.by_type[k] ?? 'unknown']}>{STATUS_TEXT[z.by_type[k] ?? 'unknown']} (unverified)</span>] }))}
              />
              <SourceLine className="mt-1">Annotations only, never a gate: confirm in Title 9 of the Pittsburgh Code before relying on them.</SourceLine>
            </>
          ) : (
            <div className="text-small text-slate-800">
              <b className="text-slate-900">Zoning:</b> not checked by this tool.
            </div>
          )}
        </div>
        <div className="rounded-xl bg-white px-3 py-2 text-small text-slate-800 ring-1 ring-stone-200/80">
          <b className="text-slate-900">Programs:</b> QCT <b>{yn(p.qct)}</b> · DDA <b>{yn(p.dda)}</b> · Opportunity Zone <b>{yn(p.oz)}</b> · CDBG <b>{yn(p.cdbg)}</b>
        </div>
      </div>
    </Block>
  );
}
