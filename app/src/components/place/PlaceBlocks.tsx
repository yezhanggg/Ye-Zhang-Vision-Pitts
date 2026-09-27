// The place page for one tract when place measures exist: blocks A–G in reading order (plan §4). Each block is one
// sentence, a small table and a grey source line. The rules (block G) come from lib/place/recommend; the fit order
// is lib/scoring under the current weights, and "Under each stance" re-scores the place under each stance's
// published weights and runs the rules under each.
import { useMemo } from 'react';
import { APP_STANCES } from '../../lib/analysis/copy';
import { closeMargin, resultWith, tieMargin, type Rationale } from '../../lib/analysis/rationale';
import { scoring, typologyById } from '../../lib/data';
import type { TractResult } from '../../lib/derived';
import { underEachStance } from '../../lib/place/recommend';
import type { HudTable, PlaceMeasures, Stance, Typology } from '../../lib/place/types';
import { matchPreset, presetWeights, useApp } from '../../lib/store';
import { topMargin } from '../../lib/scoring';
import type { TractProps, Weights } from '../../lib/types';
import Affordability from './Affordability';
import Flood from './Flood';
import Market from './Market';
import NeedsInput from './NeedsInput';
import Recommendation from './Recommendation';
import Rules, { useRules } from './Rules';
import type { StanceRow } from './StanceTable';
import Tenants from './Tenants';
import Transit from './Transit';
import ZoningPrograms from './ZoningPrograms';

/** The fit order under each stance's published weights: the top, and a close-call word when the top two are close. */
export function fitUnderStances(t: TractProps): Record<string, { result: TractResult; top: string | null; closeCall: string | null }> {
  const out: Record<string, { result: TractResult; top: string | null; closeCall: string | null }> = {};
  for (const s of APP_STANCES) {
    const result = resultWith(t, presetWeights(s));
    const m = topMargin(result.scores);
    const second = result.ranking[1] ? typologyById.get(result.ranking[1])?.label ?? result.ranking[1] : null;
    const closeCall = !result.top || m == null ? null : m < tieMargin() ? 'tie' : m < closeMargin() && second ? `close call with ${second}` : null;
    out[s] = { result, top: result.top, closeCall };
  }
  return out;
}

const WORD: Record<'agrees' | 'close call' | 'differs' | 'no product', string | null> = { agrees: null, 'close call': 'rule and fit order: close call', differs: 'rule and fit order differ', 'no product': null };

export default function PlaceBlocks({ t, r, ra, weights, place, hud }: { t: TractProps; r: TractResult; ra: Rationale; weights: Weights; place: PlaceMeasures; hud: HudTable | null }) {
  const applyPreset = useApp((s) => s.applyPreset);
  const current = matchPreset(weights);
  const fits = useMemo(() => fitUnderStances(t), [t]);
  const fitOrders = useMemo(() => Object.fromEntries(APP_STANCES.map((s) => [s, fits[s].result.ranking])) as Record<Stance, Typology[]>, [fits]);
  const rules = useRules(place, r, current, fitOrders, undefined, hud);
  const stanceRows: StanceRow[] = useMemo(() => {
    const rows = hud ? underEachStance(place, hud, fitOrders) : [];
    return APP_STANCES.map((s) => {
      const f = fits[s];
      const row = rows.find((x) => x.stance === s);
      return {
        stance: s,
        label: scoring.presets.find((p) => p.id === s)?.label ?? s,
        lead: row?.lead ?? 'HUD income limits not available: the rules do not run.',
        fitTop: f.top ? typologyById.get(f.top)?.label ?? f.top : null,
        fitColor: f.top ? typologyById.get(f.top)?.color ?? null : null,
        closeCall: [row ? WORD[row.word] : null, f.closeCall].filter(Boolean).join(' · ') || null,
      };
    });
  }, [fits, fitOrders, place, hud]);
  return (
    <>
      <Affordability place={place} hud={hud} band={rules.targetBand ?? 'b30_50'} targetNote={rules.targetNote} />
      <Tenants place={place} t={t} band={rules.typeBand ?? 'b30_50'} />
      <Market place={place} t={t} hud={hud} />
      <Transit place={place} />
      <Flood place={place} t={t} />
      <ZoningPrograms place={place} />
      <Recommendation t={t} r={r} ra={ra} weights={weights} rules={<Rules rules={rules} />} needs={<NeedsInput place={place} hud={hud} defaultBand={rules.targetBand === 'le30' ? 30 : rules.targetBand === 'b50_80' ? 80 : 50} />} stanceRows={stanceRows} currentStance={current} onPickStance={(s) => applyPreset(s)} />
    </>
  );
}
