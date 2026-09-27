// Block F: zoning and programs, two lines never merged. Zoning = district land shares from WPRDC plus a by-right
// annotation per typology from an unverified table (always suffixed "(unverified)", never a gate), or
// "Zoning: not checked by this tool." when the pipeline has no zoning for the tract. Programs = QCT / DDA /
// Opportunity Zone / CDBG, which are what the subsidy factor reads; they are not zoning and are never called so.
import { isNum } from '../../lib/format';
import { scoring } from '../../lib/data';
import type { PlaceMeasures, Typology } from '../../lib/place/types';
import { Block, NA, SourceLine, Table } from './shared';
import { InfoTip } from '../primitives';
import { cx } from '../../lib/format';
import { landByGroup, landForType, multiUnitLand } from '../../lib/place/zoningAnalysis';

const TYPES: Typology[] = ['adu', 'duplex_triplex', 'townhome', 'small_apartment', 'senior'];
const typeLabel = (k: Typology) => scoring.typologies.find((t) => t.id === k)?.label ?? k;
const yn = (v: boolean | null) => (v == null ? NA : v ? 'yes' : 'no');

/** District shares as "R1D-M 62% · LNC 20%", largest first, shares under 1% dropped. */
export function districtText(shares: Record<string, number>): string {
  // place.json stores land shares as 0–1 fractions; older data used percents. Scale fractions to percents.
  const vals = Object.values(shares).filter(isNum);
  const scale = vals.length && Math.max(...vals) <= 1 ? 100 : 1;
  const rows = Object.entries(shares)
    .filter(([, v]) => isNum(v))
    .map(([k, v]) => [k, v * scale] as [string, number])
    .filter(([, v]) => v >= 1)
    .sort((a, b) => b[1] - a[1]);
  return rows.length ? rows.map(([k, v]) => `${k} ${Math.round(v)}%`).join(' · ') : NA;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Zoning analysis (land by plain group, where each type is allowed, what it means for the suggestion) and programs. */
export default function ZoningPrograms({ place, lead = null }: { place: PlaceMeasures; lead?: Typology | null }) {
  const z = place.zoning;
  const p = place.programs;
  const groups = z ? landByGroup(z.shares) : [];
  const byType = z ? TYPES.map((k) => ({ k, land: landForType(z.shares, k) })) : [];
  const leadLand = lead && z ? landForType(z.shares, lead) : null;
  const res = groups.find((g) => g.id === 'res')?.share ?? 0;
  const multi = z ? multiUnitLand(z.shares) : 0;
  const top = groups[0];
  return (
    <Block
      title="Zoning and programs"
      sub="What the land is zoned for, where each type is allowed, and which programs apply."
      tone="observed"
      source={<>Source · City of Pittsburgh zoning districts (WPRDC), share of tract land by district · Which types each district allows: a 17-row reading of Title 9, unverified · Programs: HUD QCT and DDA 2026 · U.S. Treasury Opportunity Zones · City CDBG areas 2018.</>}
    >
      <div className="mt-1 space-y-2">
        <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-stone-200/80">
          {z && top ? (
            <>
              <p className="text-small leading-snug text-slate-800">
                Most land here is <b className="text-slate-900">{top.label.toLowerCase()}</b> ({pct(top.share)}). Residential districts cover {pct(res)}, and {pct(multi)} of the land allows three or more homes on a lot.
                {lead && leadLand && (
                  <>
                    {' '}
                    The suggested <b className="text-slate-900">{typeLabel(lead).toLowerCase()}</b> is allowed by right on {pct(leadLand.yes)} of the land
                    {leadLand.conditional > 0.005 ? <> and with a hearing on {pct(leadLand.conditional)} more</> : null}.
                  </>
                )}
              </p>
              <div className="mt-2 flex h-3 overflow-hidden rounded-sm ring-1 ring-black/5" role="img" aria-label={groups.map((g) => `${g.label} ${pct(g.share)}`).join(', ')}>
                {groups.map((g) => (
                  <span key={g.id} style={{ width: `${g.share * 100}%`, background: g.color }} title={`${g.label}: ${pct(g.share)}`} />
                ))}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-caption text-slate-600">
                {groups.map((g) => (
                  <span key={g.id} className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm" style={{ background: g.color }} />
                    {g.label} <span className="tnum text-slate-500">{pct(g.share)}</span>
                  </span>
                ))}
                <InfoTip label="Zoning districts" width={260}>
                  Districts by share of land: {districtText(z.shares)}.
                </InfoTip>
              </div>
              <Table
                className="mt-2"
                caption="Share of land where each type is allowed (unverified)"
                rows={[
                  { key: 'h', cells: [<span className="text-slate-500">Type</span>, <span className="text-slate-500">By right</span>, <span className="text-slate-500">With a hearing</span>] },
                  ...byType.map(({ k, land }) => ({
                    key: k,
                    cells: [
                      <span className={k === lead ? 'font-semibold text-slate-900' : ''}>{typeLabel(k)}</span>,
                      <span className={cx('tnum', land.yes > 0.05 ? 'text-emerald-800' : 'text-slate-500')}>{pct(land.yes)}</span>,
                      <span className={cx('tnum', land.conditional > 0.05 ? 'text-amber-900' : 'text-slate-500')}>{pct(land.conditional)}</span>,
                    ],
                  })),
                ]}
              />
              <SourceLine className="mt-1">Annotations, never a gate: confirm in Title 9 of the Pittsburgh Code before relying on them.</SourceLine>
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
