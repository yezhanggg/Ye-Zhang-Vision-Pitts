// The project's inputs (levels.ts): numbered groups, always open, in the order the right panel answers them, the same
// at every level and on each side of Compare places. Project (development type, units or floor area, stories, income
// level, unit mix), Capital (the capital stack's basics), Open space, Policies; the Parcel level adds its Site (the lot
// picked), and before a lot is picked offers Project and Find places. Online only: loaded on demand.
import { useMemo, type ReactNode } from 'react';
import { isSeniorAge, LEVEL_LABEL } from '../../../lib/place/plan';
import { DEV_TYPE_LABEL, DEV_TYPES, devTypeOf, isHousing, levelsFor, setDevType, type DevType } from '../../../lib/project/devType';
import { Segmented } from '../PlanInputs';
import CapitalInputs from './CapitalInputs';
import { PolicyPicker } from './Policies';
import { tractById, tractLabel } from '../../../lib/data';
import { zipPlaces } from '../../../lib/equity/zip';
import { cx } from '../../../lib/format';
import { hud as hudTable, placeFor } from '../../../lib/place/data';
import type { Recommendation } from '../../../lib/place/recommend';
import { placeZips, useZipView } from '../../../lib/place/zipView';
import type { PolicyContext } from '../../../lib/policy/applies';
import { zipPolicyCounts } from '../../../lib/policy/zipCounts';
import { useSide } from '../../../lib/project/side';
import type { TractProps } from '../../../lib/types';
import { HomesField, IncomeField, OpenBody, StoriesField, useSiteLot } from '../flat/FlatInputs';
import { useLotDefaults, useProjectRead, useZipModel, type ProjectRead } from './useReview';
import type { HudTable } from '../../../lib/place/types';
import { useBrowse } from './browse';
import { FinderInputs } from '../finder/FinderCard';
import { MixInputs } from '../project/DemandMix';
import { useProjectModel } from '../project/useProjectModel';
import LotCard from './LotCard';
import { INPUT_TITLE, inputsFor, type InputGroup, type Level } from './levels';

const FIELD = 'w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-small text-slate-900 tnum focus:border-violet-500 focus:outline-none';
const NOTE = 'text-small text-slate-600';

/** One numbered group: its heading, then its inputs. */
function Group({ n, id, children }: { n: number; id: InputGroup; children: ReactNode }) {
  return (
    <section data-edit={id} className="border-t border-stone-200/80 pt-3">
      <h3 className="flex items-center gap-1.5 text-small font-bold uppercase tracking-wide text-violet-700">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-semibold text-violet-800 tnum">{n}</span>
        {INPUT_TITLE[id]}
      </h3>
      <div className="space-y-2 pt-2">{children}</div>
    </section>
  );
}

const zipWord = (z: string) => `ZIP ${z} · ${zipPlaces(z, (g) => tractLabel(tractById.get(g)), 2)}`;

/** The ZIP picker at the top of the panel at ZIP level (the map's ZIP outlines pick too). */
export function ZipPicker() {
  const zip = useZipView((s) => s.zip);
  const zips = useMemo(() => [...placeZips].sort(), []);
  return (
    <label className="block">
      <span className="sr-only">ZIP code</span>
      <select className={cx(FIELD, 'py-1.5')} value={zip ?? ''} onChange={(e) => useZipView.getState().set({ zip: e.target.value || null })} aria-label="ZIP code">
        <option value="">Pick a ZIP code…</option>
        {zips.map((z) => (
          <option key={z} value={z}>
            {zipWord(z)}
          </option>
        ))}
      </select>
    </label>
  );
}

/** A floor area in sq ft (commercial: the building; mixed use: the ground floor). */
function SfField({ label }: { label: string }) {
  const side = useSide();
  const sf = side.project((s) => s.commercialSf);
  return (
    <label className="block min-w-0">
      <span className="text-caption text-slate-600">{label}</span>
      <input type="number" min={0} step={500} className={cx(FIELD, 'mt-0.5')} value={sf ?? ''} onChange={(e) => side.project.setState({ commercialSf: e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value))) })} aria-label={label} />
    </label>
  );
}

