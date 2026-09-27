import { useApp, type LayerId } from '../../lib/store';
import { EXPLORE_UI, LAYER_ROWS } from '../../lib/explore/copy';
import { cx } from '../../lib/format';

/** Accessible toggle: a button with aria-pressed, a small track and knob, label and caption. */
export function Switch({ on, onChange, label, caption, id }: { on: boolean; onChange: (on: boolean) => void; label: string; caption?: string; id?: string }) {
  return (
    <button type="button" id={id} aria-pressed={on} onClick={() => onChange(!on)} className={cx('flex w-full items-start gap-3 rounded-xl bg-white px-3 py-2 text-left ring-1 transition', on ? 'ring-violet-200' : 'ring-stone-200/80 hover:ring-stone-300')}>
      <span aria-hidden className={cx('relative mt-0.5 inline-block h-5 w-9 shrink-0 rounded-full transition-colors', on ? 'bg-violet-600' : 'bg-stone-300')}>
        <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', on ? 'translate-x-[18px]' : 'translate-x-0.5')} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-small font-semibold text-slate-900">{label}</span>
        {caption && <span className="block text-caption text-slate-600">{caption}</span>}
      </span>
    </button>
  );
}

/** The map layers as switches (Reduce motion lives in the top-right cluster of the shell). */
export default function LayersPanel() {
  const layers = useApp((s) => s.layers);
  const lite = useApp((s) => s.lite);
  const setLayer = useApp((s) => s.setLayer);
  return (
    <div className="space-y-1.5">
      {LAYER_ROWS.map((row) => {
        const id = row.id as LayerId;
        const caption = id === 'terrain' && lite ? `${row.caption} · ${EXPLORE_UI.terrainOffWhenLite}` : row.caption;
        return <Switch key={id} id={`layer-${id}`} on={!!layers[id]} label={row.label} caption={caption} onChange={(on) => setLayer(id, on)} />;
      })}
      <p className="px-1 pt-1 text-caption text-slate-600">{EXPLORE_UI.flatHint}</p>
    </div>
  );
}
