// VisionPitts Chat as a small pill in the top right of every view (online): as tall as the Home button, "Ask" in
// words (or "Thinking…" while an answer is written) and the chat's moving thinking orb in place of the microphone, so
// it is easy to find without covering the map. A click opens the chat under it, in the page's flow: in a view's right
// column (RightColumn) the panel below moves down and shrinks to leave room for it. The microphone is left out there
// too. The offline file keeps the full boxes. Loaded on demand.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { useChat } from '../lib/explore/chat';
import { EXPLORE_UI } from '../lib/explore/copy';
import { cx } from '../lib/format';
import AnalysisChat from './AnalysisChat';
import { SPRING_PANEL, SPRING_TAB } from './primitives';
import { ThinkingOrb } from './ui/thinking-orbs';

const PHASES = EXPLORE_UI.chat.phases;
const VIOLET = '#6d28d9';

/** The input's voice button only shows while the box is empty; it is hidden inside the pill's chat. Plain CSS, kept
 *  here so the shared input (ui/ai-chat-input) and the offline file are unchanged. */
const NO_MIC = '[data-chat-pill] button[aria-label="Speak instead of typing"]{display:none}';

/** The chat's own thinking mark (ThinkingOrb), on no background: always moving, so the pill catches the eye, and
 *  while an answer is being written it runs the same phases as the thread's "Looking up the figures…" mark. */
function AiOrb({ busy }: { busy: boolean }) {
  const still = useReducedMotion();
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    setPhase(0);
    if (!busy) return;
    const timers = PHASES.map((p, k) => window.setTimeout(() => setPhase(k), p.at));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [busy]);
  return (
    <span className="relative grid h-6 w-6 shrink-0 place-items-center">
      {/* The 32 px design, shown at 24 px: denser and clearer than the 20 px one at this size. */}
      <span className="relative h-6 w-6" aria-hidden>
        <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%) scale(0.8)' }}>
          <ThinkingOrb state={busy ? PHASES[phase].state : 'breathing'} size={32} theme="light" color={VIOLET} dotSize={1.35} dots={1.15} speed={busy ? 1.4 : 1} paused={!!still} aria-hidden />
        </span>
      </span>
    </span>
  );
}

/**
 * `children`: the box to open in place of the Analysis chat (Explore passes its search-and-question box).
 * `extraFacts` / `prompts`: as on AnalysisChat (Equity & policy: its numbers and suggested questions); with prompts
 * the box is docked (the questions above its input), growing with the thread up to the window's height, then scrolling.
 */
export default function ChatPill({ align = 'right', children, extraFacts, prompts, onHeight }: { align?: 'right' | 'left'; children?: ReactNode; extraFacts?: string; prompts?: string[]; /** The open box's height in px (0 closed), for a view without a right column to make room (Compare). */ onHeight?: (px: number) => void }) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!onHeight) return;
    if (!open || !box) return onHeight(0);
    const ro = new ResizeObserver(() => onHeight(box.offsetHeight + 8));
    ro.observe(box);
    return () => ro.disconnect();
  }, [open, box, onHeight]);
  const busy = useChat((s) => s.busy);
  const asked = useChat((s) => s.messages.length > 0);
  const root = useRef<HTMLDivElement>(null);
  // Escape closes it; a click on the map or a panel closes it too, unless a conversation is under way.
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const down = (e: MouseEvent) => {
      if (!asked && root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', key);
    window.addEventListener('mousedown', down);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('mousedown', down);
    };
  }, [open, asked]);

  return (
    <div ref={root} className={cx('pointer-events-auto relative z-30 flex min-h-0 max-w-full flex-col', align === 'right' ? 'items-end' : 'items-start')} data-chat-pill>
      <style>{NO_MIC}</style>
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.95 }}
        transition={SPRING_TAB}
        aria-expanded={open}
        aria-label={open ? 'Close VisionPitts Chat' : 'Open VisionPitts Chat'}
        className={cx('flex shrink-0 items-center gap-2 rounded-xl bg-white/95 py-1.5 pl-4 pr-1.5 text-small font-semibold text-slate-700 shadow-lg ring-1 backdrop-blur hover:bg-white hover:text-slate-900', open ? 'ring-violet-300' : 'ring-black/5')}
      >
        <span>
          VisionPitts Chat: {busy ? <span className="shimmer-text">Thinking…</span> : <span className="text-violet-700">Ask</span>}
        </span>
        {open ? (
          <span className="grid h-6 w-6 place-items-center rounded-full text-slate-500">
            <X className="h-4 w-4" />
          </span>
        ) : (
          <AiOrb busy={busy} />
        )}
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={setBox}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={SPRING_PANEL}
            style={{ transformOrigin: align === 'right' ? 'top right' : 'top left', width: 440, maxWidth: 'min(100%, calc(100vw - 24px))', ...(prompts && { display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 90px)' }) }}
            className="mt-2 min-h-0"
          >
            {children ?? (prompts ? <AnalysisChat compact dock extraFacts={extraFacts} prompts={prompts} /> : <AnalysisChat extraFacts={extraFacts} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