const TAG = 'rounded px-1 py-px text-[10px] font-semibold ring-1 bg-amber-50 text-amber-900 ring-amber-200';

/** "1 unit, 2 stories suggested for this lot" while the units and stories are still what the lot picked suggested. */
function LotSuggested({ lotKey }: { lotKey: string }) {
  const side = useSide();
  const sug = side.project((s) => s.suggested);
  const stories = side.project((s) => s.stories);
  const homes = side.plan((s) => s.homes);
  if (!sug || sug.lot !== lotKey) return null;
  const parts = [sug.units != null && homes === sug.units ? `${sug.units} unit${sug.units === 1 ? '' : 's'}` : null, sug.stories != null && stories === sug.stories ? `${sug.stories} stor${sug.stories === 1 ? 'y' : 'ies'}` : null].filter(Boolean);
  if (!parts.length) return null;
  return (
    <p className="text-caption text-slate-600" data-lot-suggested>
      <span className={TAG}>suggested</span> {parts.join(', ')} for this lot
    </p>
  );
}

/** Whether the building fits on the lot the project is read on: the review's own check, so both panels agree. */
function FitLine({ read }: { read: ProjectRead | null }) {
  const fit = read?.check.fit;
  if (!fit) return null;
  return (
    <p className={cx('text-small', fit.fits ? 'text-emerald-700' : 'text-rose-700')} title={read!.check.rows.find((r) => r.key === 'floor')?.text}>
      {fit.fits ? 'Fits on the lot' : `Too big for the lot: about ${fit.units} unit${fit.units === 1 ? '' : 's'} fit`}
    </p>
  );
}

/** The type of development, then its size, its stories, its income level and its unit mix. */
function ProjectGroup({ m, lotHomes, lotKey }: { m: ReturnType<typeof useProjectModel>; lotHomes: number | null; lotKey?: string }) {
  const side = useSide();
  const project = side.project();
  const level = side.plan((s) => s.level);
  const senior = side.plan((s) => isSeniorAge(s.age));
  const type: DevType = devTypeOf(project, level, senior);
  const levels = levelsFor(type);
  const mine = m?.mix.mode === 'mine';
  return (
    <>
      <Segmented label="Development type" options={DEV_TYPES.map((d) => d.id)} value={type} onChange={(v) => setDevType(side, v)} text={(v) => DEV_TYPE_LABEL[v]} cols={3} tip={(v) => DEV_TYPES.find((d) => d.id === v)?.line ?? ''} />
      <div className="grid grid-cols-2 gap-2">
        {isHousing(type) ? <HomesField mix={m?.mix ?? null} lotHomes={lotHomes} label="Units" /> : <SfField label="Floor area, sq ft" />}
        <StoriesField />
      </div>
      {lotKey && <LotSuggested lotKey={lotKey} />}
      {type === 'mixed' && <SfField label="Ground-floor commercial, sq ft" />}
      {levels.length > 1 &&
        (mine ? (
          <IncomeField mix={m!.mix} />
        ) : (
          <Segmented label="Income level" options={levels} value={levels.includes(level) ? level : levels[0]} onChange={(v) => side.plan.getState().setPlan({ level: v })} text={(v) => LEVEL_LABEL[v]} cols={levels.length} />
        ))}
      {isHousing(type) && m && <MixInputs mix={m.mix} head="Units" />}
    </>
  );
}

