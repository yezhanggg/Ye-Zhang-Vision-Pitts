// Block A: affordability by AMI band. One sentence on the renters at or below the band that matters, then the five
// CHAS bands with the HUD 4-person dollar limit beside each, the households in the band, and how many pay more than
// 30% and more than half of income. Observed data; the band the sentence names is the target band when the rules
// library gives one, else the ≤50% total.
import { isNum } from '../../lib/format';
import { bandLimit4p } from '../../lib/place/afford';
import type { BandId, HudTable, PlaceMeasures } from '../../lib/place/types';
import { BAND_IDS, BAND_LABEL, Block, NA, Table, WithMoe, int, money } from './shared';

/** The 4-person income limit that bounds a band (lib/place/afford.bandLimit4p), as "up to $55,200"; ">100%" is "above the median". */
export function bandLimit(b: BandId, hud: HudTable | null): { text: string; value: number | null } {
  if (!hud) return { text: NA, value: null };
  if (b === 'gt100') {
    const med = isNum(hud.metro?.median) ? hud.metro.median : null;
    return { text: med == null ? NA : `above ${money(med)}`, value: med };
  }
  const v = bandLimit4p(hud, b);
  return { text: v == null ? NA : `up to ${money(v)}`, value: v };
}

/** Households, >30% and >50% summed over the bands at or below `upTo`; null when every part is missing. */
export function cumulative(p: PlaceMeasures, upTo: BandId): { hh: number | null; b30: number | null; b50: number | null; uncertain: boolean } {
  const ids = BAND_IDS.slice(0, BAND_IDS.indexOf(upTo) + 1);
  const sum = (k: 'hh' | 'burden30' | 'burden50') => {
    const vals = ids.map((id) => p.bands[id]?.[k]).filter(isNum);
    return vals.length ? vals.reduce((s, v) => s + v, 0) : null;
  };
  // A margin of error above the estimate makes the count uncertain; a zero count has nothing to be uncertain about.
  const uncertain = ids.some((id) => isNum(p.bands[id]?.moe) && isNum(p.bands[id]?.hh) && (p.bands[id].hh as number) > 0 && (p.bands[id].moe as number) > (p.bands[id].hh as number));
  return { hh: sum('hh'), b30: sum('burden30'), b50: sum('burden50'), uncertain };
}

/** The count in the sentence is cumulative (every band up to `band`), so it reads "at or below" the band's cap. */
const CAP: Record<BandId, string> = { le30: '30%', b30_50: '50%', b50_80: '80%', b80_100: '100%', gt100: 'any share' };

export default function Affordability({ place, hud, band = 'b30_50', targetNote }: { place: PlaceMeasures; hud: HudTable | null; band?: BandId; targetNote?: string | null }) {
  const c = cumulative(place, band);
  const fy = hud?.metro?.fy ?? 2026;
  const sentence =
    place.renter_hh == null && c.hh == null ? (
      <>Renter households by income band: {NA} for this tract.</>
    ) : (
      <>
        <b className="text-slate-900">{isNum(place.renter_hh) ? int(place.renter_hh) : NA}</b> renter households live here. {c.hh == null ? NA : <b className="text-slate-900">{int(c.hh)}</b>} earn at or below {CAP[band]} of area median income
        {c.uncertain && <span className="text-slate-600"> (uncertain: the margin of error exceeds the estimate)</span>}; {c.b30 == null ? NA : <b className="text-slate-900">{int(c.b30)}</b>} of them pay more than 30% of income on rent and {c.b50 == null ? NA : <b className="text-slate-900">{int(c.b50)}</b>} pay more than half.
        {targetNote ? ` ${targetNote}` : ''}
      </>
    );
  return (
    <Block title="Affordability by income band" sub="Who rents here, by share of area median income (AMI), and who is cost-burdened." sentence={sentence} source={<>Source · HUD CHAS 2018–22 Table 8 (renter households by HAMFI band, cost burden over 30% and 50% of income) · HUD FY{fy} income limits, Pittsburgh HMFA, 4-person household · Counts are survey estimates with the margin of error shown.</>}>
      <Table
        caption="Renter households by AMI band"
        head={['Band', `4-person limit (FY${fy})`, 'Households', '> 30%', '> 50%']}
        rows={BAND_IDS.map((id) => {
          const b = place.bands[id];
          const lim = bandLimit(id, hud);
          return {
            key: id,
            strong: id === band,
            cells: [BAND_LABEL[id], <span className="text-slate-700">{lim.text}</span>, <WithMoe v={b?.hh ?? null} moe={b?.moe} />, <WithMoe v={b?.burden30 ?? null} />, <WithMoe v={b?.burden50 ?? null} />],
          };
        })}
      />
    </Block>
  );
}
