// The right panel at the Parcel level: the site picked (its lot, the address, its tract), then the project's answers
// at a glance and in cards (place/levels/ProjectResults: zoning and restrictions, the capital stack, the tax credit
// score, what you are studying, sun), and one line on the neighborhood with a way back to the Tract level.
// Online only: loaded on demand.
import type { ReactNode } from 'react';
import { tractLabel } from '../../../lib/data';
import { lotName, lotSize } from '../../../lib/explore/parcelShadow';
import { clearLot } from '../../../lib/parcel/pick';
import { capitalize } from '../../../lib/place/format';
import { TYPOLOGY_LABEL } from '../../../lib/place/thresholds';
import type { HudTable, PlaceMeasures, Typology } from '../../../lib/place/types';
import type { PolicyContext } from '../../../lib/policy/applies';
import type { Composed } from '../../../lib/policy/compose';
import { useSide } from '../../../lib/project/side';
import { useApp } from '../../../lib/store';
import type { TractProps } from '../../../lib/types';
import { isSeniorAge } from '../../../lib/place/plan';
import { devTypeOf } from '../../../lib/project/devType';
import ProjectResults from './ProjectResults';
import Overview from './Overview';
import { useBrowse } from './browse';
import { signalShare } from '../project/summary';
import { useProjectModel } from '../project/useProjectModel';
import { setLevel } from './LevelSwitch';
import { useLotDefaults } from './useReview';

export default function SiteDetail({ t, place, hud, c, fitOrder, actions }: { t: TractProps; place: PlaceMeasures; hud: HudTable; c: Composed; fitOrder?: Typology[]; actions: ReactNode }) {
  const side = useSide();
  const browse = useBrowse((s) => s.mode) === 'browse';
  const lot = side.project((s) => s.sites[t.GEOID]?.lot);
  const pinIzo = side.project((s) => s.sites[t.GEOID]?.pin?.izo);
  const pin = useApp((s) => s.pin);
  const policy = side.policy();
  const sheet = side.lihtc((e) => e.sheet);
  const project = side.project();
  const level = side.plan((s) => s.level);
  const senior = side.plan((s) => isSeniorAge(s.age));
  const m = useProjectModel(t.GEOID, place, hud);
  const devType = devTypeOf(project, level, senior);
  useLotDefaults(m, devType, lot);
  const address = pin && !/^Lot |^Dropped pin$/.test(pin.label) ? pin.label : null;
  const ctx: PolicyContext | null = m ? { label: tractLabel(t), place, cap: m.cap, homes: m.mix.homes, branch: m.branch, qctOrDda: m.qctOrDda, qct: m.base.qct, score: m.sheet.score, draftSheet: m.sheet.sheet.status === 'draft', pinIzo } : null;
  const lead = c.rec.lead ? capitalize(TYPOLOGY_LABEL[c.rec.lead]) : null;
  const close = () => {
    clearLot(t.GEOID);
    useApp.getState().set({ pin: null });
    useApp.getState().select(null);
  };
  return (
    <div data-site-detail>
      <div className="sticky top-0 z-10 border-b border-stone-100 bg-white/95 px-5 pb-3 pt-4 backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-small font-semibold text-violet-700">Your site</div>
            <h2 className="truncate font-display text-title font-bold text-slate-900">{lot ? lotName(lot.label) : `A site in ${tractLabel(t)}`}</h2>
            <div className="text-small text-slate-600">{[address, tractLabel(t), lot ? lotSize(lot.sqft) : null, lot?.district].filter(Boolean).join(' · ')}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {actions}
            <button onClick={close} className="rounded-lg p-1.5 text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-label="Clear the site">
              <svg viewBox="0 0 20 20" className="h-4 w-4">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className="space-y-3 p-5">
        {!lot && <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-small leading-snug text-amber-900 ring-1 ring-amber-200">Click a lot on the map or search an address.</p>}
        {browse && lot ? <Overview scope="parcel" geoid={t.GEOID} zip={null} place={place} demand={m?.tract ?? null} hud={hud} lot={lot} fitOrder={fitOrder} /> : m && <ProjectResults scope="parcel" t={t} place={place} hud={hud} m={m} lot={lot} devType={devType} c={c} ctx={ctx} policy={policy} sheet={sheet} exportable name={lot ? `${lotName(lot.label)} in ${tractLabel(t)}` : tractLabel(t)} />}
        <section className="rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200" data-neighborhood>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-small font-semibold text-slate-900">The neighborhood</h3>
            <button type="button" onClick={() => setLevel('tract')} className="text-caption font-medium text-violet-700 hover:text-violet-800">
              Read {tractLabel(t)} as a tract
            </button>
          </div>
          <p className="mt-0.5 text-caption leading-snug text-slate-600">
            {lead ? `${lead} suggested for the tract` : 'No type suggested for the tract'}
            {m ? ` · renters ${signalShare(m, 'renter')} · one-person renters ${signalShare(m, 'one_person')}` : ''}
          </p>
        </section>
      </div>
    </div>
  );
}
