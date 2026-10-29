// Compare places' project section, read like the Place tab's results (place/levels/ProjectResults): the project tested
// in each place on its own settings (side A, and side B when it keeps its own), each on a lot of the size it needs in
// a district there that allows it. One line on which holds up, the verdict and the four takeaways side by side, the
// two capital stacks on one scale, the fit with each place's renters, and only the review findings that differ.
// Online only: loaded on demand with Compare places.
import { Fragment, useEffect, useMemo, type ReactNode } from 'react';
import { useCompareRead } from '../../lib/compare/store';
import { tractLabel } from '../../lib/data';
import { cx } from '../../lib/format';
import { hud as hudTable } from '../../lib/place/data';
import { fmtShare } from '../../lib/place/format';
import { isSeniorAge } from '../../lib/place/plan';
import { DEV_TYPE_LABEL, devTypeOf, isHousing, type DevType } from '../../lib/project/devType';
import type { Side } from '../../lib/project/side';
import { reviewFacts } from '../../lib/review/ai';
import { captureFit } from '../../lib/review/fit';
import { verdictWord, type Finding } from '../../lib/review/review';
import { SourcesBar } from '../place/levels/CapitalCard';
import { inputWords, SecondOpinion, takeaways, Tile, VERDICT_LOOK, type Takeaways } from '../place/levels/ProjectResults';
import { useProjectRead, type ProjectRead } from '../place/levels/useReview';
import { usdShort } from '../place/project/summary';
import { useProjectModel, type ProjectModel } from '../place/project/useProjectModel';
import { SectionHead, type SideInfo } from './CompareBlocks';

interface Read {
  info: SideInfo;
  m: ProjectModel;
  devType: DevType;
  read: ProjectRead;
  tk: Takeaways;
}

/** One side's project read, on its own settings. */
function useSideRead(info: SideInfo, side: Side): Read | null {
  const m = useProjectModel(info.t?.GEOID, info.p, hudTable, side);
  const project = side.project();
  const level = side.plan((s) => s.level);
  const senior = side.plan((s) => isSeniorAge(s.age));
  const devType = devTypeOf(project, level, senior);
  const read = useProjectRead({ scope: 'tract', m, devType, place: info.p, hud: hudTable!, side });
  return useMemo(() => (m && read ? { info, m, devType, read, tk: takeaways(read, m, devType, 'tract') } : null), [info, m, devType, read]);
}

/** Market rate: the equity multiple; a tax credit deal (no sale counted): its gap. */
const moneyWord = (r: ProjectRead['run']['result']) => (!r.saleCounted ? (r.gap > 0.5 ? `gap ${usdShort(r.gap)}` : 'no gap') : r.multiple == null ? 'no equity' : `${r.multiple.toFixed(2)}×`);

const Head = ({ info }: { info: SideInfo }) => (
  <div className="truncate text-caption font-semibold" style={{ color: info.color }}>
    {info.tag} · {info.t ? tractLabel(info.t) : `Place ${info.tag}`}
  </div>
);

function Pair({ label, a, b }: { label: string; a: ReactNode; b: ReactNode }) {
  return (
    <>
      <div style={{ gridColumn: '1 / -1' }} className="mt-2 text-caption font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="min-w-0">{a}</div>
      <div className="min-w-0">{b}</div>
    </>
  );
}

const capture = (r: Read) => {
  const c = captureFit(r.m.mix.counts, r.m.base.place, r.m.tract, hudTable!);
  return c?.rate == null ? '—' : fmtShare(c.rate);
};

/** The findings that read differently in A and B (or only in one); the rest are counted. */
function differing(a: Finding[], b: Finding[]): { key: string; title: string; a: Finding | null; b: Finding | null }[] {
  const keys = [...new Set([...a, ...b].map((f) => f.key))];
  return keys
    .map((k) => ({ key: k, a: a.find((f) => f.key === k) ?? null, b: b.find((f) => f.key === k) ?? null }))
    // Only what changes the answer: a check that warns or stops on one side and not the other.
    .filter((x) => x.a?.tone !== x.b?.tone && [x.a?.tone, x.b?.tone].some((t) => t === 'warn' || t === 'stop'))
    .map((x) => ({ ...x, title: (x.a ?? x.b)!.title }));
}

const TONE_TEXT: Record<Finding['tone'], string> = { ok: 'text-emerald-700', warn: 'text-amber-900', stop: 'text-rose-700', info: 'text-slate-700' };

const diffRows = (ra: Read | null, rb: Read | null) => (ra && rb ? differing(ra.read.review.findings, rb.read.review.findings) : []);

