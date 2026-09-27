import { useEffect, useRef, useState } from 'react';
import { activeFactorIds, activeFactors, scoring } from '../lib/data';
import { matchPreset, presetWeights } from '../lib/store';
import { FACTOR_COPY, PRESET_COPY, UI, factorName, shareWords, weightWord } from '../lib/copy';
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
  fineTuneOpen?: boolean;
}

/** Presets as radio cards plus collapsible sliders. Slider input is coalesced to one update per animation frame. */
export default function WeightPanel({ weights, onChange, accent = '#7c3aed', title = UI.whatMatters, compact, hideTitle, fineTuneOpen }: Props) {
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

  return (
    <>
      <section>
        {!hideTitle && <SectionTitle>{title}</SectionTitle>}
        <div className="grid grid-cols-2 gap-2">
          {scoring.presets.map((p) => {
            const on = preset === p.id;
            return (
              <button key={p.id} onClick={() => push(presetWeights(p.id))} aria-pressed={on} className={cx('rounded-xl px-3 text-left ring-1 transition-all', compact ? 'py-2' : 'py-2.5', on ? 'bg-white shadow-sm' : 'bg-white/70 ring-stone-200 hover:bg-white hover:ring-stone-300')} style={on ? { boxShadow: `0 0 0 2px ${accent}, 0 4px 14px -8px ${accent}` } : undefined}>
                <div className="flex items-center gap-1.5">
                  <span className={cx('h-3.5 w-3.5 shrink-0 rounded-full border-2', on ? '' : 'border-stone-300')} style={on ? { borderColor: accent, background: `radial-gradient(circle, ${accent} 45%, transparent 50%)` } : undefined} />
                  <span className="text-body font-semibold leading-tight text-slate-900">{p.label}</span>
                </div>
                {!compact && (PRESET_COPY[p.id] ?? p.blurb) && <div className="mt-1 text-caption text-slate-600">{PRESET_COPY[p.id] ?? p.blurb}</div>}
              </button>
            );
          })}
        </div>
        {!preset && (
          <div className="mt-2 flex items-center justify-between rounded-lg bg-stone-100 px-3 py-1.5 text-small text-slate-700">
            <span>Custom mix (fine-tuned)</span>
            <button onClick={() => push(presetWeights(scoring.presets[0]?.id ?? 'balanced'))} className="font-semibold text-slate-700 underline-offset-2 hover:underline">
              Reset
            </button>
          </div>
        )}
      </section>
      <section className="mt-3">
        <Explainer
          key={fineTuneOpen ? 'open' : 'closed'}
          defaultOpen={fineTuneOpen}
          tone="card"
          title={
            <span>
              <span className="block">{UI.fineTune}</span>
              <span className="block text-caption font-normal text-slate-600">How much each factor counts</span>
            </span>
          }
        >
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
                  <div className="-mt-0.5 text-caption text-slate-600">{v > 0 ? sw[0].toUpperCase() + sw.slice(1) : 'Left out of the score'}</div>
                </div>
              );
            })}
            <p className="border-t border-stone-100 pt-2 text-caption text-slate-600">These are your judgment calls, not data. Scores use them as weights.</p>
          </div>
        </Explainer>
      </section>
    </>
  );
}
