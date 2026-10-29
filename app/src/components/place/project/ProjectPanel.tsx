// The project card on Analysis > Place: one card that tests a project in the place. Its setup (homes, stories,
// financing) feeds five questions in the order a developer or planner asks them: who needs homes here and in what mix,
// what can be built, how it would score for tax credits, whether it pencils, and whether its open space fits and gets
// sun. Each question shows its answer in one line and opens for the detail, one at a time. Results only: every input
// is in the left panel (place/flat), and "Change … on the left" scrolls there, except the tax credit sheet's lines,
// which are entered on the sheet itself. Compare places reads the same model.
// Loaded on demand and left out of the offline single file (MatchView imports this module lazily, never statically).
import { useEffect, type ReactNode } from 'react';
import { placeExtra } from '../../../lib/export/builders/place';
import { projectReport } from '../../../lib/project/report';
import { cx } from '../../../lib/format';
import { capitalize } from '../../../lib/place/format';
import type { Recommendation } from '../../../lib/place/recommend';
import { TYPOLOGY_LABEL } from '../../../lib/place/thresholds';
import type { HudTable, PlaceMeasures, Typology } from '../../../lib/place/types';
import { editOn, toggleEditPart, useEditPart, type EditPart } from '../../../lib/project/editStore';
import { useSide } from '../../../lib/project/side';
import { PATH_LABEL } from '../../../lib/project/paths';
import { tractLabel } from '../../../lib/data';
import type { TractProps } from '../../../lib/types';
import { AnimatePresence, motion } from 'motion/react';
import { SPRING_FOLD, SPRING_TAB } from '../../primitives';
import TaxCreditSheet from '../TaxCreditSheet';
import BuildCapacity from './BuildCapacity';
import DemandMix from './DemandMix';
import KeyDates from './KeyDates';
import OpenSun, { openHeadline, tractSunHeadline, useOpenSun } from './OpenSun';
import Paths from './Paths';
import Pencil from './Pencil';
import { qctChangeWords } from '../../../lib/pencil/designations';
import { lotRead } from './TryLot';
import { LEVEL_LABEL } from '../../../lib/place/plan';
import { lotSunWords, useLotManifest } from '../levels/lotSun';
import type { Answer } from '../levels/levels';
import { answersFor } from '../levels/levels';
import { buildHeadline, lotHeadline, needHeadline, pencilHeadline, pointsWords, scoreHeadline, sizeWords, type Headline } from './summary';
import { useProjectModel, type ProjectModel } from './useProjectModel';

const TONE_CLASS = { good: 'text-emerald-700', bad: 'text-rose-700', plain: 'text-slate-900' } as const;
/** The left panel's name for each question's inputs. */
const INPUTS_WORD: Record<EditPart, string> = { setup: 'Your project', need: 'Your project', build: 'Your site', score: 'Money', pencil: 'Money', policy: 'Policies and screens', open: 'Open space' };

/** "Change on the left": opens the matching inputs in the left panel. */
export function EditLink({ part, children }: { part: EditPart; children?: ReactNode }) {
  return (
    <button type="button" onClick={() => editOn(part)} className="text-caption font-medium text-violet-700 hover:text-violet-800">
      {children ?? `Change ${INPUTS_WORD[part]} on the left`}
    </button>
  );
}

