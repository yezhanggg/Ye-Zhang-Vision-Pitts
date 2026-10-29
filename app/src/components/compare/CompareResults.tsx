// Compare places' project section, read like the Place tab's results (place/levels/ProjectResults): the project tested
// in each place on its own settings (side A, and side B when it keeps its own), at the level both sides are read at
// (lib/compare/store): on the lot picked on each map (Parcel), on a lot of the size it needs in a district there that
// allows it (Tract), or across each side's ZIP code. One line on which holds up, the verdict and the four takeaways
// side by side, the two capital stacks on one scale, the fit with each place's renters, and only the review findings
// that differ. Online only: loaded on demand with Compare places.
import { Fragment, useEffect, useMemo, type ReactNode } from 'react';
import { useCompareRead } from '../../lib/compare/store';
import { tractLabel } from '../../lib/data';
import { cx } from '../../lib/format';
import { hud as hudTable } from '../../lib/place/data';
import { fmtShare } from '../../lib/place/format';
import { isSeniorAge } from '../../lib/place/plan';
import type { PlaceArea } from '../../lib/place/zipView';
import { DEV_TYPE_LABEL, devTypeOf, isHousing, type DevType } from '../../lib/project/devType';
import type { Side } from '../../lib/project/side';
import { reviewFacts } from '../../lib/review/ai';
import { captureFit } from '../../lib/review/fit';
import { verdictWord, type Finding } from '../../lib/review/review';
import { SourcesBar } from '../place/levels/CapitalCard';
import { inputWords, SecondOpinion, takeaways, Tile, VERDICT_LOOK, type Takeaways } from '../place/levels/ProjectResults';
import { useProjectRead, useZipModel, type ProjectRead } from '../place/levels/useReview';
import { usdShort } from '../place/project/summary';
import { useProjectModel, type ProjectModel } from '../place/project/useProjectModel';
import { RESULTS_SUB, sideName, sideWait } from './levelWords';

/** Whether a side checks the money (Capital is on in its left panel). */
const money = (r: { m: { base: { project: { capitalOff?: boolean } } } }) => !r.m.base.project.capitalOff;
import { SectionHead, type SideInfo } from './CompareBlocks';

interface Read {
  info: SideInfo;
  m: ProjectModel;
  devType: DevType;
  read: ProjectRead;
  tk: Takeaways;
  /** The side's name at the level: its tract, its lot and tract, or its ZIP code. */
  name: string;
}

/** One side's project read at the level, on its own settings (null until its place, lot or ZIP is picked), and its name. */
function useSideRead(info: SideInfo, side: Side, level: PlaceArea, zip: string | null): [Read | null, string] {
  const atZip = level === 'zip';
  const g = atZip ? null : (info.t?.GEOID ?? null);
  const mTract = useProjectModel(g, info.p, hudTable, side);
  const mZip = useZipModel(atZip ? zip : null, side);
  const lot = side.project((s) => (level === 'parcel' && g ? s.sites[g]?.lot : undefined));
  const m = atZip ? mZip : level === 'parcel' && !lot ? null : mTract;
  const project = side.project();
  const income = side.plan((s) => s.level);
  const senior = side.plan((s) => isSeniorAge(s.age));
  const devType = devTypeOf(project, income, senior);
  const read = useProjectRead({ scope: level, m, devType, place: atZip ? null : info.p, hud: hudTable!, lot, zip: atZip ? zip : null, side });
  const name = sideName(level, info.tag, info.t ? tractLabel(info.t) : null, lot, zip);
  const r = useMemo(() => (m && read ? { info, m, devType, read, tk: takeaways(read, m, devType, level), name } : null), [info, m, devType, read, level, name]);
  return [r, name];
}

/** Market rate: the equity multiple; a tax credit deal (no sale counted): its gap. */
const moneyWord = (r: ProjectRead['run']['result']) => (!r.saleCounted ? (r.gap > 0.5 ? `gap ${usdShort(r.gap)}` : 'no gap') : r.multiple == null ? 'no equity' : `${r.multiple.toFixed(2)}×`);

