// The place and comparison reports online name your screens where the offline builders name a focusing issue: the
// builders (lib/export/builders) are shared with the offline file, so the online views rewrite their output here.
import type { Report, ReportBlock } from '../export/report';

/** Every mention of the stance label replaced by the screens' words; a "Focusing issue" row becomes "Screens". */
export function swapStance(r: Report, stanceLabel: string, words: string): Report {
  const swap = (x: string) => x.split(stanceLabel).join(words);
  const blocks: ReportBlock[] = r.blocks.map((b) => {
    switch (b.kind) {
      case 'kv':
        return { ...b, rows: b.rows.map(([k, v]) => (k === 'Focusing issue' ? (['Screens', words] as [string, string]) : ([k, swap(v)] as [string, string]))) };
      case 'text':
      case 'callout':
      case 'heading':
        return { ...b, text: swap(b.text) };
      case 'list':
        return { ...b, items: b.items.map(swap) };
      case 'image':
        return { ...b, caption: b.caption ? swap(b.caption) : b.caption };
      case 'table':
        return { ...b, rows: b.rows.map((row) => row.map((c) => (typeof c === 'string' ? swap(c) : c))), note: b.note ? swap(b.note) : b.note };
    }
  });
  return { ...r, subtitle: r.subtitle ? swap(r.subtitle) : r.subtitle, blocks };
}

/** Blocks added before the report's "You decide" heading (or at the end). */
export function insertBefore(r: Report, test: RegExp, add: ReportBlock[]): Report {
  const blocks = [...r.blocks];
  const at = blocks.findIndex((b) => b.kind === 'heading' && test.test(b.text));
  blocks.splice(at < 0 ? blocks.length : at, 0, ...add);
  return { ...r, blocks };
}
