// The project's answers at every level and on each side of Compare places, made to be read at a glance: the verdict
// in one line, four takeaways (zoning, size, capital, tax credits or equity), the review (lib/review: every finding
// worst first, the fixes to apply, a second opinion on a click), the fit with the people around it as bars, then the
// capital stack (CapitalCard), the tax credit score, what the person studies and, on a lot, its sun. All recomputed
// on every change of the inputs. Online only: loaded on demand.
import { AlertTriangle, CheckCircle2, Info, Sparkles, XCircle } from 'lucide-react';
import { pointsOf } from '../../../lib/finder/rank';
import { useEffect, useMemo, type ReactNode } from 'react';
import { tractLabel } from '../../../lib/data';
import { lotName } from '../../../lib/explore/parcelShadow';
import { placeExtra } from '../../../lib/export/builders/place';
import { cx } from '../../../lib/format';
import { fmtShare } from '../../../lib/place/format';
import { LEVEL_LABEL } from '../../../lib/place/plan';
import type { HudTable, PlaceMeasures } from '../../../lib/place/types';
import type { PolicyContext } from '../../../lib/policy/applies';
import type { Composed } from '../../../lib/policy/compose';
import type { PolicyState } from '../../../lib/policy/store';
import { DEV_TYPE_LABEL, isHousing, type DevType } from '../../../lib/project/devType';
import { PATH_LABEL } from '../../../lib/project/paths';
import { capitalReport, type CapitalReportInput } from '../../../lib/project/report';
import { useSide } from '../../../lib/project/side';
import { MIX_LEVEL_LABEL, MIX_LEVELS, type SiteLot } from '../../../lib/project/store';
import { reviewFacts, useSecondOpinion } from '../../../lib/review/ai';
import { captureFit, mixFit, mixWords, type FitTone } from '../../../lib/review/fit';
import { TONE_RANK, verdictWord, type Review, type Scope, type Verdict } from '../../../lib/review/review';
import { districtName } from '../../../lib/zoning/capacity';
import { VERDICT_WORD } from '../../../lib/zoning/check';
import type { TractProps } from '../../../lib/types';
import { Explainer } from '../../primitives';
import TaxCreditSheet from '../TaxCreditSheet';
import KeyDates from '../project/KeyDates';
import { usdShort } from '../project/summary';
import type { ProjectModel } from '../project/useProjectModel';
import CapitalCard, { capitalTile } from './CapitalCard';
import { lotSunHours, useLotManifest } from './lotSun';
import { StudyCard } from './Policies';
import { applyFix, useProjectRead, type ProjectRead } from './useReview';

export type Look = 'good' | 'warn' | 'bad' | 'plain';
const TILE: Record<Look, string> = { good: 'bg-emerald-50 ring-emerald-200', warn: 'bg-amber-50 ring-amber-200', bad: 'bg-rose-50 ring-rose-200', plain: 'bg-stone-50 ring-stone-200' };
const VALUE: Record<Look, string> = { good: 'text-emerald-700', warn: 'text-amber-900', bad: 'text-rose-700', plain: 'text-slate-900' };
const ICON: Record<Look, ReactNode> = {
  good: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />,
  warn: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />,
  bad: <XCircle className="h-4 w-4 shrink-0 text-rose-700" aria-hidden />,
  plain: <Info className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />,
};
const TONE_ICON: Record<FitTone, ReactNode> = {
  ok: <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-label="Meets it" />,
  warn: <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-label="Watch" />,
  stop: <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" aria-label="Does not meet it" />,
  info: <Info className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-label="To know" />,
};
export const VERDICT_LOOK: Record<Verdict, Look> = { works: 'good', changes: 'warn', no: 'bad', unknown: 'plain' };
const ZONING_LOOK = { yes: 'good', hearing: 'warn', no: 'bad', unknown: 'plain' } as const;
const ZONING_WORD = { yes: 'Allowed by right', hearing: 'Needs a hearing', no: 'Not allowed as is', unknown: 'Check the code' } as const;
const CARD = 'rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200';
const SUB = 'text-caption font-semibold uppercase tracking-wide text-slate-500';
const YOURS = '#7c3aed';
const AREA = '#64748b';

