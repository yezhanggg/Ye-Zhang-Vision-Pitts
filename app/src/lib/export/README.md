# lib/export

- `csv.ts` — `toCsv(rows, columns)` (RFC 4180 quoting, CRLF, UTF-8 BOM for Excel), `downloadCsv(filename, csv)` (Blob + anchor, works over file://), `exportFilename(kind, name, 'csv'|'pdf')` → `visionpitts-{kind}-{slug}-{yyyy-mm-dd}.{ext}`.
- `report.ts` — `Report` = `{ title, subtitle?, blocks: ReportBlock[], sources?, footer?, filename? }`; blocks are `heading | text | kv | table | image | callout`. `renderReportHtml(r)` is pure (US Letter print document, header, zebra tables, numbers right-aligned, sources, footer); `printReport(r)` prints it from a hidden iframe (user picks "Save as PDF"). `mapSnapshot(map)` → PNG data URL or null.
- `builders/*.ts` — pure `buildPlaceReport`, `buildCompareReport`, `buildLayerReport` (+ matching CSV row builders) from the same data the screens use. Values only: no scores, no "/100".
- UI: `components/export/ExportMenu.tsx` — `<ExportMenu items={[{ label: 'Report (PDF)', hint, onSelect }, …]} />`, plus `useMapRef()` → `{ onMapReady, getMap }`; pass `onMapReady` to `<MapView>` and `getMap()` to `mapSnapshot`.
