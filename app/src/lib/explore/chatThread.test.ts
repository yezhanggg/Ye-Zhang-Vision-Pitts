import { describe, expect, it } from 'vitest';
import { CHAT_CAP, CHAT_COPY, CHAT_STORAGE_KEY, deserializeChat, exchangesNewestFirst, loadChat, saveChat, serializeChat, type ChatMessage, type StorageLike } from './chat';

const msg = (id: number, role: 'user' | 'assistant', text: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({ id, role, text, at: 1000 * id, ...extra });

class FakeStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}
class BlockedStorage implements StorageLike {
  getItem(): string | null {
    throw new Error('SecurityError');
  }
  setItem() {
    throw new Error('QuotaExceededError');
  }
  removeItem() {
    throw new Error('SecurityError');
  }
}

describe('exchangesNewestFirst', () => {
  it('pairs each question with its answer and puts the newest exchange first', () => {
    const list = [msg(1, 'user', 'first?'), msg(2, 'assistant', 'one'), msg(3, 'user', 'second?'), msg(4, 'assistant', 'two'), msg(5, 'user', 'third?'), msg(6, 'assistant', '', { pending: true })];
    const ex = exchangesNewestFirst(list);
    expect(ex.map((e) => e.q.text)).toEqual(['third?', 'second?', 'first?']);
    expect(ex.map((e) => e.a?.text)).toEqual(['', 'two', 'one']);
    expect(ex[0].a?.pending).toBe(true);
    // the store's order is untouched
    expect(list.map((m) => m.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it('keeps a question without an answer yet, and ignores a stray answer', () => {
    const ex = exchangesNewestFirst([msg(2, 'assistant', 'stray'), msg(3, 'user', 'q?')]);
    expect(ex).toHaveLength(1);
    expect(ex[0]).toEqual({ q: expect.objectContaining({ id: 3 }), a: null });
    expect(exchangesNewestFirst([])).toEqual([]);
  });
});

describe('persistence', () => {
  it('round-trips messages with their flags and the fold', () => {
    const list = [msg(1, 'user', 'q?'), msg(2, 'assistant', 'a', { provider: 'Test', model: 'm-1', checked: true }), msg(3, 'user', 'q2?'), msg(4, 'assistant', 'b', { unchecked: true }), msg(5, 'user', 'q3?'), msg(6, 'assistant', 'down', { failed: true })];
    const back = deserializeChat(serializeChat({ messages: list, folded: true }));
    expect(back.folded).toBe(true);
    expect(back.messages).toEqual(list);
  });
  it('keeps only the last 30 messages and never starts on an orphan answer', () => {
    const list: ChatMessage[] = [];
    for (let i = 1; i <= 41; i++) list.push(msg(i, i % 2 ? 'user' : 'assistant', `m${i}`));
    const back = deserializeChat(serializeChat({ messages: list, folded: null }));
    expect(back.messages.length).toBeLessThanOrEqual(CHAT_CAP);
    expect(back.messages[0].role).toBe('user');
    expect(back.messages.at(-1)?.id).toBe(41);
    expect(back.messages.length).toBe(29); // 12..41 is 30, the leading answer 12 is dropped
  });
  it('ignores corrupted or foreign JSON and malformed messages', () => {
    expect(deserializeChat('{not json')).toEqual({ messages: [], folded: null });
    expect(deserializeChat('null')).toEqual({ messages: [], folded: null });
    expect(deserializeChat(JSON.stringify({ v: 2, messages: [] }))).toEqual({ messages: [], folded: null });
    expect(deserializeChat(JSON.stringify({ v: 1, messages: 'x' }))).toEqual({ messages: [], folded: null });
    const mixed = deserializeChat(JSON.stringify({ v: 1, messages: [msg(1, 'user', 'ok?'), { id: 'x', role: 'user', text: 1 }, { id: 3, role: 'system', text: 'x', at: 0 }, msg(2, 'assistant', 'yes')] }));
    expect(mixed.messages.map((m) => m.id)).toEqual([1, 2]);
  });
  it('turns an answer that was still pending into a failed note', () => {
    const back = deserializeChat(serializeChat({ messages: [msg(1, 'user', 'q?'), msg(2, 'assistant', '', { pending: true })], folded: null }));
    expect(back.messages[1]).toMatchObject({ text: CHAT_COPY.interrupted, failed: true });
    expect(back.messages[1].pending).toBeUndefined();
  });
  it('saves to and loads from a storage under the versioned key, and clears it when empty', () => {
    const st = new FakeStorage();
    saveChat(st, { messages: [msg(1, 'user', 'q?'), msg(2, 'assistant', 'a')], folded: false });
    expect(st.data.has(CHAT_STORAGE_KEY)).toBe(true);
    expect(loadChat(st).messages).toHaveLength(2);
    saveChat(st, { messages: [], folded: null });
    expect(st.data.has(CHAT_STORAGE_KEY)).toBe(false);
    st.setItem(CHAT_STORAGE_KEY, '###');
    expect(loadChat(st)).toEqual({ messages: [], folded: null });
  });
  it('never throws when storage is blocked or missing', () => {
    expect(() => saveChat(new BlockedStorage(), { messages: [msg(1, 'user', 'q')], folded: null })).not.toThrow();
    expect(loadChat(new BlockedStorage())).toEqual({ messages: [], folded: null });
    expect(loadChat(null)).toEqual({ messages: [], folded: null });
  });
});
