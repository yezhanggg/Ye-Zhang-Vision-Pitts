import { useLayoutEffect, useMemo, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { bundledGeo } from '../lib/explore/catalog';
import { buildFacts, useChat, type ChatScope } from '../lib/explore/chat';
import { resolveForLevel } from '../lib/explore/search';
import { useApp } from '../lib/store';
import { cx } from '../lib/format';
import ChatBox from './explore/ChatBox';

/** A short stable tag for a facts text, so a remembered answer is only reused for the same facts. */
function tagOf(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * The same question box as Explore, for the Analysis views: it searches the city's census tracts and answers
 * about the tract that is selected there, under the priorities set there. Match places it in its right column;
 * the compare views put it at the top of the left rail (`compact`: a pill until it is used, the rail's full width),
 * so it never covers map B. AnalysisView withholds any answer whose figures could not be checked.
 *
 * `extraFacts` (Equity & policy): plain lines appended to the facts sent with every question asked here, so answers
 * can cite that view's numbers (and are checked against them). It applies only while `extraFacts` is set, so a
 * hidden view passes undefined. `prompts`: suggested questions shown above the box. `dock`: fill the column's width,
 * and its height too when the column has a definite height (the thread then scrolls inside, newest exchange at the bottom above the input).
 */
export default function AnalysisChat({ compact = false, extraFacts, prompts, dock = false }: { compact?: boolean; extraFacts?: string; prompts?: string[]; dock?: boolean }) {
  const selectedId = useApp((s) => s.selectedId);
  const weights = useApp((s) => s.weights);
  const select = useApp((s) => s.select);
  const busy = useChat((s) => s.busy);
  const fc = useMemo(() => bundledGeo('tract'), []);
  const resolve = useMemo(() => resolveForLevel('tract', fc), [fc]);
  const scope = useMemo<ChatScope>(() => ({ level: 'tract', cityOnly: true, fc, selected: selectedId, variable: null, values: null, weights }), [fc, selectedId, weights]);

  // While extra facts are given, every question asked through the shared chat store carries them (the ChatBox builds
  // its own facts; the store's `ask` is wrapped rather than editing the Explore box). Restored on leaving.
  const extra = useRef(extraFacts);
  extra.current = extraFacts;
  const withExtra = extraFacts != null;
  useLayoutEffect(() => {
    if (!withExtra) return;
    const orig = useChat.getState().ask;
    const wrapped: typeof orig = (q, facts, about) => {
      const add = extra.current;
      if (!add) return orig(q, facts, about);
      return orig(q, async () => `${await facts()}\n\n${add}`, `${about ?? ''}|eq:${tagOf(add)}`);
    };
    useChat.setState({ ask: wrapped });
    return () => {
      if (useChat.getState().ask === wrapped) useChat.setState({ ask: orig });
    };
  }, [withExtra]);

  const about = `${scope.level}|${scope.cityOnly ? 'city' : 'county'}|${scope.selected ?? ''}|`;
  const suggest = (q: string) => void useChat.getState().ask(q, () => buildFacts(scope), about);

  // Docked (Equity & policy): the box shows these prompts itself, above its input at the bottom of the column.
  const box = <ChatBox scope={scope} resolve={resolve} onGo={select} compact={compact && !dock} fill={dock} prompts={dock ? prompts : undefined} />;
  if (!compact && !dock) return box;
  const own = !dock && !!prompts?.length;
  return (
    // With prompts of its own, the box's generic ones are hidden, so one list of suggestions shows.
    // Docked: fills a column of definite height (the thread scrolls inside the box); in an auto-height column it sizes to content.
    <div className={cx(own ? '[&>div]:ml-0 [&>div]:!max-w-none [&_[data-tour=ask]_[aria-label="Suggested_questions"]]:hidden' : '[&>div]:ml-0 [&>div]:!max-w-none', dock && 'flex h-full min-h-0 flex-col [&>[data-tour=ask]]:min-h-0 [&>[data-tour=ask]]:flex-1')} data-testid="analysis-chat">
      {own && (
        <div className="mb-1.5 flex shrink-0 flex-col gap-0.5" aria-label="Suggested questions">
          {prompts!.map((p) => (
            <button key={p} type="button" disabled={busy} onClick={() => suggest(p)} title={p} className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-caption text-slate-600 transition-colors hover:bg-violet-50 hover:text-violet-800 disabled:opacity-50">
              <Sparkles className="h-3 w-3 shrink-0 text-violet-400" />
              <span className="truncate">{p}</span>
            </button>
          ))}
        </div>
      )}
      {box}
    </div>
  );
}
