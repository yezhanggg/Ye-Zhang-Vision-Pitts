// Smoke test of the single-file export over file://: Explore paints from the bundle, Analysis > Match works, and no
// request ever goes to Supabase (the file must stay offline-safe). Writes docs/screenshots/09-single-file-export.png.
// Run after `npm run export`: node scripts/check_export.mjs
import { chromium } from 'playwright';
const file = new URL('../../export/index.html', import.meta.url).href;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
const supabase = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
page.on('request', (r) => { if (r.url().includes('supabase.co')) supabase.push(r.url()); });
await page.goto(file);
await page.waitForSelector('text=Open VisionPitts', { timeout: 20000 });
await page.click('text=Open VisionPitts');
await page.waitForSelector('text=Boundary', { timeout: 20000 });
// the globe intro runs after Open; cut it short so the rest of the check is deterministic
await page.waitForTimeout(1500);
const skip = page.locator('text=Skip intro');
if (await skip.count()) await skip.first().click();
const protocol = await page.evaluate(() => location.protocol);
if (protocol !== 'file:') throw new Error(`expected the export to run over file:, got ${protocol}`);
await page.waitForTimeout(6000);
await page.getByRole('button', { name: 'Analysis', exact: true }).click();
await page.waitForSelector('text=Start here', { timeout: 20000 });
await page.waitForTimeout(4000);
await page.click('text=Hazelwood');
await page.waitForSelector('text=Best match here', { timeout: 20000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: new URL('../../docs/screenshots/09-single-file-export.png', import.meta.url).pathname });
await browser.close();
const relevant = errors.filter((e) => !/openfreemap|favicon|404|mapterhorn|Failed to fetch|AJAXError|api\/explain/.test(e));
if (supabase.length) {
  console.error('FAIL: the export contacted Supabase over file://', supabase);
  process.exit(1);
}
console.log('single-file export OK over file://; no Supabase requests; console errors:', relevant);
