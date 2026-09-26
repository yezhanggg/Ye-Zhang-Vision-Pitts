import { activeFactors, scoring } from '../lib/data';
import { UI, factorName } from '../lib/copy';
import type { MapMetric } from '../lib/store';
import { SectionTitle, Segmented } from './primitives';

const enc = (m: MapMetric) => (m.kind === 'top' || m.kind === 'pick' ? m.kind : `${m.kind}.${m.id}`);
const dec = (s: string): MapMetric => {
  if (s === 'top' || s === 'pick') return { kind: s };
  const [k, id] = s.split('.');
  if (k === 'factor') return { kind: 'factor', id };
  if (k === 'lens') return { kind: 'lens', id: id === 'bivariate' ? 'bivariate' : 'pressure' };
  if (k === 'layer') return { kind: 'layer', id: 'elevation' };
  return { kind: 'typology', id };
};

export default function MetricPicker({ value, onChange, step }: { value: MapMetric; onChange: (m: MapMetric) => void; step?: number }) {
  const main = value.kind === 'top' || value.kind === 'pick' ? value.kind : null;
  return (
    <section>
      <SectionTitle step={step}>{UI.colorBy}</SectionTitle>
      <Segmented full value={main} onChange={(v) => onChange({ kind: v })} options={[{ value: 'top', label: 'Best match' }, { value: 'pick', label: 'Which type wins' }]} />
      <label className="mt-2 block">
        <span className="sr-only">More layers</span>
        <div className="relative">
          <select value={main ? '' : enc(value)} onChange={(e) => e.target.value && onChange(dec(e.target.value))} className={`w-full appearance-none rounded-lg bg-white py-2 pl-3 pr-8 text-small font-medium ring-1 outline-none hover:ring-stone-300 focus:ring-violet-400 ${main ? 'text-slate-600 ring-stone-200' : 'text-slate-900 ring-violet-300'}`}>
            <option value="">More layers…</option>
            <optgroup label="Anti-displacement lens (observed)">
              <option value="lens.pressure">Market pressure from neighbors</option>
              <option value="lens.bivariate">Need × market change (watch list)</option>
            </optgroup>
            <optgroup label="Match score for one housing type">
              {scoring.typologies.map((t) => (
                <option key={t.id} value={`typology.${t.id}`}>
                  {t.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Observed data (compared with other city tracts)">
              {activeFactors.map((f) => (
                <option key={f.id} value={`factor.${f.id}`}>
                  {factorName(f.id, f.label)}
                </option>
              ))}
            </optgroup>
            <optgroup label="Terrain (for reference, not scored)">
              <option value="layer.elevation">Elevation</option>
            </optgroup>
          </select>
          <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500">
            <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      </label>
    </section>
  );
}
