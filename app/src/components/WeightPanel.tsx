import { useEffect, useRef, useState } from 'react';
import { activeFactorIds, activeFactors, scoring } from '../lib/data';
import { matchPreset, presetWeights } from '../lib/store';
import { FACTOR_COPY, UI, factorName, shareWords, weightWord } from '../lib/copy';
import { ADVANCED, APP_STANCES, PRESET_NOTE, REFERENCE_HINT, STANCE_MEANING } from '../lib/analysis/copy';
import { cx } from '../lib/format';
import type { Weights } from '../lib/types';
import { Explainer, InfoTip, SectionTitle } from './primitives';

const MAX = 4;

interface Props {
  weights: Weights;
  onChange: (w: Weights) => void;
  accent?: string;
  title?: string;
  compact?: boolean;
  /** The enclosing panel section already shows the title. */
  hideTitle?: boolean;
  /** Start with the sliders open (they also open by themselves whenever the weights match no stance). */
  fineTuneOpen?: boolean;
  /** Only the sliders (Analysis > Match puts the stance choice in its own "Focusing issue" section). */
  slidersOnly?: boolean;
}

/**
 * A stance's weights in words, the factors that leave the baseline first: "Displacement: top priority · Need:
 * important · Market: a little · the rest: some". Read-only use of `weightWord` (lib/copy), which Explore renders too.
 */
export function weightsInWords(w: Weights): string {
  const rows = activeFactors.map((f) => ({ f, v: w[f.id] ?? 0 })).filter((r) => Math.abs(r.v - 1) > 1e-9).sort((a, b) => b.v - a.v);
  const parts = rows.map((r) => `${r.f.short ?? factorName(r.f.id, r.f.label)}: ${weightWord(r.v).toLowerCase()}`);
  if (rows.length < activeFactors.length) parts.push(`${rows.length ? 'the rest' : 'every factor'}: ${weightWord(1).toLowerCase()}`);
  return parts.join(' · ');
}

/**
 * The stance cards (three; Balanced is the equal-weights reference and has no card) plus the Advanced disclosure
 * that holds the published weights as sliders. Slider input is coalesced to one update per animation frame.
 * Advanced is a controlled disclosure: closed by default, it opens whenever the weights match no stance and is
 * never remounted mid-drag.
 */
export default function WeightPanel({ weights, onChange, accent = '#7c3aed', title = UI.whatMatters, compact, hideTitle, fineTuneOpen, slidersOnly }: Props) {
  const [local, setLocal] = useState(weights);
  const raf = useRef(0);
  const pending = useRef<Weights | null>(null);
  useEffect(() => {
    if (!pending.current) setLocal(weights);
  }, [weights]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const push = (w: Weights) => {
    setLocal(w);
    pending.current = w;
    if (!raf.current) {
      raf.current = requestAnimationFrame(() => {
        raf.current = 0;
        if (pending.current) onChange(pending.current);
        pending.current = null;
      });
    }
  };
  const total = activeFactorIds.reduce((s, f) => s + (local[f] ?? 0), 0);
  const preset = matchPreset(local);
  const [open, setOpen] = useState(!!fineTuneOpen || preset === null);
  useEffect(() => {
    if (preset === null) setOpen(true);
  }, [preset]);
  const stances = APP_STANCES.map((id) => scoring.presets.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);

  const sliders = (
    <div className="space-y-3 pt-1">
      {activeFactors.map((f) => {
        const v = local[f.id] ?? 0;
        const share = total > 0 ? v / total : 0;
        const c = FACTOR_COPY[f.id];
        const sw = shareWords(share);
        return (
          <div key={f.id}>
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={`w-${f.id}`} className="flex items-center gap-1 text-small font-medium text-slate-800">
                {factorName(f.id, f.label)}
                {c && <InfoTip label={`What is ${c.name}?`}>{c.meaning}</InfoTip>}
              </label>
              <span className="text-small font-semibold" style={{ color: v > 0 ? accent : '#475569' }}>
                {weightWord(v)}
              </span>
            </div>
            <input id={`w-${f.id}`} type="range" className="weight" min={0} max={MAX} step={0.1} value={v} style={{ ['--pct' as string]: `${(v / MAX) * 100}%`, ['--fill' as string]: accent }} onChange={(e) => push({ ...local, [f.id]: Number(e.target.value) })} aria-label={`${factorName(f.id, f.label)}: how much it counts`} aria-valuetext={`${weightWord(v)}, ${sw}`} />
          </div>
        );
      })}
      {!slidersOnly && <p className="border-t border-stone-100 pt-2 text-caption text-slate-600">{ADVANCED.footer}</p>}
    </div>
  );
  if (slidersOnly) return sliders;

  return (
    <>
      <section>
        {!hideTitle && <SectionTitle>{title}</SectionTitle>}
        {preset === 'balanced' && <div className="mb-2 text-caption text-slate-500">{REFERENCE_HINT}</div>}
        <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label="Stance">
          {stances.map((p) => {
            const on = preset === p.id;
            const w = presetWeights(p.id);
            const meaning = STANCE_MEANING[p.id] ?? p.blurb;
            const note = p.id === 'anti_displacement' ? PRESET_NOTE.anti_displacement : null;
            return (
              <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => push(w)} className={cx('rounded-xl px-3 text-left ring-1 transition-all', compact ? 'py-2' : 'py-2.5', on ? 'bg-white shadow-sm' : 'bg-white/70 ring-stone-200 hover:bg-white hover:ring-stone-300')} style={on ? { boxShadow: `0 0 0 2px ${accent}, 0 4px 14px -8px ${accent}` } : undefined}>
                <div className="flex items-center gap-1.5">
                  <span className={cx('h-3.5 w-3.5 shrink-0 rounded-full border-2', on ? '' : 'border-stone-300')} style={on ? { borderColor: accent, background: `radial-gradient(circle, ${accent} 45%, transparent 50%)` } : undefined} />
                  <span className="text-body font-semibold leading-tight text-slate-900">{p.label}</span>
                </div>
                {!compact && meaning && <div className="mt-1 text-small leading-snug text-slate-800">{meaning}</div>}
                <div className={cx('text-caption text-slate-600', compact ? 'mt-0.5' : 'mt-1')}>{weightsInWords(w)}</div>
                {!compact && note && <div className="mt-1 text-caption text-amber-900/90">{note}</div>}
              </button>
            );
          })}
        </div>
        {!preset && (
          <div className="mt-2 flex items-center justify-between rounded-lg bg-stone-100 px-3 py-1.5 text-small text-slate-700">
            <span>{ADVANCED.custom}</span>
            <button type="button" onClick={() => push(presetWeights(APP_STANCES[0]))} className="font-semibold text-slate-700 underline-offset-2 hover:underline">
              Reset
            </button>
          </div>
        )}
      </section>
      <section className="mt-3">
        <Explainer
          open={open}
          onToggle={setOpen}
          tone="card"
          title={
            <span>
              <span className="block">{ADVANCED.title}</span>
              <span className="block text-caption font-normal text-slate-600">{ADVANCED.sub}</span>
            </span>
          }
        >
          {sliders}
        </Explainer>
      </section>
    </>
  );
}
