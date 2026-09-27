// Block E: flood, one word from the FEMA flood-zone share (none / minor / moderate / high), then the terrain screen
// (HAND) as a second, weaker reading. The scored factor (terrain) is untouched; this block only reads it out.
import { isNum } from '../../lib/format';
import type { PlaceMeasures } from '../../lib/place/types';
import type { Conf, TractProps } from '../../lib/types';
import { ConfChip } from '../primitives';
import { Block, Facts, NA, na, pct } from './shared';

export type FloodWord = 'none' | 'minor' | 'moderate' | 'high';
/** The FEMA share in one word: none (0%), minor (< 5%), moderate (5–15%), high (> 15%). */
export const floodWord = (femaPct: number): FloodWord => (femaPct <= 0 ? 'none' : femaPct < 5 ? 'minor' : femaPct <= 15 ? 'moderate' : 'high');
const WORD_TEXT: Record<FloodWord, string> = { none: 'None', minor: 'Minor', moderate: 'Moderate', high: 'High' };
const WORD_TONE: Record<FloodWord, string> = { none: 'bg-emerald-50 text-emerald-800 ring-emerald-200', minor: 'bg-emerald-50 text-emerald-800 ring-emerald-200', moderate: 'bg-amber-50 text-amber-900 ring-amber-200', high: 'bg-rose-50 text-rose-900 ring-rose-200' };

export default function Flood({ place, t }: { place: PlaceMeasures; t: TractProps }) {
  const f = place.flood;
  const hand = isNum(f.hand_pct) ? f.hand_pct : isNum(t.flood_share_pct) ? t.flood_share_pct : null;
  const conf = (t.flood_exposure_conf as Conf | null) ?? null;
  const word = isNum(f.fema_sfha_pct) ? floodWord(f.fema_sfha_pct) : null;
  const sentence = (
    <>
      {word ? (
        <>
          <span className={`mr-1.5 inline-block rounded-full px-2 py-px text-caption font-semibold ring-1 ${WORD_TONE[word]}`}>{WORD_TEXT[word]}</span>
          <b className="text-slate-900">{pct(f.fema_sfha_pct as number, 1)}</b> of the land is in a FEMA special flood hazard area{f.fema_zone ? ` (zone ${f.fema_zone})` : ''}.
        </>
      ) : (
        <>FEMA flood-zone share: {NA} for this tract.</>
      )}{' '}
      {hand != null ? (
        <>
          Terrain screen reads <b className="text-slate-900">{pct(hand, 1)}</b> low-lying ({conf ?? 'medium'} confidence{hand > 50 ? '; a reading above 50% is not plausible for a built-up tract' : ''}).
        </>
      ) : (
        <>Terrain screen: {NA}.</>
      )}
    </>
  );
  return (
    <Block title="Flood" sub="The FEMA flood zone is the headline; the terrain screen is a second, weaker reading." sentence={sentence} source={<>Source · FEMA National Flood Hazard Layer (special flood hazard area share of tract land) · Terrain screen: height above nearest drainage (HAND) on USGS 3DEP elevation, the factor the score uses · Neither models stormwater; check the site before citing.</>}>
      <Facts
        items={[
          { key: 'fema', k: 'FEMA special flood hazard area', v: isNum(f.fema_sfha_pct) ? `${pct(f.fema_sfha_pct, 1)}${f.fema_zone ? ` · zone ${f.fema_zone}` : ''}` : NA },
          { key: 'hand', k: <>Terrain screen (low-lying land) {conf && <ConfChip conf={conf} />}</>, v: na(hand, (v) => pct(v, 1)) },
        ]}
      />
    </Block>
  );
}
