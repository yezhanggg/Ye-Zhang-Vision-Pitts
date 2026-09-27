// Shared pieces of the Compare places toolbar: a numbered step label and a 40 px segmented control, so the place
// pickers, the focus and the income level line up at one height.
import type { ReactNode } from "react";
import { cx } from "../../lib/format";

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
}: {
  label: string;
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex h-10 items-stretch gap-0.5 rounded-lg bg-stone-100 p-1 ring-1 ring-stone-200/70"
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cx(
              "whitespace-nowrap rounded-md px-3 text-small font-semibold transition-colors",
              on
                ? "bg-white text-violet-800 shadow-sm ring-1 ring-violet-300"
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
