// Shared pieces of the Compare places toolbar: a numbered step label and a 40 px segmented control, so the place
// pickers, the focus and the income level line up at one height.
import type { ReactNode } from "react";
import { cx } from "../../lib/format";
import { SlideBg, useSlide } from "../primitives";

export function StepLabel({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-slate-600">
      <span className="grid h-4 w-4 place-items-center rounded-full bg-slate-900 text-[10px] font-bold leading-none text-white">
        {n}
      </span>
      {children}
    </div>
  );
}

export function ToolSeg<T extends string>({
  label,
  value,
  options,
  onChange,
  compact = false,
}: {
  /** 32 px tall with smaller text (the one-row Equity & policy bar). */
  compact?: boolean;
  label: string;
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange: (v: T) => void;
}) {
  const [ref, box] = useSlide(value);
  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      className={cx(
        "scroll-quiet relative inline-flex max-w-full items-stretch gap-0.5 overflow-x-auto rounded-lg bg-stone-100 p-1 ring-1 ring-stone-200/70 [&>button]:shrink-0",
        compact ? "h-8" : "h-10",
      )}
    >
      <SlideBg box={box} className="rounded-md bg-white shadow-sm ring-1 ring-violet-300" />
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            data-slide-on={on}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cx(
              "relative whitespace-nowrap rounded-md font-semibold transition-colors",
              compact ? "px-1.5 text-caption" : "px-3 text-small",
              on
                ? "text-violet-800"
                : "text-slate-600 hover:bg-white/60 hover:text-slate-900",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
