// Screen size for layout decisions that CSS alone cannot make (map padding, which panels start folded).
// Phone: under 640 px wide. Compact: under 1100 px (tablets, small laptops), where the side column moves below the
// top bar. Kept in step with window resizes and rotation.
import { useEffect, useRef, useState } from 'react';

export interface Viewport {
  w: number;
  h: number;
  phone: boolean;
  compact: boolean;
}
export const PHONE_MAX = 640;
export const COMPACT_MAX = 1100;
const read = (): Viewport => {
  const w = typeof window === 'undefined' ? 1440 : window.innerWidth;
  const h = typeof window === 'undefined' ? 900 : window.innerHeight;
  return { w, h, phone: w < PHONE_MAX, compact: w < COMPACT_MAX };
};
export const isPhone = () => read().phone;

export function useViewport(): Viewport {
  const [vp, setVp] = useState(read);
  useEffect(() => {
    const on = () => setVp((prev) => {
      const next = read();
      return prev.w === next.w && prev.h === next.h ? prev : next;
    });
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
    };
  }, []);
  return vp;
}

/**
 * Room the map keeps free around the panels when it fits a place. Phone: panels stack top and bottom, so the room
 * is above and below. Compact: narrower side panels. Never more than the screen can give.
 */
export function mapPadding(vp: Viewport, leftOpen: boolean, rightOpen: boolean) {
  if (vp.phone) {
    return { top: leftOpen ? Math.round(vp.h * 0.45) : 110, bottom: rightOpen ? Math.round(vp.h * 0.52) : 130, left: 24, right: 24 };
  }
  const side = (open: boolean, want: number) => (open ? Math.min(want, Math.round(vp.w * 0.38)) : 70);
  return { top: vp.compact ? 130 : 90, bottom: 90, left: side(leftOpen, vp.compact ? 380 : 420), right: side(rightOpen, vp.compact ? 420 : 500) };
}

/**
 * On a phone the two panels share the screen with the map, so they take turns: opening one folds the other. On
 * larger screens this does nothing.
 */
export function usePhoneTakeTurns(phone: boolean, leftOpen: boolean, rightOpen: boolean, foldLeft: () => void, foldRight: () => void) {
  const prev = useRef({ left: leftOpen, right: rightOpen });
  useEffect(() => {
    const was = prev.current;
    prev.current = { left: leftOpen, right: rightOpen };
    if (!phone || !leftOpen || !rightOpen) return;
    if (rightOpen && !was.right) foldLeft();
    else if (leftOpen && !was.left) foldRight();
    else foldLeft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, leftOpen, rightOpen]);
}
