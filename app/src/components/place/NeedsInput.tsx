// "What I need" (plan Tier 2.4): a count of homes, who they are for and the income band, as component state only
// (nothing reaches the URL or the store). lib/place/needs turns them into a required rent, who qualifies, the share
// reached, the yearly rent gap and the scale each type implies. Arithmetic only; the refusals are printed with it.
import { useId, useState } from 'react';
import { needsArithmetic, type NeedsInput as Input, type Population } from '../../lib/place/needs';
import type { HudTable, PlaceMeasures } from '../../lib/place/types';
import { NA } from '../../lib/place/format';
import { cx } from '../../lib/format';
import { SourceLine } from './shared';

const POPS: { value: Population; label: string }[] = [
  { value: 'all', label: 'Any renter household' },
  { value: 'seniors', label: 'Seniors' },
  { value: 'families', label: 'Families' },
];
const BANDS: { value: Input['band']; label: string }[] = [
  { value: 30, label: '≤ 30% AMI' },
  { value: 50, label: '≤ 50% AMI' },
  { value: 80, label: '≤ 80% AMI' },
];

const field = 'rounded-lg bg-white px-2 py-1.5 text-small text-slate-900 ring-1 ring-stone-300 focus:outline-none focus:ring-2 focus:ring-violet-400';

export default function NeedsInput({ place, hud, defaultBand = 50 }: { place: PlaceMeasures; hud: HudTable | null; defaultBand?: Input['band'] }) {
  const id = useId();
  const [homes, setHomes] = useState<string>('');
  const [population, setPopulation] = useState<Population>('all');
  const [band, setBand] = useState<Input['band']>(defaultBand);
  const n = homes.trim() === '' ? null : Number(homes);
  const input: Input = { homes: n != null && Number.isFinite(n) ? n : null, population, band };
  const out = hud ? needsArithmetic(place, hud, input) : null;
  return (
    <div>
      <div className="text-body font-semibold text-slate-900">What I need</div>
      <div className="mb-1.5 text-small text-slate-600">Say how many homes and who they are for; the arithmetic below is all this tool adds. Nothing you type is saved or shared.</div>
      <div className="grid grid-cols-[1fr_1.4fr_1fr] gap-2">
        <label className="block">
          <span className="block text-caption text-slate-600" id={`${id}-homes`}>
            Homes
          </span>
          <input aria-labelledby={`${id}-homes`} type="number" min={1} step={1} inputMode="numeric" placeholder="e.g. 40" value={homes} onChange={(e) => setHomes(e.target.value)} className={cx(field, 'w-full tnum')} />
        </label>
        <label className="block">
          <span className="block text-caption text-slate-600">For whom</span>
          <select value={population} onChange={(e) => setPopulation(e.target.value as Population)} className={cx(field, 'w-full')}>
            {POPS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-caption text-slate-600">Income band</span>
          <select value={band} onChange={(e) => setBand(Number(e.target.value) as Input['band'])} className={cx(field, 'w-full')}>
            {BANDS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ul className="mt-2 space-y-1 rounded-xl bg-white px-3 py-2 text-small leading-snug text-slate-800 ring-1 ring-stone-200/80">
        {out ? (
          out.lines.map((l, i) => (
            <li key={i} className={cx(i === out.lines.length - 1 && 'text-slate-600 italic')}>
              {l}
            </li>
          ))
        ) : (
          <li className="text-amber-900">HUD income limits {NA}: the required rent cannot be computed.</li>
        )}
      </ul>
      <SourceLine className="mt-1">Arithmetic · HUD FY{hud?.metro?.fy ?? 2026} income limits × 30% ÷ 12 (1.5 persons per bedroom; a senior alone = 1 person) · CHAS 2018–22 counts as published · units = the smaller of homes and qualifying households · No pro forma.</SourceLine>
    </div>
  );
}
