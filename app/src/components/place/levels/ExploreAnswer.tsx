// Explore's place card online: the answer Analysis > Place gives for this tract (the types that pass your screens at
// your income level and residents, ordered by the weights and renter demand: lib/policy/compose, exactly as
// PlaceStudio runs it), so Explore and Place never name different types. Online only: loaded on demand.
import type { ComponentType } from 'react';
import { hud as hudTable, placeFor } from '../../../lib/place/data';
import { isSeniorAge, LEVEL_LABEL } from '../../../lib/place/plan';
import { usePlan } from '../../../lib/place/planStore';
import type { Typology } from '../../../lib/place/types';
import { useDemandScores } from '../../../lib/place/useDemandScores';
import { composeRec, screensWords } from '../../../lib/policy/compose';
import { usePolicy } from '../../../lib/policy/store';

export default function ExploreAnswer({ geoid, fitOrder, card: Card }: { geoid: string; fitOrder?: Typology[]; card: ComponentType<{ types: Typology[]; words: string }> }) {
  const level = usePlan((s) => s.level);
  const senior = usePlan((s) => isSeniorAge(s.age));
  const policy = usePolicy();
  const scores = useDemandScores();
  const p = placeFor(geoid);
  const rec = p && hudTable ? composeRec(p, hudTable, { level, senior, fitOrder, demand: scores?.get(geoid) }, policy).rec : null;
  return <Card types={rec?.types.map((x) => x.typology) ?? []} words={`${screensWords(policy)} · ${LEVEL_LABEL[level]}`} />;
}
