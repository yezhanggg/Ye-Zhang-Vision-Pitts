// Block C: market rent and home values. Asking rent from listings against what residents pay (census, includes
// subsidized homes), the ZIP's Small Area Fair Market Rent, home values here and next door, sales when the pipeline
// carries them; then the watch-list flag and the market-pressure line (the same data PressureCard reads).
import { isNum } from '../../lib/format';
import { PRESSURE_HOW, RENT_CAVEAT, directionWord } from '../../lib/copy';
import type { HudTable, PlaceMeasures } from '../../lib/place/types';
import type { TractProps } from '../../lib/types';
import { ConfChip, InfoTip } from '../primitives';
import { Block, Facts, NA, int, money, na } from './shared';

/** Neighbors' market against this one, in words, from the pressure lens (0–1 market scale). */
export const pressureWord = (p: number) => (p > 0.25 ? 'much stronger' : p > 0.08 ? 'stronger' : p < -0.25 ? 'much weaker' : p < -0.08 ? 'weaker' : 'about the same');

export default function Market({ place, t, hud }: { place: PlaceMeasures; t: TractProps; hud: HudTable | null }) {
  const m = place.market;
  const fy = hud?.metro?.fy ?? 2026;
  const fmr2 = hud?.metro?.fmr?.[2] ?? null;
  const askingShown = isNum(m.asking_2br) && m.asking_conf !== 'low';
  const sentence = (
    <>
      {askingShown ? (
        <>
          Listings ask <b className="text-slate-900">{money(m.asking_2br as number)}</b> for a 2-bedroom ({isNum(m.asking_n) ? `${int(m.asking_n)} listings` : 'listing count not available'});
        </>
      ) : (
        <>2-bedroom asking rent: {isNum(m.asking_2br) ? 'shown below at low confidence' : NA} (fewer than 20 listings);</>
      )}{' '}
      residents pay a median <b className="text-slate-900">{na(m.acs_rent, money)}</b> (census, includes subsidized homes). Fair Market Rent for a 2-bedroom in ZIP {m.zip ?? '—'}: <b className="text-slate-900">{na(m.safmr_2br, money)}</b>. Median home value <b className="text-slate-900">{na(m.value_acs, money)}</b>; next door <b className="text-slate-900">{na(m.value_nbr_acs, money)}</b>.
    </>
  );
  const p = t.market_pressure;
  return (
    <Block
      title="Market rent and home values"
      sub="What the market asks, what residents pay, and what HUD would pay."
      sentence={sentence}
      source={
        <>
          Source · Dewey listings 2025–26 (median 2BR asking rent, distinct units; market-rate skew, information only) · ACS 2020–24 B25064 median gross rent and B25077 home value, with margins of error · HUD FY{fy} Small Area FMR by ZIP{fmr2 ? ` (metro 2BR FMR ${money(fmr2)})` : ''} · Neighbors = tracts sharing a border · Reinvestment Fund MVA 2021 for the market type.
        </>
      }
    >
      <Facts
        items={[
          { key: 'ask', k: <>2BR asking rent (listings) {m.asking_conf && <ConfChip conf={m.asking_conf} />}</>, v: isNum(m.asking_2br) ? `${money(m.asking_2br)}${isNum(m.asking_n) ? ` · ${int(m.asking_n)} units` : ''}` : NA },
          { key: 'acs', k: 'Median rent paid (census)', v: isNum(m.acs_rent) ? `${money(m.acs_rent)}${isNum(m.acs_rent_moe) ? ` ±${int(m.acs_rent_moe)}` : ''}` : NA },
          { key: 'safmr', k: `2BR Small Area FMR, ZIP ${m.zip ?? '—'} (FY${fy})`, v: na(m.safmr_2br, money) },
          { key: 'value', k: 'Median home value (census)', v: isNum(m.value_acs) ? `${money(m.value_acs)}${isNum(m.value_acs_moe) ? ` ±${int(m.value_acs_moe)}` : ''}` : NA },
          { key: 'value_nbr', k: 'Median home value, neighboring tracts', v: na(m.value_nbr_acs, money) },
          { key: 'sales', k: 'Median sale price since 2023', v: isNum(m.sale_median) ? `${money(m.sale_median)}${isNum(m.sale_n) ? ` · ${int(m.sale_n)} sales` : ''}` : NA },
          { key: 'sales_nbr', k: 'Median sale price, neighboring tracts', v: isNum(m.sale_nbr_median) ? `${money(m.sale_nbr_median)}${isNum(m.sale_nbr_n) ? ` · ${int(m.sale_nbr_n)} sales` : ''}` : NA },
          { key: 'stock', k: 'Homes in 2–4 unit buildings · vacant homes', v: `${na(place.stock.units_2_4_share, (v) => `${Math.round(v * 100)}%`)} · ${na(place.stock.vacancy_share, (v) => `${Math.round(v * 100)}%`)}` },
        ]}
      />
      <div className={`mt-2 rounded-xl px-3 py-2 ring-1 ${t.watch_list ? 'bg-rose-50 ring-rose-200' : 'bg-white ring-stone-200/80'}`}>
        <div className="flex items-start justify-between gap-2 text-small text-slate-800">
          <span>
            {isNum(p) ? (
              <>
                Neighboring tracts’ markets are <b>{pressureWord(p)}</b> {pressureWord(p) === 'about the same' ? 'as' : 'than'} this one.{' '}
              </>
            ) : (
              <>Market pressure from neighbors: {NA}. </>
            )}
            Own market: <b>{t.mva21 ? `type ${t.mva21}` : 'unclassified'}</b>, {directionWord(t.market_direction)} since 2016.
          </span>
          <InfoTip label="About market pressure">{PRESSURE_HOW}</InfoTip>
        </div>
        {t.watch_list ? (
          <div className="mt-1.5 rounded-lg bg-white/80 px-2.5 py-1.5 text-small font-semibold text-rose-800 ring-1 ring-rose-200">Watch list: high need with a rising market. Adding market-rate homes here without protections is most likely to displace current renters.</div>
        ) : (
          <div className="mt-1 text-caption text-slate-600">Not on the watch list (that needs high need plus a rising market).</div>
        )}
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-caption">
          <span className="text-slate-500">{RENT_CAVEAT}</span>
        </div>
      </div>
    </Block>
  );
}
