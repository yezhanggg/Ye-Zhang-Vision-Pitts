import type { ReactNode } from 'react';
import { SectionTitle } from './primitives';

export default function Rail({ children }: { children: ReactNode }) {
  return <aside className="scroll-quiet relative z-10 flex h-full w-[340px] shrink-0 flex-col gap-6 overflow-y-auto border-r border-stone-200/80 bg-[#fbfaf8] px-4 py-4 xl:w-[360px]">{children}</aside>;
}

export function RailSection({ title, children, right, step, sub }: { title?: ReactNode; children: ReactNode; right?: ReactNode; step?: number; sub?: ReactNode }) {
  return (
    <section>
      {title && (
        <SectionTitle step={step} right={right} sub={sub}>
          {title}
        </SectionTitle>
      )}
      {children}
    </section>
  );
}
