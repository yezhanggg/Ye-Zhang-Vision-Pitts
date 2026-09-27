// Advanced settings on Analysis > Match = the VisionPitts standard. Open, it first shows the standard setup for the
// current focus (each factor's published weight in words, from config/scoring.json via presetWeights), then the
// sliders and "Reset to VisionPitts standard". A "Custom" badge and highlighted rows mark any factor that differs.
// The weights only order types inside the suggested set; the rules decide the suggestion. The open/closed state
// reuses the store's `settings` section, which starts collapsed.
import { Settings } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { activeFactors } from '../../lib/data';
import { factorName, weightWord } from '../../lib/copy';
import { presetWeights, useApp } from '../../lib/store';
import { cx } from '../../lib/format';
import { STANCE_LABEL } from '../../lib/place/thresholds';
import type { Stance } from '../../lib/place/types';
import type { Weights } from '../../lib/types';
import WeightPanel from '../WeightPanel';

const num = (v: number) => (Math.round(v * 10) / 10).toString();
const differs = (a: number | undefined, b: number | undefined) => Math.abs((a ?? 0) - (b ?? 0)) > 1e-6;

export default function AdvancedSettings({ focus, weights, onChange, onReset }: { focus: Stance; weights: Weights; onChange: (w: Weights) => void; onReset: () => void; custom?: boolean }) {
  const open = useApp((s) => s.ui.sections.settings === 'open');
  const setSection = useApp((s) => s.setSection);
  const standard = presetWeights(focus);
  const rows = activeFactors.map((f) => ({ id: f.id, name: factorName(f.id, f.label), std: standard[f.id] ?? 0, yours: weights[f.id] ?? 0 }));
  const changed = rows.filter((r) => differs(r.std, r.yours));
  const custom = changed.length > 0;
  return (
    <div className="rounded-xl ring-1 ring-slate-300">
      <button type="button" aria-expanded={open} onClick={() => setSection('settings', open ? 'collapsed' : 'open')} className={cx('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-small font-semibold text-slate-700 transition hover:bg-slate-50', open && 'rounded-b-none border-b border-slate-200')}>
        <Settings className={cx('h-4 w-4 text-slate-500 transition-transform', open && 'rotate-45')} aria-hidden />
        <span className="flex-1">Advanced settings</span>
        {custom ? (
          <span className="rounded-full bg-amber-100 px-2 py-px text-caption font-semibold text-amber-900 ring-1 ring-amber-200">Custom</span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-px text-caption font-medium text-slate-600">VisionPitts standard</span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-3 px-3 pb-3 pt-2">
              <div>
                <div className="text-small font-semibold text-slate-900">VisionPitts standard · {STANCE_LABEL[focus]}</div>
                <p className="mt-0.5 text-caption leading-snug text-slate-600">
                  The published weights for {STANCE_LABEL[focus]}. They only order the suggested housing types; the suggestion itself comes from the rules above.
                </p>
                <table className="mt-1.5 w-full text-caption">
                  <caption className="sr-only">Published weights for {STANCE_LABEL[focus]}</caption>
                  <tbody className="divide-y divide-stone-100">
                    {rows.map((r) => {
                      const d = differs(r.std, r.yours);
                      return (
                        <tr key={r.id} className={cx(d && 'bg-amber-50')}>
                          <th scope="row" className="py-1 pl-1 pr-2 text-left font-medium text-slate-700">{r.name}</th>
                          <td className="py-1 pr-1 text-right text-slate-800">
                            {d ? (
                              <>
                                <span className="text-slate-500">standard: {weightWord(r.std).toLowerCase()} ({num(r.std)})</span>
                                <span className="text-slate-400"> · </span>
                                <span className="font-semibold text-amber-900">yours: {weightWord(r.yours).toLowerCase()} ({num(r.yours)})</span>
                              </>
                            ) : (
                              <span className="font-semibold">{weightWord(r.std)}</span>
                            )}
                            {!d && (
                              <span className="text-slate-400"> ({num(r.std)})</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={onReset}
                disabled={!custom}
                className={cx('w-full rounded-lg px-3 py-1.5 text-small font-semibold ring-1 transition', custom ? 'bg-slate-800 text-white ring-slate-800 hover:bg-slate-700' : 'cursor-default bg-stone-50 text-slate-400 ring-stone-200')}
              >
                {custom ? 'Reset to VisionPitts standard' : 'Using the VisionPitts standard'}
              </button>
              <div className="border-t border-stone-100 pt-2">
                <div className="mb-1 text-caption font-medium text-slate-600">Your weights (drag to try another order)</div>
                <WeightPanel weights={weights} onChange={onChange} hideTitle slidersOnly accent="#475569" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
