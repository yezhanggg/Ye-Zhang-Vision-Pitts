// Smoke test + screenshots against the dev server (or a URL in argv[2]). Writes docs/screenshots/*.png.
// Shots: landing (00), then the app's two sections: Explore (01-02, 10-12), Analysis (03-06, 08) and the Sources window (07).
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

// Landing page: the live hero map and the four doors.
await page.goto(`${base}/`);
await page.waitForSelector('text=Open VisionPitts', { timeout: 25000 });
await shot('00-landing', 6000);
// Explore: the first screen after Open (deep links skip the globe intro).
await open('#m=explore', 'text=Boundary');
await shot('01-explore', 5000);
// Explore: block groups colored by median gross rent, Pittsburgh only.
await open('#m=explore&g=bg&v=med_gross_rent&L=buildings,bg,city', 'text=Median gross rent');
await shot('02-explore-rent-bg', 5000);
// Analysis > Match: Hazelwood under anti-displacement weights.
await open(`#m=match&t=42003562300&${W}&c=top`, 'text=Best match here');
await shot('03-match-hazelwood', 4500);
// Analysis > Match: the watch-list lens (need x market change), no tract selected.
await open('#m=match&c=lens.bivariate', 'text=Start here');
await shot('04-watch-list', 4000);
await open('#m=tracts&t=42003562300&b=42003140300&c=top', 'text=Why they differ');
await shot('05-compare-tracts', 4500);
await open('#m=scenarios&t=42003562300', '[data-testid=policy-popover-button]');
await shot('06-compare-scenarios', 4500);
// Details (the project, its data and method, its limits, what comes next): Home -> the Details door -> Data & method.
await page.click('[title="Back to the start page"]');
await page.waitForSelector('text=Open VisionPitts', { timeout: 25000 });
await page.locator('button', { hasText: 'What the project has' }).click();
await page.getByRole('button', { name: 'Data & method' }).click();
await page.waitForSelector('text=Observed data: where the numbers come from', { timeout: 25000 });
await shot('07-sources', 1500);
// About: the author.
await page.keyboard.press('Escape');
await page.mouse.click(20, 20);
await page.locator('button', { hasText: 'Who built this' }).click();
await page.waitForSelector('text=Background', { timeout: 25000 });
await shot('12-about', 1200);
// Analysis > Match: the asking-rent information layer (licensed listings, never scored).
await open(`#m=match&${W}&c=info.rent_growth_existing`, 'text=Start here');
await shot('08-asking-rents', 4500);
// Explore: the place summary for a tract (tiles, tenure, stock, cost burden, 2014-2024 lines, the matchmaker block),
// with the question box and its suggested prompts above it.
await open('#m=explore&L=buildings,terrain,tracts,city&u=tract:42003562300', 'text=Who lives here');
await shot('10-place-summary', 4500);
// Explore: one variable for a municipality (rank, distribution, city/county bars, 2014-2024 line).
await open('#m=explore&L=buildings,muni,city&g=muni&v=med_gross_rent&u=muni:4200366264', 'text=How this compares');
await shot('11-municipality-detail', 4500);
// The quick tour, step 3: the summary panel lit, the rest dimmed, the map flown to Hazelwood.
await open('#m=explore', 'text=Boundary');
await page.waitForTimeout(3000);
await page.getByRole('button', { name: 'Tour', exact: true }).click();
await page.waitForTimeout(1200);
await page.getByRole('button', { name: 'Got it' }).click();
await page.waitForTimeout(3500);
await page.getByRole('button', { name: 'Got it' }).click();
await shot('13-tour', 4500);
await page.keyboard.press('Escape');
console.log('console errors:', errors.filter((e) => !/openfreemap|favicon|404|api\/explain|mapterhorn|Failed to fetch|AJAXError/.test(e)));
await browser.close();
