// "Under each stance": three rows, one per stance, with the recommendation's lead and the top of the fit order
// under that stance's published weights, plus a close-call word when the top two are close. The current stance is
// marked; clicking a row applies that stance (its weights) to the page.
import { STANCE_MEANING } from '../../lib/analysis/copy';
import { cx } from '../../lib/format';
import { Dot } from '../primitives';
import { SourceLine } from './shared';

export interface StanceRow {
  /** Preset id ('anti_displacement' | 'market_led' | 'transit_first'). */
  stance: string;
  label: string;
  /** The recommendation's lead sentence under this stance. */
  lead: string;
  /** The top of the fit order under this stance's weights, as a label, or null when nothing is ranked. */
  fitTop: string | null;
  fitColor?: string | null;
  /** "close call with Senior housing" or "tie" when the top two are close; null when the lead is clear. */
  closeCall: string | null;
}

export default function StanceTable({ rows, current, onPick }: { rows: StanceRow[]; current: string | null; onPick?: (stance: string) => void }) {
  if (!rows.length) return null;
  return (
    <div>
      <div className="mb-1.5 text-body font-semibold text-slate-900">Under each stance</div>
      <div className="divide-y divide-stone-100 overflow-hidden rounded-xl bg-white ring-1 ring-stone-200/80">
        {rows.map((r) => {
          const on = r.stance === current;
          return (
            <button key={r.stance} type="button" onClick={() => onPick?.(r.stance)} aria-pressed={on} title={STANCE_MEANING[r.stance]} className={cx('block w-full px-3 py-2 text-left transition-colors hover:bg-stone-50', on && 'bg-violet-50/70')}>
              <div className="flex items-center justify-between gap-2">
                <span className={cx('text-small font-semibold', on ? 'text-violet-800' : 'text-slate-900')}>
                  {r.label}
                  {on && <span className="ml-1.5 rounded-full bg-violet-100 px-1.5 text-caption font-semibold text-violet-700">current</span>}
                </span>
                <span className="flex items-center gap-1.5 text-caption text-slate-700">
                  {r.fitColor && <Dot color={r.fitColor} size={8} />}
                  {r.fitTop ? `fit order: ${r.fitTop} first` : 'not ranked'}
                  {r.closeCall && <span className="text-amber-800"> · {r.closeCall}</span>}
                </span>
              </div>
              <div className="mt-0.5 text-small text-slate-800">{r.lead}</div>
            </button>
          );
        })}
      </div>
      <SourceLine className="mt-1">Each row applies that stance’s published weights and rules to this place. Click a row to read the page under it.</SourceLine>
    </div>
  );
}
