import type { ReactNode } from 'react';

/** SectionTitle one step smaller, for the panels under the compare maps. */
export default function PanelTitle({ children, right, sub }: { children: ReactNode; right?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-1.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-small font-semibold text-slate-900">{children}</h3>
        {right}
      </div>
      {sub && <p className="mt-0.5 text-caption text-slate-600">{sub}</p>}
    </div>
  );
}
