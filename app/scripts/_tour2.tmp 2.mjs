import { chromium } from 'playwright';
const out = process.argv[2];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
const cover = (key) => page.evaluate((key) => {
  const t = [...document.querySelectorAll(`[data-tour="${key}"]`)].find((e) => e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }));
  const hole = document.querySelector('[data-tour-ring]');
  if (!t || !hole) return null;
  const a = t.getBoundingClientRect(), b = hole.getBoundingClientRect();
  return Math.max(a.left, 4) >= b.left - 1 && Math.max(a.top, 4) >= b.top - 1 && Math.min(a.right, innerWidth - 4) <= b.right + 1 && Math.min(a.bottom, innerHeight - 4) <= b.bottom + 1;
}, key);
const cardOnScreen = () => page.evaluate(() => { const r = document.querySelector('[role="dialog"]').getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; });
await page.goto('http://localhost:5173/#m=explore');
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('text=New here? Take the quick tour', { timeout: 30000 });
await page.waitForTimeout(2000);
await page.getByRole('button', { name: 'Start tour' }).click();
for (let i = 0; i < 4; i++) { await page.waitForTimeout(2500); await page.getByRole('button', { name: 'Got it' }).click(); }
await page.waitForTimeout(2000);
await page.getByRole('button', { name: /Continue to Analysis/ }).click();
const targets = ['subtabs', 'rail', 'right', 'compare', 'equity-bar', 'equity-levers'];
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(4000);
  const head = (await page.locator('[role="dialog"]').innerText()).split('\n').slice(0, 2).join(' | ');
  console.log(`analysis ${i + 1}:`, JSON.stringify({ head, covered: await cover(targets[i]), cardOnScreen: await cardOnScreen() }));
  await page.screenshot({ path: `${out}/u${i + 1}.png` });
  await page.getByRole('button', { name: i === 5 ? 'Finish' : 'Got it' }).click();
}
await page.waitForTimeout(1200);
console.log('after Finish:', JSON.stringify({ dialog: await page.locator('[role="dialog"]').count(), view: await page.locator('nav[aria-label="Analysis views"] [aria-current="page"]').innerText() }));
console.log('errors:', errors.filter((e) => !/openfreemap|favicon|404|mapterhorn|Failed to fetch|AJAXError/.test(e)));
await browser.close();
