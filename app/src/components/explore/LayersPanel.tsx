import { useApp } from '../../lib/store';
import { BOUNDARY_ROWS, EXPLORE_UI, SETTING_ROWS } from '../../lib/explore/copy';
import { cx } from '../../lib/format';
import { Segmented } from '../primitives';
import { hasZoning, useZoningLayer } from '../../lib/explore/zoning';

/** Accessible toggle: a button with aria-pressed, a small track and knob, label and caption. */
export function Switch({ on, onChange, label, caption, id, disabled }: { on: boolean; onChange: (on: boolean) => void; label: string; caption?: string; id?: string; disabled?: boolean }) {
  return (
    <button type="button" id={id} aria-pressed={on} disabled={disabled} onClick={() => onChange(!on)} className={cx('flex w-full items-start gap-3 rounded-xl bg-white px-3 py-2 text-left ring-1 transition', on ? 'ring-violet-200' : 'ring-stone-200/80 hover:ring-stone-300', disabled && 'cursor-not-allowed opacity-60 hover:ring-stone-200/80')}>
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

/** The area (Pittsburgh or the whole county) and the boundaries, one open at a time. */
export function BoundaryPanel() {
  const layers = useApp((s) => s.layers);
  const setLayer = useApp((s) => s.setLayer);
  const A = EXPLORE_UI.area;
  return (
    <div className="space-y-2">
      <div>
        <Segmented
          full
          label={A.label}
          value={layers.city && !layers.muni ? 'city' : 'county'}
          onChange={(v) => setLayer('city', v === 'city')}
          options={[
            { value: 'city', label: A.city, disabled: layers.muni },
            { value: 'county', label: A.county },
          ]}
        />
        {layers.muni && <p className="px-1 pt-1 text-caption text-slate-600">{A.muni}</p>}
      </div>
      <div role="group" aria-label={EXPLORE_UI.layers} className="space-y-1.5">
        {BOUNDARY_ROWS.map((row) => (
          <Switch key={row.id} id={`layer-${row.id}`} on={!!layers[row.id]} label={row.label} caption={row.caption} onChange={(on) => setLayer(row.id, on)} />
        ))}
      </div>
      <ZoningSwitch />
    </div>
  );
}

/** The city zoning map: district polygons colored by family, drawn over whichever boundary is open. */
function ZoningSwitch() {
  const on = useZoningLayer((s) => s.on);
  const set = useZoningLayer((s) => s.set);
  return (
    <div role="group" aria-label="Map layers" className="space-y-1.5 border-t border-stone-200/80 pt-2">
      <Switch id="layer-zoning" on={on} disabled={!hasZoning} label="Zoning districts" caption={hasZoning ? 'City of Pittsburgh zoning map (WPRDC), colored by district family' : 'Zoning map not built yet'} onChange={set} />
    </div>
  );
}

/** How the map looks: buildings, terrain and hill shading, plus the flat-view shortcut. */
export function SettingsPanel() {
  const layers = useApp((s) => s.layers);
  const lite = useApp((s) => s.lite);
  const setLayer = useApp((s) => s.setLayer);
  return (
    <div className="space-y-1.5">
      {SETTING_ROWS.map((row) => (
        <Switch key={row.id} id={`layer-${row.id}`} on={!!layers[row.id]} label={row.label} caption={row.id === 'terrain' && lite ? `${row.caption} · ${EXPLORE_UI.terrainOffWhenLite}` : row.caption} onChange={(on) => setLayer(row.id, on)} />
      ))}
      <p className="px-1 pt-1 text-caption text-slate-600">{EXPLORE_UI.flatHint}</p>
    </div>
  );
}
