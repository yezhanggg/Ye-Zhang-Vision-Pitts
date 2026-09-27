/** CSV export: RFC 4180 quoting, CRLF line ends, UTF-8 BOM so Excel reads accents and "·" correctly. */

export interface CsvColumn {
  key: string;
  label: string;
  format?: (v: unknown) => string;
}

const BOM = '﻿';

function cell(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (Array.isArray(v)) return v.map(cell).join('; ');
  if (typeof v === 'object') return '';
  return String(v);
}

export function quoteCsv(s: string): string {
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string {
  const head = columns.map((c) => quoteCsv(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => quoteCsv(c.format ? c.format(r[c.key]) : cell(r[c.key]))).join(','));
  return BOM + [head, ...body].join('\r\n') + '\r\n';
}

/** Save a file via Blob + anchor. Works on http(s) and file:// (no server round trip). */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

export function downloadCsv(filename: string, csv: string): void {
  const text = csv.startsWith(BOM) ? csv : BOM + csv;
  downloadBlob(filename, new Blob([text], { type: 'text/csv;charset=utf-8' }));
}

/** `visionpitts-{kind}-{slug}-{yyyy-mm-dd}.{ext}` */
export function exportFilename(kind: string, name: string, ext: 'csv' | 'pdf', date = new Date()): string {
  return `visionpitts-${slugify(kind)}-${slugify(name) || 'export'}-${isoDate(date)}.${ext}`;
}

export function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function isoDate(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
