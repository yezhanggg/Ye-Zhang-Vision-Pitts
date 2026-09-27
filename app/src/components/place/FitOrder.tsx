// "Fit order under this stance": the weighted order of the five housing types (lib/scoring.scoreTract under the
// current weights) as ranks and words. The AnswerCard is its head: the type that fits best, the three checks and
// the reasoning of record. The bars (each factor's share, the gaps between the top two) sit under a disclosure.
// No score is printed; the points live in the hover tooltips. No AI reading since update 3 (lib/explainRemote.ts).
import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { fitText, joinAnd } from '../../lib/analysis/copy';
import { guardChips, typeLabel, whySentence, type Rationale } from '../../lib/analysis/rationale';
import { SCORE_HOW, UI } from '../../lib/copy';
import { typologyById } from '../../lib/data';
import { stabilityFor, type TractResult } from '../../lib/derived';
import type { TractProps, Weights } from '../../lib/types';
import ContributionBars from '../analysis/ContributionBars';
import GapBars from '../analysis/GapBars';
import GuardChips from '../analysis/GuardChips';
import WhyBlock from '../analysis/WhyBlock';
import { Explainer, InfoTip, SectionTitle, ValuesBadge, readableColor } from '../primitives';
import TypologyRankList from '../TypologyRankList';

/** The head of the fit order: the best-fitting type (a rank, no score), the checks and the reasoning of record. */
export function AnswerCard({ t, r, ra, weights }: { t: TractProps; r: TractResult; ra: Rationale; weights: Weights }) {
  const stability = useMemo(() => stabilityFor(t.GEOID, weights), [t.GEOID, weights]);
  const top = r.top ? typologyById.get(r.top) : null;
  const chips = useMemo(() => guardChips(ra), [ra]);
  if (!top || r.topScore == null) {
    return (
      <div className="rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200">
        <div className="flex items-center justify-between gap-2">
          <div className="text-small font-medium text-slate-700">{UI.bestMatch}</div>
          <ValuesBadge label="Under your stance" />
        </div>
        <div className="mt-1 font-display text-title font-bold text-slate-900">{ra.state === 'unranked' ? 'Not ranked' : 'No score'}</div>
        <p className="mt-2 text-body text-slate-800">{whySentence(t, ra)}</p>
        <GuardChips chips={chips} className="mt-3" />
      </div>
    );
  }
  const tie = ra.state === 'tie';
  const shown = fitText(r.topScore);
  const title = tie ? joinAnd(ra.tied.map((k) => typeLabel(k))) : top.label;
  return (
    <div className="rounded-2xl p-4 ring-1" style={{ background: `${top.color}14`, boxShadow: `inset 0 0 0 1px ${top.color}40` }}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-small font-medium text-slate-700">{UI.bestMatch}</div>
        <ValuesBadge label="Under your stance" />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tie ? ra.tied.join('+') : top.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
          <div className={`font-display font-bold ${tie ? 'text-title' : 'text-display'}`} style={{ color: readableColor(top.color) }}>
            {title}
          </div>
          <div className="mt-0.5 text-small text-slate-700">
            {!tie && <>{top.long} · </>}
            <b className={ra.need.low ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-900'} title={ra.need.low ? 'Greyed: too few low-income renter households for this match to mean much' : undefined}>
              {shown}
            </b>
          </div>
        </motion.div>
      </AnimatePresence>
      <GuardChips chips={chips} className="mt-3" />
      <WhyBlock t={t} ra={ra} weights={weights} stability={stability} className="mt-3" />
      <p className="mt-2 text-caption text-slate-600">{UI.whyAuto}.</p>
    </div>
  );
}

/**
 * The fit order. `expanded` (the page without place measures, the layout of update 2): the bars and the ranking as
 * open sections. Otherwise (block G): the ranking as ranks and words, the bars folded under a disclosure.
 */
export default function FitOrder({ t, r, ra, weights, expanded }: { t: TractProps; r: TractResult; ra: Rationale; weights: Weights; expanded?: boolean }) {
  if (!t.residential) {
    return <div className="hatch rounded-2xl px-4 py-3 text-body text-slate-700 ring-1 ring-stone-200">{whySentence(t, ra)} Park, river, campus or stadium land usually reads this way.</div>;
  }
  const bars = r.top && (
    <>
      <section>
        <SectionTitle right={<InfoTip label="How the fit is calculated" side="bottom">{SCORE_HOW}</InfoTip>} sub="Each bar is a type’s fit under your stance, split into each factor’s share. Longer is better; hover a segment for its points.">
          {UI.howTypesCompare}
        </SectionTitle>
        <ContributionBars r={r} ra={ra} />
      </section>
      <GapBars r={r} ra={ra} />
    </>
  );
  if (expanded) {
    return (
      <>
        <AnswerCard t={t} r={r} ra={ra} weights={weights} />
        {bars}
        {r.top && (
          <section>
            <SectionTitle sub="Best fit first. Each line names what separates the type, or what helped it and held it back.">Ranking</SectionTitle>
            <TypologyRankList result={r} ra={ra} />
          </section>
        )}
      </>
    );
  }
  return (
    <div className="space-y-3">
      <AnswerCard t={t} r={r} ra={ra} weights={weights} />
      {r.top && (
        <div>
          <div className="mb-1.5 text-small text-slate-600">Best fit first. Each line names what separates the type, or what helped it and held it back.</div>
          <TypologyRankList result={r} ra={ra} />
        </div>
      )}
      {bars && (
        <Explainer
          tone="card"
          title={
            <span>
              <span className="block">{UI.howTypesCompare}</span>
              <span className="block text-caption font-normal text-slate-600">Each factor’s share of the fit, and what separates the top two</span>
            </span>
          }
        >
          <div className="space-y-4 pt-1">{bars}</div>
        </Explainer>
      )}
    </div>
  );
}
