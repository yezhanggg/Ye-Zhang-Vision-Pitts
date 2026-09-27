import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { PART_STEPS, STEPS, TOUR_COPY as T, useTour, type Placement } from '../../lib/tour';
import { useApp } from '../../lib/store';
import { cx } from '../../lib/format';
import { SPRING_PANEL } from '../primitives';

const PAD = 8;
const CARD_W = 320;
const GAP = 16;
const EDGE = 12;
type Rect = { x: number; y: number; w: number; h: number };

/** The first visible element marked with this tour key (Analysis keeps hidden views mounted). */
function findTarget(key: string): HTMLElement | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${key}"]`))) {
    const visible = typeof el.checkVisibility === 'function' ? el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) : el.offsetParent !== null;
    const r = el.getBoundingClientRect();
    if (visible && r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/** Card position beside the cut-out, flipped or clamped so it stays on screen. */
function place(hole: Rect, placement: Placement, cardH: number, vw: number, vh: number) {
  const clampX = (x: number) => Math.max(EDGE, Math.min(vw - CARD_W - EDGE, x));
  const clampY = (y: number) => Math.max(EDGE, Math.min(vh - cardH - EDGE, y));
  let side = placement;
  if (side === 'right' && hole.x + hole.w + GAP + CARD_W > vw - EDGE) side = 'left';
  if (side === 'left' && hole.x - GAP - CARD_W < EDGE) side = 'right';
  if (side === 'bottom' && hole.y + hole.h + GAP + cardH > vh - EDGE) side = 'left';
  if (side === 'bottom') {
    const left = clampX(hole.x + hole.w / 2 - CARD_W / 2);
    return { left, top: clampY(hole.y + hole.h + GAP), side, arrow: hole.x + hole.w / 2 - left };
  }
  const top = clampY(hole.y + Math.min(hole.h / 2, 120) - 40);
  // Whatever the side, the card stays inside the window.
  const left = clampX(side === 'right' ? hole.x + hole.w + GAP : hole.x - GAP - CARD_W);
  return { left, top, side, arrow: Math.max(18, Math.min(cardH - 18, hole.y + Math.min(hole.h / 2, 120) - top)) };
}

/**
 * The tour on screen: everything dimmed except a cut-out around the part being taught, and a card beside it. The
 * cut-out and the card glide from one part to the next. The dim layer takes every click, so nothing underneath can
 * change during the tour; only the card answers.
 */
export default function TourLayer() {
  const active = useTour((s) => s.active);
  const step = useTour((s) => s.step);
  const { next, end, toAnalysis } = useTour.getState();
  const lite = useApp((s) => s.lite);
  const [hole, setHole] = useState<Rect | null>(null);
  const [vp, setVp] = useState({ w: typeof window === 'undefined' ? 1440 : window.innerWidth, h: typeof window === 'undefined' ? 900 : window.innerHeight });
  const [cardH, setCardH] = useState(160);
  const card = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const s = STEPS[step];

  // Follow the target while it animates in and whenever the window or the target changes size.
  const measure = useCallback(() => {
    if (!s) return;
    const el = findTarget(s.target);
    setVp({ w: window.innerWidth, h: window.innerHeight });
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Padded, but kept inside the window so the ring never runs off an edge.
    const x0 = Math.max(4, r.left - PAD), y0 = Math.max(4, r.top - PAD);
    const x1 = Math.min(window.innerWidth - 4, r.right + PAD), y1 = Math.min(window.innerHeight - 4, r.bottom + PAD);
    const next = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    setHole((h) => (h && Math.abs(h.x - next.x) < 0.5 && Math.abs(h.y - next.y) < 0.5 && Math.abs(h.w - next.w) < 0.5 && Math.abs(h.h - next.h) < 0.5 ? h : next));
  }, [s]);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const until = performance.now() + 3000;
    const loop = () => {
      measure();
      if (performance.now() < until) raf = requestAnimationFrame(loop);
    };
    loop();
    const ro = new ResizeObserver(measure);
    const el = s && findTarget(s.target);
    if (el) ro.observe(el);
    window.addEventListener('resize', measure);
    const slow = window.setInterval(measure, 400);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.clearInterval(slow);
    };
  }, [active, step, measure, s]);
  useLayoutEffect(() => {
    if (card.current) setCardH(card.current.offsetHeight);
  });
  useEffect(() => {
    if (active) primary.current?.focus({ preventScroll: true });
  }, [active, step]);
  useEffect(() => {
    if (!active) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        end();
      } else if ((e.key === 'Enter' || e.key === 'ArrowRight') && !STEPS[useTour.getState().step]?.last) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [active, end, next]);
  useEffect(() => {
    if (!active) setHole(null);
  }, [active]);

  const spring = lite ? { duration: 0 } : SPRING_PANEL;
  const partSteps = s ? PART_STEPS(s.part) : [];
  const pos = hole ? place(hole, s?.placement ?? 'bottom', cardH, vp.w, vp.h) : null;

  return (
    <AnimatePresence>
      {active && s && (
        <motion.div key="tour" className="fixed inset-0 z-[2500]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: lite ? 0 : 0.25 }}>
          <svg className="absolute inset-0 h-full w-full" onClick={(e) => e.stopPropagation()} aria-hidden>
            <defs>
              <mask id="tour-hole">
                <rect width="100%" height="100%" fill="white" />
                {hole && <motion.rect initial={false} animate={{ x: hole.x, y: hole.y, width: hole.w, height: hole.h }} transition={spring} rx={18} fill="black" />}
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgb(15 23 42 / 0.58)" mask="url(#tour-hole)" />
            {hole && <motion.rect initial={false} animate={{ x: hole.x, y: hole.y, width: hole.w, height: hole.h }} transition={spring} rx={18} data-tour-ring fill="none" stroke="white" strokeOpacity={0.9} strokeWidth={2} />}
          </svg>
          {pos && (
            <motion.div
              ref={card}
              role="dialog"
              aria-modal="true"
              aria-labelledby="tour-title"
              initial={{ opacity: 0, left: pos.left, top: pos.top, scale: 0.96 }}
              animate={{ opacity: 1, left: pos.left, top: pos.top, scale: 1 }}
              transition={spring}
              className="absolute rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-black/5"
              style={{ width: CARD_W }}
            >
              <span
                aria-hidden
                className={cx('absolute h-3 w-3 rotate-45 bg-white', pos.side === 'bottom' ? '-top-1.5' : pos.side === 'right' ? '-left-1.5' : '-right-1.5')}
                style={pos.side === 'bottom' ? { left: Math.max(16, Math.min(CARD_W - 28, pos.arrow - 6)) } : { top: pos.arrow - 6 }}
              />
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={s.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: lite ? 0 : 0.16 }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-caption font-semibold text-violet-700">{T.of(s.part, partSteps.indexOf(s) + 1, partSteps.length)}</div>
                      <h2 id="tour-title" className="mt-0.5 font-display text-lead font-bold text-slate-900">
                        {s.title}
                      </h2>
                    </div>
                    <button onClick={() => end()} className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 hover:bg-stone-100 hover:text-slate-900" aria-label={T.close} title={T.close}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1.5 text-small leading-relaxed text-slate-700">{s.text}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                    {s.last === 'fork' ? (
                      <>
                        <button onClick={() => end()} className="rounded-lg px-3 py-1.5 text-small font-semibold text-slate-600 hover:bg-stone-100 hover:text-slate-900">
                          {T.keepExploring}
                        </button>
                        <button ref={primary} onClick={toAnalysis} className="rounded-lg bg-violet-600 px-3 py-1.5 text-small font-semibold text-white hover:bg-violet-700">
                          {T.toAnalysis} →
                        </button>
                      </>
                    ) : (
                      <>
                        {!s.last && (
                          <button onClick={() => end()} className="rounded-lg px-3 py-1.5 text-small font-semibold text-slate-600 hover:bg-stone-100 hover:text-slate-900">
                            {T.end}
                          </button>
                        )}
                        <button ref={primary} onClick={next} className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-small font-semibold text-white hover:bg-slate-800">
                          {s.last === 'finish' ? T.finish : T.gotIt}
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