/** The section's one line: both verdicts. */
const answerOf = (ra: Read | null, rb: Read | null) => (ra && rb ? (ra.read.review.verdict === rb.read.review.verdict ? `Both: ${verdictWord(ra.read.review.verdict).toLowerCase()}.` : `A ${verdictWord(ra.read.review.verdict).toLowerCase()}; B ${verdictWord(rb.read.review.verdict).toLowerCase()}.`) : null);

export default function CompareResults({ A, B, sideA, sideB }: { A: SideInfo; B: SideInfo; sideA: Side; sideB: Side }) {
  const ra = useSideRead(A, sideA);
  const rb = useSideRead(B, sideB);
  const facts = useMemo(() => {
    if (!ra || !rb) return null;
    const one = (r: Read) => reviewFacts(`Place ${r.info.tag}: ${r.info.t ? tractLabel(r.info.t) : ''}, ${DEV_TYPE_LABEL[r.devType]}, ${r.m.mix.homes} units`, inputWords(r.m, r.devType, r.read), r.read.review);
    return `${one(ra)}\n\n${one(rb)}`.slice(0, 5000);
  }, [ra, rb]);
  // The section in words, for the export (lib/compare/report): the same rows, in the same order.
  useEffect(() => {
    const t = (x: { value: string; sub: string }) => (x.sub ? `${x.value}: ${x.sub}` : x.value);
    const w = (f: (r: Read) => string) => [ra ? f(ra) : 'no place', rb ? f(rb) : 'no place'] as const;
    const stack = (r: Read) => (isHousing(r.devType) && r.m.mix.homes > 0 ? `${usdShort(r.read.run.result.total)} · DSCR ${Number.isFinite(r.read.run.result.years[0]?.dscr) ? r.read.run.result.years[0].dscr.toFixed(2) : '—'} · ${moneyWord(r.read.run.result)}` : 'not tested');
    const rows: [string, string, string][] = [
      ['Project', ...w((r) => `${DEV_TYPE_LABEL[r.devType]}, ${r.m.mix.homes} units`)],
      ['Verdict', ...w((r) => `${verdictWord(r.read.review.verdict)}: ${r.read.review.line}`)],
      ['Zoning', ...w((r) => t(r.tk.zoning))],
      ['Size', ...w((r) => `${r.tk.size.label}: ${t(r.tk.size)}`)],
      ['Capital', ...w((r) => t(r.tk.capital))],
      [ra?.tk.fourth.label ?? rb?.tk.fourth.label ?? 'Tax credits', ...w((r) => t(r.tk.fourth))],
      ['Capital stack (total cost · DSCR · equity multiple or gap)', ...w(stack)],
      ['Renters who qualify (capture)', ...w(capture)],
      ...diffRows(ra, rb).map((d): [string, string, string] => [`Check: ${d.title}`, d.a?.text ?? 'not checked here', d.b?.text ?? 'not checked here']),
    ];
    useCompareRead.setState({ answer: answerOf(ra, rb), rows: hudTable && (ra || rb) ? rows : [] });
  }, [ra, rb]);
  if (!hudTable || (!ra && !rb)) return null;
  const sides = [ra, rb] as const;
  const cell = (r: Read | null, f: (r: Read) => ReactNode) => (r ? f(r) : <p className="text-caption text-slate-500">Pick a place.</p>);
  const maxTotal = Math.max(1, ...sides.map((r) => (r && isHousing(r.devType) ? r.read.run.result.total : 0)));
  const diff = diffRows(ra, rb);
  const same = ra && rb ? new Set([...ra.read.review.findings, ...rb.read.review.findings].map((f) => f.key)).size - diff.length : 0;
  const answer = answerOf(ra, rb);
  return (
    <section aria-label="The project in each place" data-compare-results>
      <SectionHead n={1} title="The project in each place" sub="Each side's project on a lot of the size it needs, in a district there that allows it; recomputed as you change either side." />
      {answer && <p className="mt-2 text-small font-semibold leading-snug text-slate-900">{answer}</p>}
      <div className="mt-1 grid grid-cols-2 gap-2">
        <Head info={A} />
        <Head info={B} />
        <Pair label="Verdict" a={cell(ra, (r) => <Tile label={`${r.info.tag} · ${DEV_TYPE_LABEL[r.devType]}`} value={verdictWord(r.read.review.verdict)} sub={r.read.review.line} look={VERDICT_LOOK[r.read.review.verdict]} />)} b={cell(rb, (r) => <Tile label={`${r.info.tag} · ${DEV_TYPE_LABEL[r.devType]}`} value={verdictWord(r.read.review.verdict)} sub={r.read.review.line} look={VERDICT_LOOK[r.read.review.verdict]} />)} />
        <Pair label="Zoning" a={cell(ra, (r) => <Tile label={r.info.tag} value={r.tk.zoning.value} sub={r.tk.zoning.sub} look={r.tk.zoning.look} />)} b={cell(rb, (r) => <Tile label={r.info.tag} value={r.tk.zoning.value} sub={r.tk.zoning.sub} look={r.tk.zoning.look} />)} />
        <Pair label="Size" a={cell(ra, (r) => <Tile label={`${r.info.tag} · ${r.tk.size.label}`} value={r.tk.size.value} sub={r.tk.size.sub} look={r.tk.size.look} />)} b={cell(rb, (r) => <Tile label={`${r.info.tag} · ${r.tk.size.label}`} value={r.tk.size.value} sub={r.tk.size.sub} look={r.tk.size.look} />)} />
        <Pair label="Capital" a={cell(ra, (r) => <Tile label={r.info.tag} value={r.tk.capital.value} sub={r.tk.capital.sub} look={r.tk.capital.look} />)} b={cell(rb, (r) => <Tile label={r.info.tag} value={r.tk.capital.value} sub={r.tk.capital.sub} look={r.tk.capital.look} />)} />
        <Pair label={ra?.tk.fourth.label ?? rb?.tk.fourth.label ?? 'Tax credits'} a={cell(ra, (r) => <Tile label={r.info.tag} value={r.tk.fourth.value} sub={r.tk.fourth.sub} look={r.tk.fourth.look} />)} b={cell(rb, (r) => <Tile label={r.info.tag} value={r.tk.fourth.value} sub={r.tk.fourth.sub} look={r.tk.fourth.look} />)} />
      </div>

      <div className="mt-3">
        <div className="text-caption font-semibold uppercase tracking-wide text-slate-500">Capital stacks, one scale</div>
        {sides.map((r, i) =>
          r && isHousing(r.devType) && r.m.mix.homes > 0 ? (
            <div key={i} className="mt-2">
              <div className="flex items-baseline justify-between gap-2 text-caption">
                <span className="font-semibold" style={{ color: r.info.color }}>
                  {r.info.tag}
                </span>
                <span className="text-slate-700 tnum">
                  {usdShort(r.read.run.result.total)} · DSCR {Number.isFinite(r.read.run.result.years[0]?.dscr) ? r.read.run.result.years[0].dscr.toFixed(2) : '—'} · {moneyWord(r.read.run.result)}
                </span>
              </div>
              <div style={{ width: `${(r.read.run.result.total / maxTotal) * 100}%` }}>
                <SourcesBar run={r.read.run} />
              </div>
            </div>
          ) : null,
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-caption">
        <div style={{ gridColumn: '1 / -1' }} className="text-caption font-semibold uppercase tracking-wide text-slate-500">Renters who qualify</div>
        {sides.map((r, i) => (
          <div key={i} className="rounded-lg bg-stone-50 px-2.5 py-1.5">
            <span className="text-slate-500">{i === 0 ? 'A' : 'B'} capture</span>
            <div className="font-semibold text-slate-900 tnum">{r ? capture(r) : '—'}</div>
          </div>
        ))}
      </div>

      {ra && rb && (
        <div className="mt-3">
          <div className="text-caption font-semibold uppercase tracking-wide text-slate-500">Where they differ</div>
          {diff.length ? (
            <dl className="mt-1 divide-y divide-stone-100">
              {diff.map((d) => (
                <Fragment key={d.key}>
                  <div className="py-1.5">
                    <dt className="text-small font-semibold text-slate-900">{d.title}</dt>
                    <dd className="grid grid-cols-2 gap-2 text-caption leading-snug">
                      <span className={cx(d.a ? TONE_TEXT[d.a.tone] : 'text-slate-500')}>A: {d.a?.text ?? 'not checked here'}</span>
                      <span className={cx(d.b ? TONE_TEXT[d.b.tone] : 'text-slate-500')}>B: {d.b?.text ?? 'not checked here'}</span>
                    </dd>
                  </div>
                </Fragment>
              ))}
            </dl>
          ) : (
            <p className="mt-1 text-small text-slate-700">Every check reads the same in both places.</p>
          )}
          {same > 0 && diff.length > 0 && <p className="mt-1 text-caption text-slate-500">{same} more checks read the same.</p>}
        </div>
      )}
      {facts && <SecondOpinion facts={facts} question="Give your second opinion: which place holds up better for this project, and why?" />}
    </section>
  );
}