export function Tile({ label, value, sub, look, children }: { label: string; value: string; sub: string; look: Look; children?: ReactNode }) {
  return (
    <div className={cx('rounded-xl px-3 py-2.5 ring-1', TILE[look])}>
      <div className="flex items-center gap-1.5">
        {ICON[look]}
        <span className={SUB}>{label}</span>
      </div>
      <div className={cx('mt-0.5 text-lead font-semibold leading-tight tnum', VALUE[look])}>{value}</div>
      <div className="text-caption leading-snug text-slate-600">{sub}</div>
      {children}
    </div>
  );
}

/** A thin bar: `share` of it filled. */
const Bar = ({ share, color }: { share: number; color: string }) => (
  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-200">
    <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(1, share)) * 100}%`, background: color }} />
  </div>
);

export interface Takeaways {
  zoning: { value: string; sub: string; look: Look };
  size: { label: string; value: string; sub: string; look: Look; share: number | null };
  capital: { value: string; sub: string; look: Look };
  fourth: { label: string; value: string; sub: string; look: Look };
}

/** The four takeaways, shared by the panel and Compare's paired rows. */
export function takeaways(read: ProjectRead, m: ProjectModel, devType: DevType, scope: Scope): Takeaways {
  const { check, run, typical } = read;
  const housing = isHousing(devType);
  const units = m.mix.homes;
  const cap = check.maxUnits;
  const fit = check.fit;
  // The most units the lot takes: allowed by right, and that fit at these stories.
  const most = cap == null ? null : Math.min(cap, fit?.units ?? cap);
  const sr = run.result;
  let capital: Takeaways['capital'] = { value: 'Not tested', sub: 'Commercial: zoning check only', look: 'plain' };
  if (housing && units > 0) capital = capitalTile(run, m.args.inputs.dscr);
  const s = m.sheet.score;
  const market = m.branch === 'market';
  const credMost = pointsOf(s).most;
  // The credit equity counts only once the credits are won: short of PHFA's minimum, "no gap" is not yet a green.
  if (run.credits && !market && scope !== 'zip' && s.threshold != null && s.short > 0 && sr.gap <= 0.5 && capital.look === 'good')
    capital = { value: 'No gap if credits are won', sub: credMost < s.threshold ? `scores at most ${credMost} of ${s.threshold}` : `needs ${s.short} more points`, look: credMost < s.threshold ? 'bad' : 'warn' };
  const where = typical ? `on a ${typical.lotSqft.toLocaleString('en-US')} sq ft ${check.district ?? ''} lot${typical.byRight && typical.byRight.of > 0 ? ` · ${typical.byRight.unit === 'lots' ? `${fmtShare(typical.byRight.yes / typical.byRight.of)} of lots zoned for it` : `${typical.byRight.yes} of ${typical.byRight.of} tracts`}` : ''}` : check.district ? `${check.district} · ${districtName(check.district)}` : 'no district read';
  const fourth: Takeaways['fourth'] =
    housing && !market && scope !== 'zip'
      ? { label: 'Tax credits', value: `${s.total} of ${s.max}`, sub: s.threshold == null ? 'self-score' : s.short > 0 ? `needs ${s.threshold} · ${credMost < s.threshold ? `${credMost} at best` : `up to ${credMost}`}` : `meets ${s.threshold}`, look: s.threshold == null || s.short <= 0 ? 'good' : credMost < s.threshold ? 'bad' : 'warn' }
      : housing
        ? run.credits
          ? { label: 'Funding gap', value: sr.gap > 0.5 ? usdShort(sr.gap) : 'None', sub: `of ${usdShort(sr.total)} total cost`, look: 'plain' }
          : { label: 'Developer equity', value: usdShort(Math.max(0, sr.developerEquity)), sub: `of ${usdShort(sr.total)} total cost`, look: 'plain' }
        : { label: 'Floor area', value: `${(m.base.project.commercialSf ?? 0).toLocaleString('en-US')} sq ft`, sub: 'commercial', look: 'plain' };
  return {
    zoning: { value: ZONING_WORD[check.verdict], sub: where, look: ZONING_LOOK[check.verdict] },
    size: housing
      ? { label: DEV_TYPE_LABEL[devType], value: `${units} unit${units === 1 ? '' : 's'}`, sub: cap == null ? 'district not computed' : `up to ${cap} by right${fit && fit.units < cap ? ` · ${fit.units} fit` : typical ? ' on that lot' : ''}`, look: most == null ? 'plain' : units <= most ? 'good' : 'bad', share: most != null && most > 0 ? units / most : null }
      : { label: 'Commercial', value: `${(m.base.project.commercialSf ?? 0).toLocaleString('en-US')} sq ft`, sub: 'floor area', look: 'plain', share: null },
    capital,
    fourth,
  };
}

export function Takeaway4({ t }: { t: Takeaways }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Tile label="Zoning" value={t.zoning.value} sub={t.zoning.sub} look={t.zoning.look} />
      <Tile label={t.size.label} value={t.size.value} sub={t.size.sub} look={t.size.look}>
        {t.size.share != null && <Bar share={t.size.share} color={t.size.look === 'bad' ? '#e11d48' : '#059669'} />}
      </Tile>
      <Tile label="Capital" value={t.capital.value} sub={t.capital.sub} look={t.capital.look} />
      <Tile label={t.fourth.label} value={t.fourth.value} sub={t.fourth.sub} look={t.fourth.look} />
    </div>
  );
}

export function VerdictLine({ review }: { review: Review }) {
  const look = VERDICT_LOOK[review.verdict];
  return (
    <div className={cx('rounded-xl px-3 py-2.5 ring-1', TILE[look])} data-verdict={review.verdict}>
      <div className="flex items-center gap-1.5">
        {ICON[look]}
        <span className={cx('text-lead font-semibold leading-tight', VALUE[look])}>{verdictWord(review.verdict)}</span>
      </div>
      <p className="mt-0.5 text-small leading-snug text-slate-800">{review.line}</p>
    </div>
  );
}

export function SecondOpinion({ facts, question }: { facts: string; question?: string }) {
  const { state, ask } = useSecondOpinion(facts, question);
  return (
    <div className="mt-2 border-t border-stone-100 pt-2" data-second-opinion>
      {state.status === 'ok' ? (
        <div>
          <div className="flex items-center gap-1.5 text-caption font-semibold text-violet-700">
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
            Second opinion (Claude){state.checked ? '' : ' · some numbers not matched to the findings'}
          </div>
          <p className="mt-1 text-small leading-snug text-slate-800" style={{ whiteSpace: 'pre-line' }}>{state.text}</p>
        </div>
      ) : state.status === 'off' ? (
        <p className="text-caption leading-snug text-slate-600">{state.why}</p>
      ) : (
        <button type="button" onClick={ask} disabled={state.status === 'loading'} className="flex items-center gap-1.5 text-caption font-medium text-violet-700 hover:text-violet-800">
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
          {state.status === 'loading' ? 'Reading the findings…' : 'Ask for a second opinion (AI)'}
        </button>
      )}
    </div>
  );
}

/** Every finding, worst first: the ones to act on open, the rest folded; the fixes with Apply. */
export function ReviewCard({ review, onApply, facts }: { review: Review; onApply: (i: number) => void; facts: string | null }) {
  const sorted = [...review.findings].sort((a, b) => TONE_RANK.indexOf(a.tone) - TONE_RANK.indexOf(b.tone));
  const open = sorted.filter((f) => f.tone === 'stop' || f.tone === 'warn');
  const rest = sorted.filter((f) => f.tone !== 'stop' && f.tone !== 'warn');
  const row = (f: (typeof sorted)[number]) => (
    <li key={f.key} className="flex items-start gap-2 py-1.5">
      {TONE_ICON[f.tone]}
      <span className="min-w-0 flex-1 text-small leading-snug text-slate-800">
        <b className="font-semibold text-slate-900">{f.title}.</b> {f.text}
      </span>
    </li>
  );
  return (
    <section className={CARD} data-review>
      <h3 className="text-small font-semibold text-slate-900">Review</h3>
      {open.length > 0 ? <ul className="mt-1 divide-y divide-stone-100">{open.map(row)}</ul> : <p className="mt-1 text-small text-slate-700">Nothing to fix on these inputs.</p>}
      {review.fixes.length > 0 && (
        <div className="mt-2">
          <div className={SUB}>Try</div>
          <ul className="mt-1 space-y-1">
            {review.fixes.map((f, i) => (
              <li key={f.key} className="flex items-center justify-between gap-2 text-small text-slate-800">
                <span className="min-w-0">{f.label}</span>
                {f.action && (
                  <button type="button" onClick={() => onApply(i)} className="shrink-0 text-caption font-medium text-violet-700 hover:text-violet-800">
                    Apply
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {rest.length > 0 && (
        <div className="mt-2">
          <Explainer title={`${rest.length} more checks`}>
            <ul className="divide-y divide-stone-100">{rest.map(row)}</ul>
          </Explainer>
        </div>
      )}
      <p className="mt-1 text-caption leading-snug text-slate-500">A reading of the code and public data, not a zoning determination or a market study.</p>
      {facts && <SecondOpinion facts={facts} />}
    </section>
  );
}

/** Who the homes are for against who lives here: the capture meter and the unit mix against household sizes. */
export function FitCard({ m, scope, hud }: { m: ProjectModel; scope: Scope; hud: HudTable }) {
  const place = scope === 'zip' ? null : m.base.place;
  const demand = scope === 'zip' ? m.base.mixFrom : m.tract;
  const cap = captureFit(m.mix.counts, place, demand, hud);
  const mix = mixFit(m.mix.counts, demand);
  if (!cap && !mix) return null;
  const at = (v: number) => `${Math.min(100, (v / 0.2) * 100)}%`;
  const rate = cap?.rate ?? null;
  return (
    <section className={CARD} data-fit>
      <h3 className="text-small font-semibold text-slate-900">Fit with the area</h3>
      {cap && (
        <div className="mt-2">
          <div className="flex items-baseline justify-between gap-2 text-caption text-slate-700">
            <span>
              Renters who qualify at {cap.level}% AMI: <b className="font-semibold text-slate-900 tnum">{Math.round(cap.qualified - cap.existing).toLocaleString('en-US')}</b>
            </span>
            <span className="font-semibold text-slate-900 tnum">{rate == null ? 'none left' : `${fmtShare(rate)} needed`}</span>
          </div>
          <div className="relative mt-1.5 h-2.5 rounded-full bg-stone-200" role="img" aria-label={`Capture ${rate == null ? 'not computed' : fmtShare(rate)}; 10% is the screen, 15% the top of its range`}>
            <div className="h-full rounded-full" style={{ width: rate == null ? '100%' : at(rate), background: rate == null || rate > 0.15 ? '#e11d48' : rate > 0.1 ? '#d97706' : '#059669' }} />
            <div className="absolute -top-1 w-0.5 rounded bg-slate-900" style={{ left: at(0.1), height: 18 }} />
          </div>
          <p className="mt-1 text-caption leading-snug text-slate-600">{cap.homes} {cap.homes === 1 ? 'unit' : 'units'} with an income limit as a share of the {cap.where === 'tract' ? 'tract' : 'ZIP'}'s qualifying renters; the mark is the 10% screen.</p>
        </div>
      )}
      {mix && (
        <div className="mt-3">
          <div className="flex items-center gap-3 text-caption text-slate-700">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: YOURS }} />
              Your units
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: AREA }} />
              Renter households here
            </span>
          </div>
          <ul className="mt-1 space-y-1.5">
            {(['small', 'two', 'large'] as const).map((g) => (
              <li key={g} className="text-caption text-slate-700" title={`${mixWords(g)}: yours ${fmtShare(mix.proposed[g])}, renters here ${fmtShare(mix.area[g])}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <span>{g === 'small' ? 'Studio or 1-bed · 1–2 people' : g === 'two' ? '2-bed · 3–4 people' : '3+ bed · 5+ people'}</span>
                  <span className="text-slate-900 tnum">
                    {fmtShare(mix.proposed[g])} vs {fmtShare(mix.area[g])}
                  </span>
                </div>
                <Bar share={mix.proposed[g]} color={YOURS} />
                <Bar share={mix.area[g]} color={AREA} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function CreditMeter({ m, t, place }: { m: ProjectModel; t: TractProps; place: PlaceMeasures }) {
  const s = m.sheet.score;
  const at = (v: number) => `${Math.min(100, Math.max(0, (v / (s.max || 1)) * 100))}%`;
  return (
    <section className={CARD} data-credit-meter>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-small font-semibold text-slate-900">Tax credit score</h3>
        <span className="text-small text-slate-700 tnum">
          <b className={cx('font-semibold', s.short > 0 ? 'text-rose-700' : 'text-emerald-700')}>{s.total}</b> of {s.max}
        </span>
      </div>
      <div className="relative mt-2 h-2.5 rounded-full bg-stone-200" role="img" aria-label={`${s.total} of ${s.max} points${s.threshold == null ? '' : `, minimum ${s.threshold}`}`}>
        <div className="h-full rounded-full" style={{ width: at(s.total), background: s.short > 0 ? '#a78bfa' : '#7c3aed' }} />
        {s.threshold != null && <div className="absolute -top-1 w-0.5 rounded bg-slate-900" style={{ left: at(s.threshold), height: 18 }} />}
      </div>
      <p className="mt-1.5 text-caption leading-snug text-slate-600">{s.threshold == null ? 'No minimum on this sheet.' : s.short > 0 ? `${s.short} short of PHFA's ${s.threshold} minimum. Enter what the project commits to on the sheet.` : `Meets PHFA's ${s.threshold} minimum; awards go to the highest scores.`}</p>
      <div className="mt-2">
        <Explainer title="Score sheet">
          <TaxCreditSheet t={t} place={place} plan={m.facts} state={m.sheet} market={false} />
          <div className="mt-3">
            <KeyDates branch={m.branch} />
          </div>
        </Explainer>
      </div>
    </section>
  );
}

