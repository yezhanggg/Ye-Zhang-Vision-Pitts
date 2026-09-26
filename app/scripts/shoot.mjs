// Smoke test + screenshots against the dev server (or a URL in argv[2]). Writes docs/screenshots/*.png.
// Shots follow the app's two sections: Explore (01-02), Analysis (03-06, 08) and the Sources modal (07).
// The single-file export shot (09-single-file-export.png) comes from scripts/check_export.mjs.
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:5173';
const out = new URL('../../docs/screenshots/', import.meta.url).pathname;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
const shot = async (name, ms = 2500) => { await page.waitForTimeout(ms); await page.screenshot({ path: `${out}${name}.png` }); console.log('shot', name); };
const open = async (hash, waitFor) => { await page.goto(`${base}/${hash}`); await page.reload({ waitUntil: 'networkidle' }); if (waitFor) await page.waitForSelector(waitFor, { timeout: 25000 }); };
const W = 'w=need:2,market_strength:0.5,displacement_risk:3,subsidy_eligible:1.5,transit_access:1,flood_exposure:1';

// Explore: what the app opens on (default layers, intro card).
await open('#m=explore', 'text=Layers');
await shot('01-explore', 5000);
// Explore: block groups colored by median gross rent, with tracts and the city limits on.
await open('#m=explore&g=bg&v=med_gross_rent&L=buildings,tracts,bg,city', 'text=Median gross rent');
await shot('02-explore-rent-bg', 5000);
// Analysis > Match: Hazelwood under anti-displacement weights.
await open(`#m=match&t=42003562300&${W}&c=top`, 'text=Best match here');
await shot('03-match-hazelwood', 4500);
// Analysis > Match: the watch-list lens (need x market change), no tract selected.
await open('#m=match&c=lens.bivariate', 'text=Start here');
await shot('04-watch-list', 4000);
await open('#m=tracts&t=42003562300&b=42003140300&c=top', 'text=Why they differ');
await shot('05-compare-tracts', 4500);
await open('#m=scenarios&t=42003562300', 'text=How the two scenarios weigh things');
await shot('06-compare-scenarios', 4500);
// Sources & method: logo -> About -> Sources.
await page.click('[title="About VisionPitts"]');
await page.getByRole('button', { name: 'Sources', exact: true }).click();
await page.waitForSelector('text=Observed data: where the numbers come from', { timeout: 25000 });
await shot('07-sources', 1500);
// Analysis > Match: the asking-rent information layer (licensed listings, never scored).
await open(`#m=match&${W}&c=info.rent_growth_existing`, 'text=Start here');
await shot('08-asking-rents', 4500);
console.log('console errors:', errors.filter((e) => !/openfreemap|favicon|404|api\/explain|mapterhorn|Failed to fetch|AJAXError/.test(e)));
await browser.close();
