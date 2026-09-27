import { useMemo, useState } from 'react';
import { focusTracts, tractById, tractLabel, typologyById } from '../../lib/data';
import { tLabel, type TractResult } from '../../lib/derived';
import { cx } from '../../lib/format';
import type { TractProps } from '../../lib/types';
import { Dot } from '../primitives';

/** Rows shown per group before "Show all". */
export const FLIP_ROWS = 8;

export interface FlipGroup {
  from: string;
  to: string;
  tracts: TractProps[];
}

const focusRank = new Map(focusTracts.map((t, i) => [t.GEOID, i]));
const byName = (x: TractProps, y: TractProps) => tractLabel(x).localeCompare(tractLabel(y)) || x.GEOID.localeCompare(y.GEOID);

/**
 * Every tract whose best match differs between A and B, grouped by "from → to". Groups come largest first (then by
 * the type order of the config); inside a group the demo neighborhoods come first in demo order, then the rest by
 * name. The group sizes add up to `flips.size`. Pure, so it can be tested without React.
 */
export function flipGroups(resA: Map<string, TractResult>, resB: Map<string, TractResult>, flips: Set<string>): FlipGroup[] {
  const groups = new Map<string, FlipGroup>();
  for (const id of flips) {
    const t = tractById.get(id);
    const from = resA.get(id)?.top, to = resB.get(id)?.top;
    if (!t || !from || !to || from === to) continue;
    const key = `${from}→${to}`;
    let g = groups.get(key);
    if (!g) {
      g = { from, to, tracts: [] };
      groups.set(key, g);
    }
    g.tracts.push(t);
  }
  const order = (k: string) => [...typologyById.keys()].indexOf(k);
  for (const g of groups.values()) {
    g.tracts.sort((x, y) => {
      const fx = focusRank.get(x.GEOID), fy = focusRank.get(y.GEOID);
      if (fx != null && fy != null) return fx - fy;
      if (fx != null) return -1;
      if (fy != null) return 1;
      return byName(x, y);
    });
  }
  return [...groups.values()].sort((x, y) => y.tracts.length - x.tracts.length || order(x.from) - order(y.from) || order(x.to) - order(y.to));
}

function Group({ g, selectedId, onSelect }: { g: FlipGroup; selectedId: string | null; onSelect: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? g.tracts : g.tracts.slice(0, FLIP_ROWS);
  const hidden = g.tracts.length - shown.length;
  return (
    <li data-testid="flip-group" data-from={g.from} data-to={g.to}>
      <div className="flex items-center gap-1.5 text-small font-semibold text-slate-900">
        <Dot color={typologyById.get(g.from)?.color ?? '#64748b'} size={8} />
        {tLabel(g.from)} <span className="text-slate-500">→</span> <Dot color={typologyById.get(g.to)?.color ?? '#64748b'} size={8} />
        {tLabel(g.to)}
        <span className="ml-auto rounded-full bg-stone-100 px-2 py-px text-caption font-semibold text-slate-700 tnum" data-count={g.tracts.length}>{g.tracts.length}</span>
      </div>
      <ul className="mt-1 space-y-0.5">
        {shown.map((t) => (
          <li key={t.GEOID}>
            <button onClick={() => onSelect(t.GEOID)} className={cx('flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-small hover:bg-stone-50', t.GEOID === selectedId && 'bg-violet-50')} aria-current={t.GEOID === selectedId ? 'true' : undefined}>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium text-slate-900">{tractLabel(t)}</span>
                <span className="text-caption text-slate-500"> · {t.name}</span>
              </span>
              {focusRank.has(t.GEOID) && <span className="shrink-0 rounded-md bg-violet-100 px-1.5 py-px text-caption font-semibold text-violet-800">demo</span>}
            </button>
          </li>
        ))}
      </ul>
      {(hidden > 0 || all) && g.tracts.length > FLIP_ROWS && (
        <button onClick={() => setAll((v) => !v)} className="mt-0.5 rounded-lg px-2 py-1 text-caption font-semibold text-violet-700 hover:bg-violet-50 hover:text-violet-900">
          {all ? 'Show fewer' : `Show all ${g.tracts.length}`}
        </button>
      )}
    </li>
  );
}

/** The flip list under the scenario maps: every flipped tract, grouped by from → to, each row selecting its tract. */
export default function FlipList({ resA, resB, flips, selectedId, onSelect }: { resA: Map<string, TractResult>; resB: Map<string, TractResult>; flips: Set<string>; selectedId: string | null; onSelect: (id: string) => void }) {
  const groups = useMemo(() => flipGroups(resA, resB, flips), [resA, resB, flips]);
  if (!groups.length) return <p className="text-small text-slate-700">No tract changes its best match between these scenarios.</p>;
  return (
    <ul className="space-y-3" data-testid="flip-list">
      {groups.map((g) => (
        <Group key={`${g.from}→${g.to}`} g={g} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </ul>
  );
}
