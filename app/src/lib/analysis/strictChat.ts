// The hard gate on the Analysis question box: an answer whose figures could not all be matched to the tool's data is
// never shown there. While the Analysis tab is open the chat store's unchecked answers are rewritten to a refusal;
// on leaving, the originals come back, so Explore's chat is exactly as it was. lib/explore/chat.ts is not edited.
import { useLayoutEffect } from 'react';
import { useChat } from '../explore/chat';

export const WITHHELD = 'The answer included figures that could not be matched to the tool’s data, so it is not shown. Every number on this panel is computed by code.';

interface Msg {
  role: string;
  text?: string;
  unchecked?: boolean;
  failed?: boolean;
  pending?: boolean;
}
/** A message's key in `held`: its id when it has one, else its position. */
const keyOf = (m: unknown, i: number) => {
  const id = (m as { id?: unknown }).id;
  return typeof id === 'number' ? id : i;
};

/**
 * Unchecked assistant answers replaced by the refusal (marked failed, so they are neither highlighted nor sent back
 * as history), with the originals keyed by message id (or index). The same array comes back when nothing changed.
 */
export function withhold<M extends Msg>(messages: M[]): { messages: M[]; held: Map<number, M> } {
  const held = new Map<number, M>();
  let changed = false;
  const out = messages.map((m, i) => {
    if (m.role !== 'assistant' || !m.unchecked || m.failed || m.pending) return m;
    held.set(keyOf(m, i), m);
    changed = true;
    return { ...m, text: WITHHELD, unchecked: false, failed: true };
  });
  return { messages: changed ? out : messages, held };
}

/** The originals put back where a withheld message still stands. The same array comes back when nothing changed. */
export function restore<M extends Msg>(messages: M[], held: Map<number, M>): M[] {
  let changed = false;
  const out = messages.map((m, i) => {
    const o = held.get(keyOf(m, i));
    if (!o || m.text !== WITHHELD) return m;
    changed = true;
    return o;
  });
  return changed ? out : messages;
}

export interface ChatLike<M> {
  getState(): { messages: M[] };
  setState(p: { messages: M[] }): void;
  subscribe(fn: () => void): () => void;
}

/** Withholds now and on every store change; the returned function stops watching and restores the originals. */
export function strictSession<M extends Msg>(store: ChatLike<M>): () => void {
  const held = new Map<number, M>();
  const pass = () => {
    const cur = store.getState().messages;
    const out = withhold(cur);
    if (out.messages === cur) return;
    for (const [k, m] of out.held) if (!held.has(k)) held.set(k, m);
    store.setState({ messages: out.messages });
  };
  pass();
  const off = store.subscribe(pass);
  return () => {
    off();
    const cur = store.getState().messages;
    const back = restore(cur, held);
    if (back !== cur) store.setState({ messages: back });
  };
}

/** Mount in the Analysis view: the question box there never shows an unchecked answer. */
export function useStrictChat(): void {
  useLayoutEffect(() => strictSession(useChat), []);
}
