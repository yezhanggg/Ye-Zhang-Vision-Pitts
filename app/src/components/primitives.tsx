import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AnimatePresence, animate, motion } from 'motion/react';
import { useApp } from '../lib/store';
import { cx } from '../lib/format';
import type { Conf } from '../lib/types';

/** Number that counts up to its new value (instant in Less-motion mode). */
export function AnimatedNumber({ value, format = (v) => v.toFixed(0), className }: { value: number | null; format?: (v: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef<number | null>(null);
  const lite = useApp((s) => s.lite);
  const fmt = useRef(format);
  fmt.current = format;
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (value == null) {
      node.textContent = '—';
      prev.current = null;
      return;
    }
    const from = prev.current ?? value;
    prev.current = value;
    if (lite || from === value) {
      node.textContent = fmt.current(value);
      return;
    }
    const ctl = animate(from, value, { duration: 0.45, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => (node.textContent = fmt.current(v)) });
    return () => ctl.stop();
  }, [value, lite]);
  return (
    <span ref={ref} className={cx('tnum', className)}>
      {value == null ? '—' : format(value)}
    </span>
  );
}

export function ObservedBadge({ small }: { small?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full bg-emerald-50 font-semibold text-emerald-700 ring-1 ring-emerald-200/80', small ? 'px-1.5 py-px text-caption' : 'px-2 py-0.5 text-caption')}>
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5">
        <circle cx="6" cy="6" r="2.5" fill="currentColor" />
        <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      Observed data
    </span>
  );
}

export function ValuesBadge({ label = 'Your values' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-caption font-semibold text-violet-700 ring-1 ring-violet-200">
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5">
        <path d="M2 3h8M2 6h8M2 9h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="4" cy="3" r="1.3" fill="currentColor" />
        <circle cx="8" cy="6" r="1.3" fill="currentColor" />
        <circle cx="5" cy="9" r="1.3" fill="currentColor" />
      </svg>
      {label}
    </span>
  );
}

const CONF_STYLE: Record<Conf, string> = {
  high: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  low: 'bg-rose-50 text-rose-700 ring-rose-200',
};
export function ConfChip({ conf }: { conf: Conf | null | undefined }) {
  if (!conf) return <span className="rounded-full bg-stone-100 px-1.5 py-px text-caption font-medium text-slate-600 ring-1 ring-stone-200">No data</span>;
  const bars = conf === 'high' ? 3 : conf === 'medium' ? 2 : 1;
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-1.5 py-px text-caption font-medium ring-1', CONF_STYLE[conf])} title={`Confidence: ${conf}`}>
      <span className="flex items-end gap-px">
        {[1, 2, 3].map((i) => (
          <span key={i} className={cx('w-[2px] rounded-sm', i <= bars ? 'bg-current' : 'bg-current opacity-25')} style={{ height: 3 + i * 2 }} />
        ))}
      </span>
      {conf === 'high' ? 'High' : conf === 'medium' ? 'Medium' : 'Low'} confidence
    </span>
  );
}

export function SectionTitle({ children, right, step, sub }: { children: ReactNode; right?: ReactNode; step?: number; sub?: ReactNode }) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-body font-semibold text-slate-900">
          {step != null && <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-900 text-caption font-bold text-white">{step}</span>}
          {children}
        </h3>
        {right}
      </div>
      {sub && <p className="mt-0.5 text-small text-slate-600">{sub}</p>}
    </div>
  );
}

/** Animated disclosure for secondary detail. */
export function Explainer({ title, children, defaultOpen = false, className, tone = 'plain', right }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean; className?: string; tone?: 'plain' | 'card'; right?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={cx(tone === 'card' && 'rounded-xl bg-white ring-1 ring-stone-200/80', className)}>
      <div className={cx('flex items-center justify-between gap-2', tone === 'card' && 'px-3 py-2.5')}>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className={cx('group flex min-w-0 flex-1 items-center gap-1.5 text-left font-semibold', tone === 'card' ? 'text-body text-slate-900' : 'text-small text-violet-700 hover:text-violet-900')}>
          <motion.svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" initial={false} animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.18 }}>
            <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
          <span className="min-w-0">{title}</span>
        </button>
        {right}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div className={cx(tone === 'card' ? 'px-3 pb-3' : 'pt-1.5')}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Small (i) button with a hover / focus tooltip. */
export function InfoTip({ children, label = 'More info', side = 'top', width = 260 }: { children: ReactNode; label?: string; side?: 'top' | 'bottom'; width?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="grid h-4 w-4 place-items-center rounded-full text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-500"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4">
          <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 7.2v3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8" cy="4.9" r=".95" fill="currentColor" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.span role="tooltip" initial={{ opacity: 0, y: side === 'top' ? 4 : -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} style={{ width }} className={cx('pointer-events-none absolute left-1/2 z-[2500] -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-left text-small font-normal normal-case tracking-normal text-white shadow-xl', side === 'top' ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]')}>
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/** Darken a hex color until it reads as text on white (contrast ≥ 4.5:1). */
export function readableColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  let [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  const lum = (x: number, y: number, z: number) => {
    const f = (c: number) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(x) + 0.7152 * f(y) + 0.0722 * f(z);
  };
  for (let i = 0; i < 20 && 1.05 / (lum(r, g, b) + 0.05) < 4.5; i++) {
    r *= 0.88;
    g *= 0.88;
    b *= 0.88;
  }
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

export function Segmented<T extends string>({ value, options, onChange, size = 'sm', full }: { value: T | null; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; size?: 'sm' | 'xs'; full?: boolean }) {
  return (
    <div className={cx('rounded-lg bg-stone-100 p-0.5 ring-1 ring-stone-200/70', full ? 'grid' : 'inline-flex')} style={full ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} className={cx('rounded-md font-medium transition-all', size === 'sm' ? 'px-3 py-1.5 text-small' : 'px-2 py-1 text-caption', value === o.value ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' : 'text-slate-600 hover:text-slate-900')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ background: color, width: size, height: size, boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / .08)' }} />;
}

export function Button({ variant = 'primary', size = 'md', className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost'; size?: 'sm' | 'md' | 'lg' }) {
  const v = {
    primary: 'bg-primary text-white hover:bg-violet-700 shadow-sm',
    secondary: 'bg-white text-slate-800 ring-1 ring-stone-300 hover:ring-stone-400',
    ghost: 'text-slate-700 hover:bg-stone-100',
  }[variant];
  const s = { sm: 'h-8 px-3 text-small', md: 'h-9 px-4 text-body', lg: 'h-11 px-5 text-lead' }[size];
  return <button className={cx('inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition disabled:opacity-40', v, s, className)} {...rest} />;
}

export const Chevron = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={className} aria-hidden>
    <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
