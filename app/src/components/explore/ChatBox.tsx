import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { CHAT_COPY, buildFacts, suggestions, useChat, type ChatScope } from '../../lib/explore/chat';
import { unitTitle } from '../../lib/explore/catalog';
import { EXPLORE_UI } from '../../lib/explore/copy';
import { cx } from '../../lib/format';
import { PromptInput } from '../ui/ai-chat-input';

/**
 * Top-right of Explore: the question box, the light prompts that appear once a place is selected, and the answers.
 * The summary panel sits underneath. Answers come from /api/chat, which only sees the facts built in lib/explore/chat.
 */
export default function ChatBox({ scope }: { scope: ChatScope }) {
  const messages = useChat((s) => s.messages);
  const busy = useChat((s) => s.busy);
  const ask = useChat((s) => s.ask);
  const clear = useChat((s) => s.clear);
  const [value, setValue] = useState('');
  const list = useRef<HTMLDivElement>(null);
  const lastQuestion = useRef<HTMLDivElement>(null);
  const props = useMemo(() => (scope.selected ? scope.fc.features.find((f) => f.properties.GEOID === scope.selected)?.properties ?? null : null), [scope.fc, scope.selected]);
  const name = props ? unitTitle(props) : null;
  const prompts = useMemo(() => suggestions(name, scope.variable, scope.level), [name, scope.variable, scope.level]);
  const send = (q: string) => void ask(q, () => buildFacts(scope));

  // Bring the latest question to the top of the list, so its answer is read from the start.
  useEffect(() => {
    const box = list.current, q = lastQuestion.current;
    if (box && q) box.scrollTop = q.offsetTop - box.offsetTop - 4;
  }, [messages]);
  const lastUserId = useMemo(() => [...messages].reverse().find((m) => m.role === 'user')?.id ?? null, [messages]);

  return (
    <div className="flex w-full flex-col items-end gap-1.5">
      <PromptInput value={value} onChange={setValue} onSubmit={send} busy={busy} placeholder={name ? EXPLORE_UI.chat.askAbout(name) : EXPLORE_UI.chat.ask} footer={name ? EXPLORE_UI.chat.about(name) : EXPLORE_UI.chat.aboutNone} className="pointer-events-auto" />
      {prompts.length > 0 && (
        <div className="pointer-events-auto flex max-w-[440px] flex-wrap justify-end gap-1.5" aria-label={EXPLORE_UI.chat.prompts}>
          {prompts.map((p) => (
            <button key={p} type="button" disabled={busy} onClick={() => send(p)} className="flex max-w-full items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-left text-caption font-medium text-slate-600 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:bg-white hover:text-violet-700 disabled:opacity-60">
              <Sparkles className="h-3 w-3 shrink-0 text-violet-500" />
              <span className="truncate">{p}</span>
            </button>
          ))}
        </div>
      )}
      {messages.length > 0 && (
        <div className="pointer-events-auto flex max-h-[36vh] w-full max-w-[440px] flex-col rounded-2xl bg-white/95 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.25)] ring-1 ring-black/5 backdrop-blur" aria-label={EXPLORE_UI.chat.answers}>
          <div className="flex items-center justify-between px-4 pb-1 pt-2.5">
            <div className="text-small font-semibold text-slate-900">{EXPLORE_UI.chat.answers}</div>
            <button onClick={clear} className="rounded-lg p-1 text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-label={EXPLORE_UI.chat.clear} title={EXPLORE_UI.chat.clear}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div ref={list} className="scroll-quiet relative min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-3" aria-live="polite">
            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} ref={m.id === lastUserId ? lastQuestion : undefined} className="ml-8 rounded-2xl rounded-br-md bg-violet-50 px-3 py-1.5 text-small text-violet-950 ring-1 ring-violet-100">
                  {m.text}
                </div>
              ) : (
                <div key={m.id} className="mr-4">
                  {m.pending ? (
                    <div className="flex items-center gap-1 py-1.5" aria-label={EXPLORE_UI.chat.thinking}>
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" style={{ animationDelay: `${i * 160}ms` }} />
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className={cx('whitespace-pre-wrap text-small', m.failed ? 'text-slate-600' : 'text-slate-800')}>{m.text}</div>
                      {m.unchecked && <div className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-caption text-amber-900 ring-1 ring-amber-200">{CHAT_COPY.unchecked}</div>}
                      {!m.failed && !m.unchecked && m.provider && <div className="mt-1 text-caption text-slate-500">{CHAT_COPY.by(m.provider)}</div>}
                    </>
                  )}
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
