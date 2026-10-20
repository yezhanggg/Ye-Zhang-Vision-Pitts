// The offline single file has almost no room left (docs/assumptions.md §10), so the project cards on the Place page
// and their data must load on demand. This walks the static imports from the app's entry and fails when one of the
// on-demand modules is reachable without a dynamic import().
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = resolve(SRC, 'main.tsx');

/** Modules that must only ever be loaded with import(). */
const ON_DEMAND = [
  'components/place/project/',
  'components/place/TaxCreditSheet.tsx',
  'components/place/SiteConditions.tsx',
  'components/details/ProjectCardsDetails.tsx',
  'components/compare/CompareProject.tsx',
  'components/compare/CompareStudio.tsx',
  'components/place/PlaceRail.tsx',
  'components/TopNav.tsx',
  'components/ChatPill.tsx',
  'components/place/PlaceStudio.tsx',
  'components/place/flat/',
  'lib/policy/',
  'lib/compare/',
  'components/place/finder/',
  'lib/finder/',
  'lib/demand/',
  'lib/zoning/',
  'lib/pencil/',
  'lib/project/',
  'lib/lihtc/',
  'data/lazy/',
];
const onDemand = (file: string) => ON_DEMAND.some((p) => file.slice(SRC.length + 1).startsWith(p));

/** Static import and re-export specifiers (type-only imports are erased and skipped; import() is not matched). */
function staticImports(code: string): string[] {
  const out: string[] = [];
  const from = /(?:^|[\n;])\s*(?:import|export)\s+(?!type[\s{])[^'"`;]*?\bfrom\s+['"]([^'"]+)['"]/g;
  const bare = /(?:^|[\n;])\s*import\s+['"]([^'"]+)['"]/g;
  for (const re of [from, bare]) for (let m = re.exec(code); m; m = re.exec(code)) out.push(m[1]);
  return out;
}

function resolveImport(fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = resolve(dirname(fromFile), spec.replace(/\?.*$/, ''));
  return [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
}

function staticGraph(entry: string): Set<string> {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    if (!/\.(tsx?|jsx?)$/.test(file)) continue;
    for (const spec of staticImports(readFileSync(file, 'utf8'))) {
      const dep = resolveImport(file, spec);
      if (dep && !seen.has(dep)) queue.push(dep);
    }
  }
  return seen;
}

describe('on-demand modules stay out of the main bundle', () => {
  it('finds the entry and walks a real graph', () => {
    const g = staticGraph(ENTRY);
    expect(g.size).toBeGreaterThan(50);
    expect([...g].some((f) => f.endsWith('components/MatchView.tsx'))).toBe(true);
  });

  it('reaches no on-demand module through a static import', () => {
    const reached = [...staticGraph(ENTRY)].filter(onDemand).map((f) => f.slice(SRC.length + 1));
    expect(reached).toEqual([]);
  });

  it('notices a static import of an on-demand module', () => {
    expect(staticImports("import ProjectPanel from './place/project/ProjectPanel';")).toEqual(['./place/project/ProjectPanel']);
    expect(staticImports("const P = lazy(() => import('./place/project/ProjectPanel'));")).toEqual([]);
    expect(staticImports("import type { X } from '../lib/pencil/gap';")).toEqual([]);
  });
});
