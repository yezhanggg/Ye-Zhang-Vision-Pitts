// "Export" button with a small menu (Report (PDF), Data (CSV), …). Keyboard accessible; closes on outside click and Escape.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Download, FileText, Sheet, LoaderCircle } from 'lucide-react';
import type { Map as MLMap } from 'maplibre-gl';
import { cx } from '../../lib/format';

export interface ExportItem {
  label: string;
  hint?: string;
  onSelect: () => void | Promise<void>;
  disabled?: boolean;
}

interface Props {
  items: ExportItem[];
  className?: string;
  /** Menu opens toward this side of the button. */
  align?: 'left' | 'right';
  /** Smaller button for dense toolbars. */
  size?: 'sm' | 'md';
  label?: string;
}

const iconFor = (label: string) => (/csv|data/i.test(label) ? Sheet : FileText);

export default function ExportMenu({ items, className, align = 'right', size = 'sm', label = 'Export' }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  const close = useCallback((focusButton = false) => {
    setOpen(false);
    if (focusButton) btn.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open, close]);

  useEffect(() => {
    if (open) itemRefs.current[active]?.focus();
  }, [open, active]);

  const run = async (i: number) => {
    const it = items[i];
    if (!it || it.disabled) return;
    setBusy(i);
    try {
      await it.onSelect();
    } catch (err) {
      console.warn('[export]', err);
    } finally {
      setBusy(null);
      close(true);
    }
  };

  const onMenuKey = (e: React.KeyboardEvent) => {
    const n = items.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % n);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + n) % n);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(n - 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    } else if (e.key === 'Tab') close();
  };

  return (
    <div ref={root} className={cx('relative inline-block', className)}>
      <button
        ref={btn}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setActive(0);
          setOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setActive(e.key === 'ArrowUp' ? items.length - 1 : 0);
            setOpen(true);
          }
        }}
        className={cx(
          'inline-flex items-center gap-1.5 rounded-lg bg-white font-semibold text-slate-700 ring-1 ring-stone-300 transition hover:text-slate-900 hover:ring-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
          size === 'sm' ? 'px-2 py-1 text-caption' : 'px-3 py-1.5 text-small',
          open && 'ring-stone-400 text-slate-900',
        )}
      >
        <Download aria-hidden className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={2.2} />
        {label}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className={cx('absolute z-50 mt-1.5 min-w-[13.5rem] overflow-hidden rounded-xl bg-white p-1 shadow-lg ring-1 ring-stone-200', align === 'right' ? 'right-0' : 'left-0')}
        >
          {items.map((it, i) => {
            const Icon = busy === i ? LoaderCircle : iconFor(it.label);
            return (
              <button
                key={it.label}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitem"
                tabIndex={i === active ? 0 : -1}
                disabled={it.disabled || busy !== null}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(i)}
                className={cx(
                  'flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left outline-none transition disabled:opacity-50',
                  i === active ? 'bg-stone-100' : 'hover:bg-stone-50',
                )}
              >
                <Icon aria-hidden className={cx('mt-0.5 h-4 w-4 shrink-0 text-slate-500', busy === i && 'animate-spin')} strokeWidth={2} />
                <span className="min-w-0">
                  <span className="block text-small font-semibold text-slate-800">{it.label}</span>
                  {it.hint && <span className="block text-caption text-slate-500">{it.hint}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Holds a MapLibre map handed over by `MapView`'s `onMapReady`, for snapshots. */
export function useMapRef() {
  const ref = useRef<MLMap | null>(null);
  const onMapReady = useCallback((m: MLMap) => {
    ref.current = m;
  }, []);
  const getMap = useCallback(() => ref.current, []);
  return { onMapReady, getMap, ref };
}
