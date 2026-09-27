/**
 * Printable reports. A `Report` is plain data (built by pure functions, easy to test);
 * `renderReportHtml` turns it into a standalone print document and `printReport` prints it
 * from a hidden iframe so the person can choose "Save as PDF".
 */
import type { Map as MLMap } from 'maplibre-gl';

export type ReportBlock =
  | { kind: 'heading'; text: string; /** 3 = a sub-heading inside a section. */ level?: 2 | 3 }
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'kv'; rows: [string, string][] }
  | { kind: 'table'; columns: string[]; rows: (string | number)[][]; note?: string; align?: ('left' | 'right')[]; /** A color chip before each row's first cell (legend tables). */ swatches?: (string | null)[] }
  | { kind: 'image'; src: string; caption?: string }
  | { kind: 'callout'; text: string };

export interface Report {
  title: string;
  subtitle?: string;
  blocks: ReportBlock[];
  sources?: string[];
  footer?: string;
  /** Suggested PDF file name (the print dialog uses the document title), e.g. from `exportFilename(...)`. */
  filename?: string;
}

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function longDate(d = new Date()): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Numbers, money, percents, ranges of those, and "—" read as numeric and align right. */
const NUMERIC = /^[\s(]*[−\-+~≈<>]?\s?\$?\d[\d,]*(\.\d+)?\s?(%|k|K|M|x|×)?(\s?(–|-|to)\s?[−\-]?\$?\d[\d,]*(\.\d+)?\s?(%|k|K|M)?)?[)\s]*(\s?(ft|mi|min|yr|yrs|units?|homes?|people|households|pp|\/mo|\/yr|per sq mi|sq mi|acres?|feet))?\s*$/;
export const isNumericCell = (v: string | number) => typeof v === 'number' || NUMERIC.test(v) || v === '—' || v === '–';

function fmtCell(v: string | number): string {
  if (typeof v === 'number') return Number.isFinite(v) ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—';
  return v;
}

function tableHtml(b: Extract<ReportBlock, { kind: 'table' }>): string {
  const n = b.columns.length;
  const align = b.columns.map((_, i) => {
    if (b.align?.[i]) return b.align[i];
    if (i === 0) return 'left';
    const vals = b.rows.map((r) => r[i]).filter((v) => v !== '' && v != null);
    return vals.length > 0 && vals.every((v) => isNumericCell(v as string | number)) ? 'right' : 'left';
  });
  const th = b.columns.map((c, i) => `<th class="${align[i]}">${esc(c)}</th>`).join('');
  const rows = b.rows
    .map((r, ri) => {
      const sw = b.swatches?.[ri];
      return `<tr>${Array.from({ length: n }, (_, i) => `<td class="${align[i]}">${i === 0 && sw ? `<span class="sw" style="background:${esc(sw)}"></span>` : ''}${esc(fmtCell(r[i] ?? ''))}</td>`).join('')}</tr>`;
    })
    .join('');
  const head = b.columns.some((c) => c.trim() !== '') ? `<thead><tr>${th}</tr></thead>` : '';
  return `<figure class="tbl"><table class="cols-${n}${head ? '' : ' nohead'}">${head}<tbody>${rows}</tbody></table>${b.note ? `<figcaption>${esc(b.note)}</figcaption>` : ''}</figure>`;
}