function PlaceInputs({ level, t, rec }: { level: Level; t: TractProps | null; rec: Recommendation | null }) {
  const side = useSide();
  const place = t ? placeFor(t.GEOID) : null;
  const m = useProjectModel(t?.GEOID, place, hudTable);
  const site = useSiteLot(t, m, rec);
  const lot = side.project((s) => (t ? s.sites[t.GEOID]?.lot : undefined));
  const pinIzo = side.project((s) => (t ? s.sites[t.GEOID]?.pin?.izo : undefined));
  const ctx: PolicyContext | null = t && m ? { label: tractLabel(t), place, cap: m.cap, homes: m.mix.homes, branch: m.branch, qctOrDda: m.qctOrDda, qct: m.base.qct, score: m.sheet.score, draftSheet: false, pinIzo } : null;
  const parcel = level === 'parcel';

  const type = devTypeOf(side.project(), side.plan((s) => s.level), side.plan((s) => isSeniorAge(s.age)));
  const read = useProjectRead({ scope: level, m, devType: type, place, hud: hudTable as HudTable, lot: parcel ? lot : undefined });
  useLotDefaults(parcel ? m : null, type, lot);
  const body = (g: InputGroup): ReactNode => {
    switch (g) {
      case 'site':
        return lot ? <LotCard lot={lot} izo={pinIzo} /> : <p className={NOTE}>No lot yet.</p>;
      case 'who':
        return null;
      case 'project':
        return <ProjectGroup m={m} lotHomes={parcel ? (site?.homes ?? null) : null} lotKey={parcel && lot ? `${lot.chunk}:${lot.row}` : undefined} />;
      case 'money':
        return !isHousing(type) ? <p className={NOTE}>Commercial: zoning check only.</p> : m ? <CapitalInputs m={m} devType={type} scope={level} /> : null;
      case 'open':
        return m && isHousing(type) ? (
          <>
            <OpenBody m={m} lot={null} />
            <FitLine read={read} />
          </>
        ) : (
          <p className={NOTE}>For housing projects.</p>
        );
      case 'policy':
        return <PolicyPicker ctx={ctx} />;
      case 'finder':
        return <FinderInputs />;
    }
  };

  return (
    <div className="space-y-3" data-level-inputs={level}>
      {inputsFor(level, !!t).map((g, i) => (
        <Group key={g} n={i + 1} id={g}>
          {body(g)}
        </Group>
      ))}
    </div>
  );
}

function ZipInputs() {
  const zip = useZipView((s) => s.zip);
  const side = useSide();
  const m = useZipModel(zip);
  const counts = useMemo(() => (zip ? zipPolicyCounts(zip) : null), [zip]);
  const type = devTypeOf(side.project(), side.plan((s) => s.level), side.plan((s) => isSeniorAge(s.age)));
  const read = useProjectRead({ scope: 'zip', m, devType: type, place: null, hud: hudTable as HudTable, zip });
  const body = (g: InputGroup): ReactNode => {
    switch (g) {
      case 'project':
        return <ProjectGroup m={m} lotHomes={null} />;
      case 'money':
        return !isHousing(type) ? <p className={NOTE}>Commercial: zoning check only.</p> : m ? <CapitalInputs m={m} devType={type} scope="zip" /> : null;
      case 'open':
        return m && isHousing(type) ? (
          <>
            <OpenBody m={m} lot={null} />
            <FitLine read={read} />
          </>
        ) : (
          <p className={NOTE}>For housing projects.</p>
        );
      default:
        return <PolicyPicker ctx={null} counts={counts} />;
    }
  };
  return (
    <div className="space-y-3" data-level-inputs="zip">
      {inputsFor('zip', !!zip).map((g, i) => (
        <Group key={g} n={i + 1} id={g}>
          {body(g)}
        </Group>
      ))}
    </div>
  );
}

/** The project's inputs for one side of Compare places (the side in context), read as at the Tract level. */
export function ProjectInputs({ t, rec }: { t: TractProps; rec: Recommendation | null }) {
  return <PlaceInputs level="tract" t={t} rec={rec} />;
}

export default function LevelInputs({ t, rec }: { t: TractProps | null; rec: Recommendation | null }) {
  const level = useZipView((s) => s.area);
  const mode = useBrowse((s) => s.mode);
  if (mode === 'browse')
    return (
      <div className="space-y-2 border-t border-stone-200/80 pt-3 text-small leading-snug text-slate-700" data-browse-note>
        <p>{level === 'parcel' ? 'Pick a lot.' : level === 'zip' ? 'Pick a ZIP code.' : 'Pick a neighborhood.'} See what it needs most, then test the best fit.</p>
      </div>
    );
  return level === 'zip' ? <ZipInputs /> : <PlaceInputs level={level} t={t} rec={rec} />;
}
