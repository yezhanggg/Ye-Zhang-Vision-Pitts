import { useEffect, useId, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
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

export function SectionTitle({ children, right, sub }: { children: ReactNode; right?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-body font-semibold text-slate-900">{children}</h3>
        {right}
      </div>
      {sub && <p className="mt-0.5 text-small text-slate-600">{sub}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ motion shared by everything that folds
/** Panels growing out of their tab: quick, with a little give at the end. */
export const SPRING_PANEL = { type: 'spring', stiffness: 360, damping: 30, mass: 0.85 } as const;
/** Small things (tabs, buttons, chevrons): snappier, a touch of bounce. */
export const SPRING_TAB = { type: 'spring', stiffness: 520, damping: 26, mass: 0.7 } as const;
/** Heights opening and closing: settles without overshooting, so nothing shows an empty gap. */
export const SPRING_FOLD = { type: 'spring', stiffness: 380, damping: 38, mass: 0.9 } as const;

/** A round button that folds something away; it leans into the press. */
export function FoldButton({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <motion.button type="button" onClick={onClick} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }} transition={SPRING_TAB} className="rounded-lg p-1.5 text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-label={label} title={label}>
      {children}
    </motion.button>
  );
}

/** Animated disclosure for secondary detail. Uncontrolled by default; pass `open` + `onToggle` to drive it from state. */
export function Explainer({ title, children, defaultOpen = false, className, tone = 'plain', right, open: controlled, onToggle }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean; className?: string; /** `section`: a card whose title band is tinted, for the top-level sections of a panel. */ tone?: 'plain' | 'card' | 'section'; right?: ReactNode; open?: boolean; onToggle?: (open: boolean) => void }) {
  const card = tone !== 'plain';
  const [inner, setInner] = useState(defaultOpen);
  const open = controlled ?? inner;
  const id = useId();
  const toggle = () => {
    const next = !open;
    if (controlled == null) setInner(next);
    onToggle?.(next);
  };
  return (
    <div className={cx(card && 'rounded-xl bg-white ring-1', tone === 'section' ? 'ring-violet-200/70' : card && 'ring-stone-200/80', className)}>
      <div className={cx('flex items-center justify-between gap-2', card && 'px-3 py-2.5', tone === 'section' && cx('rounded-xl bg-violet-50/80 transition-[border-radius]', open && 'rounded-b-none border-b border-violet-100'))}>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={toggle} className={cx('group flex min-w-0 flex-1 items-center gap-1.5 text-left font-semibold', tone === 'section' ? 'text-body text-violet-950' : tone === 'card' ? 'text-body text-slate-900' : 'text-small text-violet-700 hover:text-violet-900')}>
          <motion.svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 transition-transform group-active:scale-75" initial={false} animate={{ rotate: open ? 90 : 0 }} transition={SPRING_TAB}>
            <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
          <span className="min-w-0">{title}</span>
        </button>
        {right}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0, transition: { ...SPRING_FOLD, opacity: { duration: 0.12 } } }} transition={SPRING_FOLD} className="overflow-hidden">
            <motion.div initial={{ y: -8 }} animate={{ y: 0 }} exit={{ y: -8 }} transition={SPRING_FOLD} className={cx(tone === 'section' ? 'px-3 pb-3 pt-2.5' : tone === 'card' ? 'px-3 pb-3 pt-1' : 'px-0.5 pb-0.5 pt-1.5')}>
              {children}
            </motion.div>
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

/** A choice between a few options; the white pill slides sideways to the one that is on. */
export function Segmented<T extends string>({ value, options, onChange, size = 'sm', full, label }: { value: T | null; options: { value: T; label: ReactNode; disabled?: boolean }[]; onChange: (v: T) => void; size?: 'sm' | 'xs'; full?: boolean; label?: string }) {
  const [ref, box] = useSlide(value);
  return (
    <div ref={ref} role="radiogroup" aria-label={label} className={cx('relative rounded-lg bg-stone-100 p-0.5 ring-1 ring-stone-200/70', full ? 'grid' : 'inline-flex')} style={full ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}>
      <SlideBg box={box} className="rounded-md bg-white shadow-sm ring-1 ring-black/5" />
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} data-slide-on={on} disabled={o.disabled} onClick={() => onChange(o.value)} className={cx('relative rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40', size === 'sm' ? 'px-3 py-1.5 text-small' : 'px-2 py-1 text-caption', on ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900')}>
            {o.label}
          </button>
        );
      })}
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

// ------------------------------------------------------------------ sliding highlight for tab strips and segmented controls
export interface SlideBox {
  x: number;
  y: number;
  w: number;
  h: number;
}
/**
 * The active item's box inside its own strip (`offsetLeft` / `offsetTop`, so a parent that is scaling, springing or
 * scrolling cannot pull it off course). Mark the strip with the returned ref (it must be `relative`) and the active
 * item with `data-slide-on`. Re-measures when the value or any size changes.
 */
export function useSlide<T extends HTMLElement = HTMLDivElement>(active: unknown) {
  const ref = useRef<T>(null);
  const [box, setBox] = useState<SlideBox | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const a = el.querySelector<HTMLElement>('[data-slide-on="true"]');
      setBox((prev) => {
        if (!a) return null;
        const next = { x: a.offsetLeft, y: a.offsetTop, w: a.offsetWidth, h: a.offsetHeight };
        return prev && prev.x === next.x && prev.y === next.y && prev.w === next.w && prev.h === next.h ? prev : next;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const c of Array.from(el.children)) ro.observe(c);
    return () => ro.disconnect();
  }, [active]);
  return [ref, box] as const;
}

/** The highlight itself: slides sideways to the active item (height and row follow at once), springy but quick. */
export function SlideBg({ box, className }: { box: SlideBox | null; className?: string }) {
  const lite = useApp((s) => s.lite);
  if (!box) return null;
  return (
    <motion.span
      aria-hidden
      className={cx('pointer-events-none absolute left-0 top-0', className)}
      style={{ y: box.y, height: box.h }}
      initial={false}
      animate={{ x: box.x, width: box.w }}
      transition={lite ? { duration: 0 } : SPRING_TAB}
    />
  );
}
