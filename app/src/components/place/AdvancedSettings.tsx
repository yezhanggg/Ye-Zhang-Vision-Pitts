// Advanced settings on Analysis > Match: a slate outline row with a gear. Open, it shows the published weights as
// sliders. They only reorder types inside the suggested set; they are not the recommendation. The open/closed state
// reuses the store's `settings` section, which starts collapsed.
import { Settings } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../../lib/store';
import { cx } from '../../lib/format';
import type { Weights } from '../../lib/types';
import WeightPanel from '../WeightPanel';

export default function AdvancedSettings({ weights, onChange, onReset, custom }: { weights: Weights; onChange: (w: Weights) => void; onReset: () => void; custom: boolean }) {
  const open = useApp((s) => s.ui.sections.settings === 'open');
  const setSection = useApp((s) => s.setSection);
  return (
    <div className="rounded-xl ring-1 ring-slate-300">
      <button type="button" aria-expanded={open} onClick={() => setSection('settings', open ? 'collapsed' : 'open')} className={cx('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-small font-semibold text-slate-700 transition hover:bg-slate-50', open && 'rounded-b-none border-b border-slate-200')}>
        <Settings className={cx('h-4 w-4 text-slate-500 transition-transform', open && 'rotate-45')} aria-hidden />
        <span className="flex-1">Advanced settings</span>
        {custom && <span className="rounded-full bg-slate-100 px-2 py-px text-caption font-medium text-slate-600">custom order</span>}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-2 px-3 pb-3 pt-2">
              <p className="text-caption leading-snug text-slate-600">These sliders only reorder the housing types inside the suggested set (the fit order). They are not the recommendation: the rules and your planning inputs decide what is suggested.</p>
              <WeightPanel weights={weights} onChange={onChange} hideTitle slidersOnly accent="#475569" />
              {custom && (
                <button type="button" onClick={onReset} className="text-caption font-semibold text-slate-700 underline-offset-2 hover:underline">
                  Reset to the focus’s published order
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