function Question({ n, part, title, head, open, onToggle, children, editable = true }: { n: number; part: EditPart; title: string; head: Headline; open: boolean; onToggle: () => void; children: ReactNode; /** Has inputs on the left (at the Tract level, What can be built and the sun have none). */ editable?: boolean }) {
  return (
    <div className={cx('transition-colors', open && 'bg-stone-50/60')}>
      <button type="button" aria-expanded={open} onClick={onToggle} className="group flex w-full items-start gap-2.5 px-4 py-2.5 text-left hover:bg-stone-50">
        <span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tnum', open ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-800')}>{n}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-small font-semibold text-slate-900">{title}</span>
            <span className={cx('shrink-0 text-small font-semibold tnum', TONE_CLASS[head.tone])}>{head.value}</span>
          </span>
          <span className="mt-0.5 block text-caption leading-snug text-slate-600">{head.sub}</span>
        </span>
        <motion.svg viewBox="0 0 16 16" className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-400" initial={false} animate={{ rotate: open ? 90 : 0 }} transition={SPRING_TAB} aria-hidden>
          <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0, transition: { ...SPRING_FOLD, opacity: { duration: 0.12 } } }} transition={SPRING_FOLD} className="overflow-hidden">
            <div className="px-4 pb-4 pt-0.5">
              {children}
              {part !== 'score' && editable && (
                <div className="mt-2">
                  <EditLink part={part} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Open space and sun; its inputs are under Open space in the left panel. At the Tract level, the tract's sun only. */
function OpenQuestion({ n, geoid, m, rec, open, onToggle, scope }: { n: number; geoid: string; m: ProjectModel; rec: Recommendation; open: boolean; onToggle: () => void; scope: 'tract' | 'lot' }) {
  const o = useOpenSun(geoid, m, m.cap, rec);
  const lot = useSide().project((s) => s.sites[geoid]?.lot);
  const manifest = useLotManifest();
  const lotSun = scope === 'lot' && lot ? lotSunWords(lot, manifest) : null;
  const head = scope === 'tract' ? tractSunHeadline(o) : lotSun ? { ...openHeadline(o), sub: `${Math.round(o.share * 100)}% open space · the lot gets ${lotSun}` } : openHeadline(o);
  return (
    <Question n={n} part="open" title="Open space and sun" head={head} open={open} onToggle={onToggle} editable={scope === 'lot'}>
      <OpenSun o={o} scope={scope} lotSun={lotSun} />
    </Question>
  );
}

export default function ProjectPanel({ t, place, hud, rec, fitOrder, level = 'parcel' }: { t: TractProps; place: PlaceMeasures; hud: HudTable; rec: Recommendation; fitOrder: Typology[]; /** 'tract': who needs it, what can be built and sun, no money (the Tract level); 'parcel': the site test with the pencil and the tax credit sheet. */ level?: 'tract' | 'parcel' }) {
  const m = useProjectModel(t.GEOID, place, hud);
  const side = useSide();
  const stories = side.project((s) => s.stories);
  const site = side.project((s) => s.sites[t.GEOID]);
  const open = useEditPart((s) => s.open);
  const parcel = level === 'parcel';
  // At the Parcel level the place's PDF and CSV carry the project test too (lib/project/report).
  useEffect(() => {
    if (!m || !parcel) return;
    const at = (g: string) => (g === t.GEOID ? projectReport({ base: m.base, name: tractLabel(t), mix: m.mix, stories, branch: m.branch, words: sizeWords, points: pointsWords }) : undefined);
    placeExtra.at = at;
    return () => {
      if (placeExtra.at === at) delete placeExtra.at;
    };
  }, [m, t, stories, parcel]);
  if (!m) return null;
  const toggle = toggleEditPart;
  const lead = rec.lead ? capitalize(TYPOLOGY_LABEL[rec.lead]) : null;
  const lot = m.cap ? lotRead(m.cap, rec.lead, m.mix.homes, site ?? {}) : null;
  const homesWord = `${m.mix.homes} homes${m.mix.example ? ' (example)' : m.mix.mode === 'mine' ? ' (your mix)' : ''}`;

  const question = (a: Answer, n: number): ReactNode => {
    switch (a) {
      case 'need':
        return (
          <Question key={a} n={n} part="need" title="Who needs it" head={needHeadline(m, lead)} open={open === 'need'} onToggle={() => toggle('need')}>
            <DemandMix model={m} place={place} hud={hud} rec={rec} fitOrder={fitOrder} />
          </Question>
        );
      case 'build':
        return (
          <Question key={a} n={n} part="build" title={parcel ? 'What can be built on this lot' : 'What can be built'} head={parcel && lot?.set ? lotHeadline(lot, m.mix.homes) : buildHeadline(m)} open={open === 'build'} onToggle={() => toggle('build')} editable={parcel}>
            {m.cap ? <BuildCapacity geoid={t.GEOID} cap={m.cap} rec={rec} homes={m.mix.homes} homesExample={m.mix.example} scope={parcel ? 'lot' : 'tract'} /> : <p className="text-small text-slate-600">No zoning capacity was computed for this tract.</p>}
          </Question>
        );
      case 'score':
        return (
          <Question key={a} n={n} part="score" title="Tax credit score" head={scoreHeadline(m)} open={open === 'score'} onToggle={() => toggle('score')}>
            <TaxCreditSheet t={t} place={place} plan={m.facts} state={m.sheet} market={m.branch === 'market'} />
            <div className="mt-3">
              <KeyDates branch={m.branch} />
            </div>
          </Question>
        );
      case 'pencil':
        return (
          <Question key={a} n={n} part="pencil" title="Does it pencil" head={pencilHeadline(m)} open={open === 'pencil'} onToggle={() => toggle('pencil')}>
            <Paths base={m.base} homes={m.mix.homes} stories={stories} branch={m.branch} />
            <div className="mt-3" />
            <Pencil name={tractLabel(t)} result={m.result} args={m.args} kinds={m.kinds} branch={m.branch} qctOrDda={m.qctOrDda} qctNote={qctChangeWords(m.base.qct)} />
          </Question>
        );
      case 'open':
        return <OpenQuestion key={a} n={n} geoid={t.GEOID} m={m} rec={rec} open={open === 'open'} onToggle={() => toggle('open')} scope={parcel ? 'lot' : 'tract'} />;
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200/80" data-project-panel={level}>
      <div className="px-4 pb-3 pt-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-body font-semibold text-slate-900">{parcel ? 'Test the project on this site' : 'Your project in this neighborhood'}</h3>
          <span className="text-caption text-slate-500">{parcel ? 'Money and tax credits' : 'No money at this level'}</span>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2 rounded-lg bg-stone-50 px-2.5 py-1.5">
          <span className="text-small text-slate-800 tnum">
            {parcel ? (
              <>
                {homesWord} · {stories ?? '?'} stories · {PATH_LABEL[m.branch]}
                {!m.branchChosen && <span className="text-caption text-slate-500"> (follows the mix)</span>}
              </>
            ) : (
              <>
                {homesWord} · {LEVEL_LABEL[m.base.level]} · {m.mix.mode === 'mine' ? 'your mix' : "renters' split"}
              </>
            )}
          </span>
          <EditLink part="setup">Change</EditLink>
        </div>
      </div>

      <div className="divide-y divide-stone-200/70 border-t border-stone-200/80">{answersFor(parcel ? 'parcel' : 'tract').map((a, i) => question(a, i + 1))}</div>
    </section>
  );
}
