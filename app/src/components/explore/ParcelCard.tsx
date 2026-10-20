// By parcel: what the sun-and-shadow control and the map tooltip show for lots. Presentation only; the lots and
// their figures come in through props (useParcelLayer). Hand-drawn SVG like charts.tsx, no chart library.
import { X } from 'lucide-react';
import { cx } from '../../lib/format';
import { curvePath, lotName, lotSize, mostlyOf, shadeColors, shadeOf, sunHours, useLabel, type LotProps, type ParcelManifest } from '../../lib/explore/parcelShadow';
import { SEASONS, clockLabel } from '../../lib/explore/sunShadow';

const seasonName = (id: string) => SEASONS[id]?.name ?? id;
const lastMinute = (m: ParcelManifest, day: number) => m.days[day].first + (m.days[day].steps - 1) * m.stepMinutes;
const tooSmall = (m: ParcelManifest) => `Too small to measure (under about ${Math.round((m.minCells * 36) / 10) * 10} sq ft)`;

/** Map tooltip for one lot: what it is and its share of the chosen day in shadow. */
export function ParcelTooltip({ lot, manifest, day }: { lot: LotProps; manifest: ParcelManifest; day: number }) {
  const shade = shadeOf(lot, day);
  const d = manifest.days[day];
  return (
    <div className="max-w-64">
      <div className="font-semibold">{lotName(lot.lot)}</div>
      <div className="text-caption text-white/75">
        {useLabel(manifest, lot.u)} · {lotSize(lot.sf)}
      </div>
      {shade == null ? (
        <div className="mt-1 text-caption text-white/80">{tooSmall(manifest)}</div>
      ) : (
        <div className="mt-1">
          <div className="text-caption text-white/75">In shadow, {seasonName(d.id).toLowerCase()} day</div>
          <div className="text-lead font-bold tnum">{Math.round(shade)}%</div>
          <div className="text-caption text-white/80 tnum">{sunHours(shade, d, manifest.stepMinutes).toFixed(1)} h of direct sun</div>
        </div>
      )}
    </div>
  );
}

/** The color key: ten steps from no shadow to shadow all day. */
export function ParcelLegend({ manifest, day }: { manifest: ParcelManifest; day: number }) {
  return (
    <div>
      <div className="text-caption text-slate-800">
        Share of the day in shadow, {clockLabel(manifest.days[day].first)} to {clockLabel(lastMinute(manifest, day))}
      </div>
      <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full">
        {shadeColors().map((c) => (
          <span key={c} className="flex-1" style={{ background: c }} />
        ))}
      </div>
      <div className="tnum mt-0.5 flex justify-between text-caption text-slate-600">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

const CURVE_W = 288, CURVE_H = 32;

/** The clicked lot: its three days side by side, and how much of it is in shadow through the chosen day. */
export function ParcelReadout({ lot, manifest, day, curve, onClose }: { lot: LotProps; manifest: ParcelManifest; day: number; curve: number[] | null; onClose: () => void }) {
  const rated = shadeOf(lot, day) != null;
  const path = curve ? curvePath(curve, CURVE_W, CURVE_H) : null;
  return (
    <div className="mt-2 rounded-lg bg-stone-50 px-2.5 py-2 ring-1 ring-black/5" data-parcel-card>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-small font-semibold text-slate-900">{lotName(lot.lot)}</div>
          <div className="truncate text-caption text-slate-600">
            {useLabel(manifest, lot.u)} · {lotSize(lot.sf)}
          </div>
        </div>
        <button type="button" onClick={onClose} className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-stone-200 hover:text-slate-900" aria-label="Clear the lot" title="Clear">
          <X className="h-3 w-3" />
        </button>
      </div>
      {!rated ? (
        <p className="mt-1.5 text-caption text-slate-600">{tooSmall(manifest)}.</p>
      ) : (
        <>
          <div className="tnum mt-1.5 grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-0.5 whitespace-nowrap text-caption">
            <span />
            <span className="text-right text-slate-500" title="Of the lot's area across the whole day, the share in shadow">
              In shadow
            </span>
            <span className="text-right text-slate-500" title="The same as average hours of direct sun">
              Sun
            </span>
            <span className="text-right text-slate-500" title="Share of the day when at least half the lot is in shadow">
              Mostly shaded
            </span>
            {manifest.days.map((d, i) => {
              const s = shadeOf(lot, i), half = mostlyOf(lot, i);
              const row = cx(i === day ? 'font-semibold text-slate-900' : 'text-slate-700');
              return [
                <span key={`${d.id}n`} className={row}>
                  {seasonName(d.id)}
                </span>,
                <span key={`${d.id}s`} className={cx(row, 'text-right')}>
                  {s == null ? '–' : `${Math.round(s)}%`}
                </span>,
                <span key={`${d.id}h`} className={cx(row, 'text-right')}>
                  {s == null ? '–' : `${sunHours(s, d, manifest.stepMinutes).toFixed(1)} h`}
                </span>,
                <span key={`${d.id}m`} className={cx(row, 'text-right')}>
                  {half == null ? '–' : `${half}%`}
                </span>,
              ];
            })}
          </div>
          <div className="mt-2">
            <div className="text-caption text-slate-500">Share of the lot in shadow, by half hour</div>
            <svg viewBox={`0 0 ${CURVE_W} ${CURVE_H}`} className="mt-0.5 block h-8 w-full" preserveAspectRatio="none" role="img" aria-label={`Share of the lot in shadow through the ${seasonName(manifest.days[day].id).toLowerCase()} day`}>
              <line x1="0" y1={CURVE_H / 2} x2={CURVE_W} y2={CURVE_H / 2} stroke="#e7e5e4" strokeWidth="1" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
              {path && <path d={path.area} fill="#0f172a" fillOpacity="0.16" />}
              {path && <path d={path.line} fill="none" stroke="#334155" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
              <line x1="0" y1={CURVE_H} x2={CURVE_W} y2={CURVE_H} stroke="#cbd5e1" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="tnum flex justify-between whitespace-nowrap text-caption text-slate-600">
              <span>{clockLabel(manifest.days[day].first)}</span>
              <span>{clockLabel(lastMinute(manifest, day))}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