const Head = ({ info, name }: { info: SideInfo; name: string }) => (
  <div className="truncate text-caption font-semibold" style={{ color: info.color }} title={name}>
    {info.tag} · {name}
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
  // A ZIP code: its own renters (no one tract's), as the Place tab's fit card reads it.
  const zip = r.read.scope === 'zip';
  const c = captureFit(r.m.mix.counts, zip ? null : r.m.base.place, zip ? r.m.base.mixFrom : r.m.tract, hudTable!);
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

export default function CompareResults({ A, B, sideA, sideB, level, zipA, zipB }: { A: SideInfo; B: SideInfo; sideA: Side; sideB: Side; level: PlaceArea; zipA: string | null; zipB: string | null }) {
  const [ra, nameA] = useSideRead(A, sideA, level, zipA);
  const [rb, nameB] = useSideRead(B, sideB, level, zipB);
  const facts = useMemo(() => {
    if (!ra || !rb) return null;
    const where = level === 'parcel' ? 'a lot' : level === 'tract' ? 'a census tract, typical lot' : 'a ZIP code, typical lot';
    const one = (r: Read) => reviewFacts(`Place ${r.info.tag}: ${r.name} (${where}), ${DEV_TYPE_LABEL[r.devType]}, ${r.m.mix.homes} units`, inputWords(r.m, r.devType, r.read), r.read.review);
    return `${one(ra)}\n\n${one(rb)}`.slice(0, 5000);
  }, [ra, rb, level]);
  // The section in words, for the export (lib/compare/report): the same rows, in the same order.
  useEffect(() => {
    const t = (x: { value: string; sub: string }) => (x.sub ? `${x.value}: ${x.sub}` : x.value);
    const none = level === 'parcel' ? 'no lot picked' : level === 'zip' ? 'no ZIP code picked' : 'no place';
    const w = (f: (r: Read) => string) => [ra ? f(ra) : none, rb ? f(rb) : none] as const;
    const stack = (r: Read) => (isHousing(r.devType) && r.m.mix.homes > 0 ? `${usdShort(r.read.run.result.total)} · DSCR ${Number.isFinite(r.read.run.result.years[0]?.dscr) ? r.read.run.result.years[0].dscr.toFixed(2) : '—'} · ${moneyWord(r.read.run.result)}` : 'not tested');
    const rows: [string, string, string][] = [
      ['Project', ...w((r) => `${DEV_TYPE_LABEL[r.devType]}, ${r.m.mix.homes} units`)],
      ['Verdict', ...w((r) => `${verdictWord(r.read.review.verdict)}: ${r.read.review.line}`)],
      ['Zoning', ...w((r) => t(r.tk.zoning))],
      ['Size', ...w((r) => `${r.tk.size.label}: ${t(r.tk.size)}`)],
      ['Capital', ...w((r) => (money(r) ? t(r.tk.capital) : 'off'))],
      [ra?.tk.fourth.label ?? rb?.tk.fourth.label ?? 'Tax credits', ...w((r) => (money(r) ? t(r.tk.fourth) : 'off'))],
      ['Capital stack (total cost · DSCR · equity multiple or gap)', ...w((r) => (money(r) ? stack(r) : 'off'))],
      ['Renters who qualify (capture)', ...w(capture)],
      ...diffRows(ra, rb).map((d): [string, string, string] => [`Check: ${d.title}`, d.a?.text ?? 'not checked here', d.b?.text ?? 'not checked here']),
    ];
    useCompareRead.setState({ answer: answerOf(ra, rb), rows: hudTable && (ra || rb) ? rows : [] });
  }, [ra, rb, level]);
  if (!hudTable) return null;
  if (!ra && !rb)
    return level === 'tract' ? null : (
      <section aria-label="The project in each place" data-compare-results>
        <SectionHead n={1} title="The project in each place" sub={RESULTS_SUB[level]} />
        <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-small leading-snug text-amber-900 ring-1 ring-amber-200">{level === 'parcel' ? 'Click a lot on each map: zoom in until the lots show.' : 'Pick a ZIP code above each map, or click one on the map.'}</p>
      </section>
    );
  const sides = [ra, rb] as const;
  // Capital turned off on a side: its money tiles read "Off"; with both off, the money rows and stacks are left out.
  const anyMoney = sides.some((r) => r && money(r));
  const off = (r: Read) => <Tile label={r.info.tag} value="Off" sub="Capital turned off" look="plain" />;
  const cell = (r: Read | null, tag: 'A' | 'B', f: (r: Read) => ReactNode) => (r ? f(r) : <p className="text-caption text-slate-500">{sideWait(level, tag)}</p>);
  /** One row of paired tiles, the same tile for each side. */
  const pair = (label: string, f: (r: Read) => ReactNode) => <Pair label={label} a={cell(ra, 'A', f)} b={cell(rb, 'B', f)} />;
  const maxTotal = Math.max(1, ...sides.map((r) => (r && isHousing(r.devType) ? r.read.run.result.total : 0)));
  const diff = diffRows(ra, rb);
  const same = ra && rb ? new Set([...ra.read.review.findings, ...rb.read.review.findings].map((f) => f.key)).size - diff.length : 0;
  const answer = answerOf(ra, rb);
  return (
    <section aria-label="The project in each place" data-compare-results>
      <SectionHead n={1} title="The project in each place" sub={RESULTS_SUB[level]} />
      {answer && <p className="mt-2 text-small font-semibold leading-snug text-slate-900">{answer}</p>}
      <div className="mt-1 grid grid-cols-2 gap-2">
        <Head info={A} name={nameA} />
        <Head info={B} name={nameB} />
        {pair('Verdict', (r) => <Tile label={`${r.info.tag} · ${DEV_TYPE_LABEL[r.devType]}`} value={verdictWord(r.read.review.verdict)} sub={r.read.review.line} look={VERDICT_LOOK[r.read.review.verdict]} />)}
        {pair('Zoning', (r) => <Tile label={r.info.tag} value={r.tk.zoning.value} sub={r.tk.zoning.sub} look={r.tk.zoning.look} />)}
        {pair('Size', (r) => <Tile label={`${r.info.tag} · ${r.tk.size.label}`} value={r.tk.size.value} sub={r.tk.size.sub} look={r.tk.size.look} />)}
        {anyMoney && pair('Capital', (r) => (!money(r) ? off(r) : <Tile label={r.info.tag} value={r.tk.capital.value} sub={r.tk.capital.sub} look={r.tk.capital.look} />))}
        {anyMoney && pair(ra?.tk.fourth.label ?? rb?.tk.fourth.label ?? 'Tax credits', (r) => (!money(r) ? off(r) : <Tile label={r.info.tag} value={r.tk.fourth.value} sub={r.tk.fourth.sub} look={r.tk.fourth.look} />))}
      </div>

      {anyMoney && (
      <div className="mt-3">
        <div className="text-caption font-semibold uppercase tracking-wide text-slate-500">Capital stacks, one scale</div>
        {sides.map((r, i) =>
          r && money(r) && isHousing(r.devType) && r.m.mix.homes > 0 ? (
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
      )}

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