function blockHtml(b: ReportBlock): string {
  switch (b.kind) {
    case 'heading':
      return b.level === 3 ? `<h3>${esc(b.text)}</h3>` : `<h2>${esc(b.text)}</h2>`;
    case 'list':
      return `<ul class="list">${b.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    case 'text':
      return `<p>${esc(b.text)}</p>`;
    case 'callout':
      return `<aside class="callout">${esc(b.text)}</aside>`;
    case 'kv':
      return `<dl class="kv">${b.rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
    case 'table':
      return tableHtml(b);
    case 'image':
      return `<figure class="img"><img src="${esc(b.src)}" alt="${esc(b.caption ?? 'Map')}"/>${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}</figure>`;
  }
}

export const reportFooter = (date = new Date()) => `VisionPitts · generated ${longDate(date)} · evidence, not a decision — decisions belong to people`;

const CSS = `
@page { size: Letter; margin: 0.6in 0.6in 0.75in;
  @bottom-right { content: counter(page) ' / ' counter(pages); font: 7.5pt/1 -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; color: #8a8f98; }
}
:root { --ink: #1c2230; --muted: #5c6370; --faint: #8a8f98; --rule: #e3e5e9; --zebra: #f6f7f9; --accent: #5b3fd1; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
body { color: var(--ink); font: 9.5pt/1.45 -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-variant-numeric: tabular-nums; }
.page { max-width: 7.3in; margin: 0 auto; }
header.top { display: flex; align-items: flex-end; justify-content: space-between; border-bottom: 2px solid var(--ink); padding-bottom: 6pt; margin-bottom: 14pt; }
.brand { display: flex; align-items: center; gap: 6pt; font-weight: 700; font-size: 11pt; letter-spacing: -0.01em; }
.brand .mark { width: 14pt; height: 14pt; border-radius: 3pt; background: linear-gradient(135deg, #7c5cff, #3b82f6); display: inline-block; }
.brand .v { color: var(--accent); }
.meta { text-align: right; font-size: 8pt; color: var(--muted); line-height: 1.35; }
.meta b { color: var(--ink); font-weight: 600; }
h1 { font-size: 19pt; line-height: 1.15; margin: 0 0 3pt; letter-spacing: -0.015em; font-weight: 700; }
.subtitle { margin: 0 0 12pt; color: var(--muted); font-size: 10.5pt; }
h2 { font-size: 11pt; margin: 16pt 0 6pt; padding-bottom: 3pt; border-bottom: 1px solid var(--rule); letter-spacing: 0.005em; break-after: avoid; page-break-after: avoid; }
h3 { font-size: 9.8pt; margin: 11pt 0 4pt; color: var(--ink); break-after: avoid; page-break-after: avoid; }
p { margin: 0 0 6pt; }
ul.list { margin: 2pt 0 8pt; padding-left: 13pt; }
ul.list li { margin: 0 0 3pt; }
.callout { border-left: 3px solid var(--accent); background: #f4f1ff; padding: 7pt 10pt; margin: 8pt 0 10pt; font-size: 9.5pt; break-inside: avoid; page-break-inside: avoid; }
dl.kv { display: grid; grid-template-columns: 1fr 1fr; column-gap: 18pt; margin: 4pt 0 8pt; }
dl.kv div { display: flex; justify-content: space-between; gap: 10pt; border-bottom: 1px solid var(--rule); padding: 3pt 0; break-inside: avoid; }
dl.kv dt { color: var(--muted); }
dl.kv dd { margin: 0; font-weight: 600; text-align: right; }
figure { margin: 4pt 0 10pt; }
figure.tbl, figure.img { break-inside: avoid; page-break-inside: avoid; }
table { width: 100%; border-collapse: collapse; font-size: 8.8pt; }
thead th { text-align: left; font-weight: 600; color: var(--muted); font-size: 7.8pt; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1.2px solid var(--ink); padding: 3pt 6pt 3pt; vertical-align: bottom; }
tbody td { padding: 3.2pt 6pt; border-bottom: 1px solid var(--rule); vertical-align: top; }
tbody tr:nth-child(even) td { background: var(--zebra); }
th:first-child, td:first-child { padding-left: 4pt; }
.right { text-align: right; white-space: nowrap; }
table.cols-2:not(.nohead) { width: 72%; }
table.nohead td:first-child { width: 1.45in; color: var(--muted); font-weight: 600; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.03em; padding-top: 4pt; }
table.nohead tbody tr:first-child td { border-top: 1.2px solid var(--ink); }
table.nohead tbody tr:nth-child(even) td { background: none; }
.left { text-align: left; }
.sw { display: inline-block; width: 16pt; height: 8pt; border-radius: 2pt; margin-right: 6pt; vertical-align: -0.5pt; box-shadow: inset 0 0 0 0.5pt rgba(0,0,0,.15); }
figcaption { color: var(--faint); font-size: 7.8pt; margin-top: 3pt; }
figure.img img { display: block; width: 100%; max-height: 3.3in; object-fit: cover; border: 1px solid var(--rule); border-radius: 3pt; }
section.sources { margin-top: 16pt; break-inside: avoid; page-break-inside: avoid; }
section.sources ol { margin: 0; padding-left: 14pt; color: var(--muted); font-size: 8pt; }
section.sources li { margin: 1pt 0; }
footer.end { margin-top: 18pt; padding-top: 5pt; border-top: 1px solid var(--rule); color: var(--faint); font-size: 7.5pt; }
@media screen { body { background: #eceef1; } .page { background: #fff; padding: 0.6in; margin: 16px auto; box-shadow: 0 1px 4px rgba(0,0,0,.12); max-width: 8.5in; } }
`;

/** A standalone HTML print document for a report. Pure: no DOM access. */
export function renderReportHtml(r: Report, date = new Date()): string {
  const footer = r.footer ?? reportFooter(date);
  const docTitle = r.filename ? r.filename.replace(/\.pdf$/i, '') : `VisionPitts — ${r.title}`;
  const footerCss = `@page { @bottom-left { content: "${footer.replace(/"/g, '\\"')}"; font: 7.5pt/1 -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; color: #8a8f98; } }`;
  const sources = r.sources?.length
    ? `<section class="sources"><h2>Sources</h2><ol>${r.sources.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></section>`
    : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(docTitle)}</title><style>${CSS}${footerCss}</style></head><body><div class="page">
<header class="top"><div class="brand"><span class="mark"></span><span>Vision<span class="v">Pitts</span></span></div><div class="meta"><b>City of Pittsburgh</b><br>${esc(longDate(date))}</div></header>
<h1>${esc(r.title)}</h1>${r.subtitle ? `<p class="subtitle">${esc(r.subtitle)}</p>` : ''}
${r.blocks.map(blockHtml).join('\n')}
${sources}
<footer class="end">${esc(footer)}</footer>
</div></body></html>`;
}

/** Render the report into a hidden iframe and open the print dialog ("Save as PDF"). */
export function printReport(r: Report): void {
  const html = renderReportHtml(r);
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.title = 'Report print frame';
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0', visibility: 'hidden' });
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const prevTitle = document.title;
  const cleanup = () => {
    document.title = prevTitle;
    setTimeout(() => frame.remove(), 500);
  };
  const go = () => {
    // Some browsers name the PDF after the top document's title.
    document.title = doc.title;
    win.addEventListener('afterprint', cleanup, { once: true });
    win.focus();
    win.print();
    // Safari/Firefox may not fire afterprint from an iframe; clean up eventually.
    setTimeout(() => {
      if (frame.isConnected) cleanup();
    }, 60_000);
  };
  const imgs = Array.from(doc.images);
  const pending = imgs.filter((i) => !i.complete);
  if (pending.length === 0) setTimeout(go, 50);
  else {
    let left = pending.length;
    const done = () => {
      left -= 1;
      if (left === 0) setTimeout(go, 50);
    };
    pending.forEach((i) => {
      i.addEventListener('load', done, { once: true });
      i.addEventListener('error', done, { once: true });
    });
  }
}

/**
 * Image data URL of the map's current view. The canvas has no preserveDrawingBuffer, so the pixels
 * are read inside the next 'render' event, while the frame is still in the buffer.
 */
export interface SnapshotOptions {
  /** CSS pixels to cut from each edge (the parts of the map hidden under floating panels). */
  crop?: Partial<{ top: number; right: number; bottom: number; left: number }>;
  /** Longest edge of the output in device pixels (default 2000). */
  maxWidth?: number;
}

export function mapSnapshot(map: MLMap | null, opts: SnapshotOptions = {}): Promise<string | null> {
  if (!map) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v: string | null) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    const grab = (): string | null => {
      const canvas = map.getCanvas();
      const c = opts.crop ?? {};
      const w = canvas.width, h = canvas.height;
      if (!w || !h) return null;
      const scale = w / (canvas.clientWidth || w);
      let sx = Math.max(0, (c.left ?? 0) * scale), sy = Math.max(0, (c.top ?? 0) * scale);
      let sw = w - sx - Math.max(0, (c.right ?? 0) * scale), sh = h - sy - Math.max(0, (c.bottom ?? 0) * scale);
      // A crop that leaves too little falls back to the whole canvas.
      if (sw < w * 0.3 || sh < h * 0.3) {
        sx = 0; sy = 0; sw = w; sh = h;
      }
      const max = opts.maxWidth ?? 2000;
      const k = Math.min(1, max / sw);
      const out = document.createElement('canvas');
      out.width = Math.round(sw * k);
      out.height = Math.round(sh * k);
      const ctx = out.getContext('2d');
      if (!ctx) return canvas.toDataURL('image/png');
      ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, out.width, out.height);
      // JPEG keeps a map photo small in the print document; the map has no transparency worth keeping.
      return out.toDataURL('image/jpeg', 0.9);
    };
    try {
      if (!map.getContainer().isConnected) return finish(null);
      map.once('render', () => {
        try {
          finish(grab());
        } catch {
          finish(null);
        }
      });
      map.triggerRepaint();
    } catch {
      finish(null);
    }
    setTimeout(() => finish(null), 3000);
  });
}