/** The lot's sun, and whether the building fits on it (the review's own fit check, so both say the same). */
function SunCard({ lot, fit }: { lot: SiteLot; fit: ProjectRead['check']['fit'] }) {
  const manifest = useLotManifest();
  const hours = lotSunHours(lot, manifest);
  const days = ['June 21', 'September 22', 'December 21'];
  return (
    <section className={CARD} data-sun-card>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-small font-semibold text-slate-900">Open space and sun</h3>
        {fit && <span className={cx('text-small font-semibold', fit.fits ? 'text-emerald-700' : 'text-rose-700')}>{fit.fits ? 'Fits on the lot' : `About ${fit.units} units fit`}</span>}
      </div>
      {hours ? (
        <ul className="mt-2 space-y-1.5">
          {days.map((d, i) => (
            <li key={d} className="text-caption text-slate-700">
              <div className="flex items-baseline justify-between gap-2">
                <span>{d}</span>
                <span className="font-semibold text-slate-900 tnum">{hours[i] == null ? 'not rated' : `${hours[i]!.toFixed(1)} h of sun`}</span>
              </div>
              <Bar share={(hours[i] ?? 0) / 15} color="#f59e0b" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-caption text-slate-600">Sun is read when the lot files load.</p>
      )}
      <p className="mt-1.5 text-caption leading-snug text-slate-500">Hours of direct sun on the whole lot (roof, yard and trees), 2015 surface.</p>
    </section>
  );
}

/** The inputs the second opinion reads, in words. */
export function inputWords(m: ProjectModel, devType: DevType, read: ProjectRead): [string, string][] {
  const i = read.run.inputs;
  return [
    ['Development type', DEV_TYPE_LABEL[devType]],
    ['Units', String(m.mix.homes)],
    ['Stories', m.base.project.stories == null ? 'not set' : String(m.base.project.stories)],
    ['Income level', LEVEL_LABEL[m.base.level]],
    ['Zoning district read', read.check.district ?? 'none'],
    ['Total cost', usdShort(read.run.result.total)],
    ['Loan-to-cost', `${Math.round(i.ltc * 100)}%`],
    ...(read.run.result.saleCounted ? ([['Exit cap', `${+(i.exitCap * 100).toFixed(2)}%`]] as [string, string][]) : []),
  ];
}

const pct = (v: number) => `${+(v * 100).toFixed(2)}%`;

/** The project for the place's PDF and CSV (lib/project/report capitalReport): the site, the inputs as the left panel
 *  sets them, the unit mix, the review and the tax credit score, from the same read the card shows. */
function reportInput(read: ProjectRead, m: ProjectModel, devType: DevType, t: TractProps, lot?: SiteLot): CapitalReportInput {
  const { review, run, check, site } = read;
  const housing = isHousing(devType);
  const p = m.base.project;
  const i = run.inputs;
  const s = m.sheet.score;
  const credits = housing && m.branch !== 'market' && read.scope !== 'zip';
  const lotWords = `${site.lotSqft.toLocaleString('en-US')} sq ft${site.district ? ` · ${site.district}` : ''}`;
  return {
    geoid: t.GEOID,
    name: tractLabel(t),
    lot: lot ? lotName(lot.label) : null,
    site: lot ? `${lotName(lot.label)} · ${lotWords}` : `A typical lot in ${tractLabel(t)} · ${lotWords}`,
    typeLabel: DEV_TYPE_LABEL[devType],
    housing,
    units: m.mix.homes,
    stories: p.stories,
    inputs: [
      ['Development type', DEV_TYPE_LABEL[devType]],
      ...(housing ? ([['Units', String(m.mix.homes)], ['Income level', LEVEL_LABEL[m.base.level]], ['Unit mix', m.mix.mode === 'mine' ? 'your own' : "renters' split (suggested)"], ['Financing', PATH_LABEL[m.branch]]] as [string, string][]) : []),
      ...(devType === 'mixed' || devType === 'commercial' ? ([['Commercial floor area', `${(p.commercialSf ?? 0).toLocaleString('en-US')} sq ft`]] as [string, string][]) : []),
      ['Stories', p.stories == null ? 'not set' : String(p.stories)],
      ['Open space', `${Math.round((p.openShare ?? 0) * 100)}% of the lot`],
      ...(housing ? ([['Land price', usdShort(i.acquisition)], ['Hard cost', `$${Math.round(i.hardPerSf)} a sq ft`], ['Loan-to-cost', pct(i.ltc)], ['Interest rate', pct(i.rate)], ...(run.result.saleCounted ? [['Exit cap rate', pct(i.exitCap)]] : [])] as [string, string][]) : []),
    ],
    mix: MIX_LEVELS.map((l) => ({ level: MIX_LEVEL_LABEL[l], row: m.mix.counts[l] })),
    verdict: verdictWord(review.verdict),
    line: review.line,
    findings: [...review.findings].sort((a, b) => TONE_RANK.indexOf(a.tone) - TONE_RANK.indexOf(b.tone)),
    fixes: review.fixes.map((f) => f.label),
    zoning: { verdict: VERDICT_WORD[check.verdict], district: check.district },
    score: credits ? { total: s.total, max: s.max, threshold: s.threshold, high: s.range.high } : null,
    run,
  };
}

export interface ProjectResultsProps {
  scope: Scope;
  /** The tract (Parcel, Tract); null at the ZIP level. */
  t: TractProps | null;
  place: PlaceMeasures | null;
  hud: HudTable;
  m: ProjectModel;
  devType: DevType;
  lot?: SiteLot;
  zip?: string | null;
  c?: Composed | null;
  ctx?: PolicyContext | null;
  policy?: PolicyState;
  sheet?: string;
  /** Write the place's PDF and CSV project section (the Place tab; not Compare). */
  exportable?: boolean;
  /** A name for the second opinion's facts ("Lot 56-P-285 in Hazelwood", "ZIP 15207"). */
  name: string;
}

export default function ProjectResults({ scope, t, place, hud, m, devType, lot, zip, c, ctx, policy, sheet, exportable, name }: ProjectResultsProps) {
  const side = useSide();
  const read = useProjectRead({ scope, m, devType, place, hud, lot, zip });
  const { review, run, check } = read;
  const housing = isHousing(devType);
  const units = m.mix.homes;
  const tested = housing && units > 0;
  const tk = takeaways(read, m, devType, scope);
  const facts = useMemo(() => reviewFacts(`${DEV_TYPE_LABEL[devType]}, ${units} units, ${name} (${scope === 'parcel' ? 'a lot' : scope === 'tract' ? 'a census tract, typical lot' : 'a ZIP code, typical lot'})`, inputWords(m, devType, read), review), [devType, units, name, scope, m, read, review]);
  useEffect(() => {
    if (!exportable || !t) return;
    const at = (g: string) => (g === t.GEOID ? capitalReport(reportInput(read, m, devType, t, lot)) : undefined);
    placeExtra.at = at;
    return () => {
      if (placeExtra.at === at) delete placeExtra.at;
    };
  }, [exportable, t, lot, devType, m, read]);
  return (
    <div className="space-y-3" data-project-results={scope} data-parcel-results>
      <VerdictLine review={review} />
      <Takeaway4 t={tk} />
      <ReviewCard review={review} facts={facts} onApply={(i) => review.fixes[i]?.action && applyFix(side, m, devType, review.fixes[i].action!)} />
      {tested && <FitCard m={m} scope={scope} hud={hud} />}
      {tested && <CapitalCard run={run} />}
      {housing && m.branch !== 'market' && t && place && scope !== 'zip' && <CreditMeter m={m} t={t} place={place} />}
      {c && policy && sheet != null && <StudyCard composed={c} ctx={ctx ?? null} policy={policy} sheet={sheet} />}
      {lot && housing && <SunCard lot={lot} fit={check.fit} />}
    </div>
  );
}
