// The project card on Analysis > Place: one card that tests a project in the place. Its setup (homes, stories,
// financing) feeds five questions in the order a developer or planner asks them: who needs homes here and in what mix,
// what can be built, how it would score for tax credits, whether it pencils, and whether its open space fits and gets
// sun. Each question shows its answer in one line and opens for the detail, one at a time. Results only: every input
// is in the left panel (place/flat), and "Change … on the left" scrolls there. Compare places reads the same model.
// Loaded on demand and left out of the offline single file (MatchView imports this module lazily, never statically).
import { useEffect, type ReactNode } from 'react';
import { placeExtra } from '../../../lib/export/builders/place';
import { projectReport } from '../../../lib/project/report';
import { cx } from '../../../lib/format';
import { capitalize } from '../../../lib/place/format';
import type { Recommendation } from '../../../lib/place/recommend';
import { TYPOLOGY_LABEL } from '../../../lib/place/thresholds';
import type { HudTable, PlaceMeasures, Typology } from '../../../lib/place/types';
import { stamp, SCREENING_NOTE } from '../../../lib/project/stamp';
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
import OpenSun, { openHeadline, useOpenSun } from './OpenSun';
import Paths from './Paths';
import Pencil from './Pencil';
import { buildHeadline, needHeadline, pencilHeadline, pointsWords, scoreHeadline, sizeWords, type Headline } from './summary';
import { useProjectModel, type ProjectModel } from './useProjectModel';

const TONE_CLASS = { good: 'text-emerald-700', bad: 'text-rose-700', plain: 'text-slate-900' } as const;
/** The left panel's name for each question's inputs. */
const INPUTS_WORD: Record<EditPart, string> = { setup: 'Project', need: 'Unit mix', build: 'Site', score: 'Tax credit entries', pencil: 'Pencil inputs', policy: 'Policies', open: 'Open space' };

/** "Change on the left": opens the matching inputs in the left panel. */
export function EditLink({ part, children }: { part: EditPart; children?: ReactNode }) {
  return (
    <button type="button" onClick={() => editOn(part)} className="text-caption font-medium text-violet-700 hover:text-violet-800">
      {children ?? `Change ${INPUTS_WORD[part]} on the left`}
    </button>
  );
}

function Question({ n, part, title, head, open, onToggle, children }: { n: number; part: EditPart; title: string; head: Headline; open: boolean; onToggle: () => void; children: ReactNode }) {
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
              <div className="mt-2">
                <EditLink part={part} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The fifth question; its inputs are under Open space and sun in the left panel. */
function OpenQuestion({ geoid, m, rec, open, onToggle }: { geoid: string; m: ProjectModel; rec: Recommendation; open: boolean; onToggle: () => void }) {
  const o = useOpenSun(geoid, m, m.cap, rec);
  return (
    <Question n={5} part="open" title="Open space and sun" head={openHeadline(o)} open={open} onToggle={onToggle}>
      <OpenSun o={o} />
    </Question>
  );
}

export default function ProjectPanel({ t, place, hud, rec, fitOrder }: { t: TractProps; place: PlaceMeasures; hud: HudTable; rec: Recommendation; fitOrder: Typology[] }) {
  const m = useProjectModel(t.GEOID, place, hud);
  const stories = useSide().project((s) => s.stories);
  const open = useEditPart((s) => s.open);
  // While the card is open, the place's PDF and CSV carry the project too (lib/project/report).
  useEffect(() => {
    if (!m) return;
    const at = (g: string) => (g === t.GEOID ? projectReport({ base: m.base, name: tractLabel(t), mix: m.mix, stories, branch: m.branch, words: sizeWords, points: pointsWords }) : undefined);
    placeExtra.at = at;
    return () => {
      if (placeExtra.at === at) delete placeExtra.at;
    };
  }, [m, t, stories]);
  if (!m) return null;
  const toggle = toggleEditPart;
  const lead = rec.lead ? capitalize(TYPOLOGY_LABEL[rec.lead]) : null;

  return (
    <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200/80" data-project-panel>
      <div className="px-4 pb-3 pt-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-body font-semibold text-slate-900">Test a project here</h3>
          <span className="text-caption text-slate-500">Same project in Compare places</span>
        </div>
        <p className="text-caption leading-snug text-slate-500">
          {stamp()}. {SCREENING_NOTE}
        </p>
        <div className="mt-2 flex items-baseline justify-between gap-2 rounded-lg bg-stone-50 px-2.5 py-1.5">
          <span className="text-small text-slate-800 tnum">
            {m.mix.homes} homes{m.mix.example ? ' (example)' : m.mix.mode === 'mine' ? ' (your mix)' : ''} · {stories ?? '?'} stories · {PATH_LABEL[m.branch]}
            {!m.branchChosen && <span className="text-caption text-slate-500"> (follows the mix)</span>}
          </span>
          <EditLink part="setup">Change</EditLink>
        </div>
      </div>

      <div className="divide-y divide-stone-200/70 border-t border-stone-200/80">
        <Question n={1} part="need" title="Who needs it" head={needHeadline(m, lead)} open={open === 'need'} onToggle={() => toggle('need')}>
          <DemandMix model={m} place={place} hud={hud} rec={rec} fitOrder={fitOrder} />
        </Question>
        <Question n={2} part="build" title="What can be built" head={buildHeadline(m)} open={open === 'build'} onToggle={() => toggle('build')}>
          {m.cap ? <BuildCapacity geoid={t.GEOID} cap={m.cap} rec={rec} homes={m.mix.homes} homesExample={m.mix.example} /> : <p className="text-small text-slate-600">No zoning capacity was computed for this tract.</p>}
        </Question>
        <Question n={3} part="score" title="Tax credit score" head={scoreHeadline(m)} open={open === 'score'} onToggle={() => toggle('score')}>
          <TaxCreditSheet t={t} place={place} plan={m.facts} state={m.sheet} market={m.branch === 'market'} />
          <div className="mt-3">
            <KeyDates branch={m.branch} />
          </div>
        </Question>
        <Question n={4} part="pencil" title="Does it pencil" head={pencilHeadline(m)} open={open === 'pencil'} onToggle={() => toggle('pencil')}>
          <Paths base={m.base} homes={m.mix.homes} stories={stories} branch={m.branch} />
          <div className="mt-3" />
          <Pencil name={tractLabel(t)} result={m.result} args={m.args} kinds={m.kinds} branch={m.branch} qctOrDda={m.qctOrDda} />
        </Question>
        <OpenQuestion geoid={t.GEOID} m={m} rec={rec} open={open === 'open'} onToggle={() => toggle('open')} />
      </div>
    </section>
  );
}
