import { afterEach, describe, expect, it } from 'vitest';
import { canonicalMessages, deserializeChat, serializeChat, setPersistView, useChat, type ChatMessage } from '../explore/chat';
import { WITHHELD, restore, strictSession, withhold } from './strictChat';

const msg = (id: number, role: 'user' | 'assistant', text: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({ id, role, text, at: 0, ...extra });

describe('withhold and restore', () => {
  it('replaces unchecked answers only, marks them failed, and leaves everything else as it is', () => {
    const list = [msg(1, 'user', 'How many?'), msg(2, 'assistant', 'About 4,200 households.', { unchecked: true, provider: 'DeepSeek' }), msg(3, 'user', 'And?'), msg(4, 'assistant', 'Checked answer.'), msg(6, 'assistant', 'Down.', { unchecked: true, failed: true }), msg(8, 'assistant', '', { pending: true, unchecked: true })];
    const { messages, held } = withhold(list);
    expect(messages).not.toBe(list);
    expect(messages[1]).toMatchObject({ id: 2, text: WITHHELD, unchecked: false, failed: true, provider: 'DeepSeek' });
    expect(messages[0]).toBe(list[0]);
    expect(messages[3]).toBe(list[3]);
    expect(messages[4]).toBe(list[4]);
    expect(messages[5]).toBe(list[5]);
    expect([...held.keys()]).toEqual([2]);
    expect(held.get(2)).toBe(list[1]);
    const back = restore(messages, held);
    expect(back).toEqual(list);
    expect(back[1]).toBe(list[1]);
  });
  it('returns the same array when there is nothing to do', () => {
    const list = [msg(1, 'user', 'x'), msg(2, 'assistant', 'y')];
    expect(withhold(list).messages).toBe(list);
    expect(restore(list, new Map())).toBe(list);
  });
  it('falls back to the position when a message has no id', () => {
    const list = [{ role: 'assistant', text: 'n', unchecked: true }];
    const out = withhold(list);
    expect([...out.held.keys()]).toEqual([0]);
    expect(restore(out.messages, out.held)[0]).toBe(list[0]);
  });
  it('never puts back a message the reader has since replaced', () => {
    const list = [msg(2, 'assistant', 'unchecked', { unchecked: true })];
    const { held } = withhold(list);
    const later = [msg(2, 'assistant', 'a new answer')];
    expect(restore(later, held)).toBe(later);
  });
});

describe('strictSession on the chat store', () => {
  afterEach(() => useChat.setState({ messages: [] }));
  it('rewrites while active, also for answers that arrive later, and restores the originals on stop', () => {
    const a = msg(2, 'assistant', 'Rent is $1,995.', { unchecked: true });
    useChat.setState({ messages: [msg(1, 'user', 'Rent?'), a] });
    const stop = strictSession(useChat);
    expect(useChat.getState().messages[1].text).toBe(WITHHELD);
    expect(useChat.getState().messages[1].unchecked).toBe(false);
    const b = msg(4, 'assistant', 'Vacancy is 9%.', { unchecked: true });
    useChat.setState({ messages: [...useChat.getState().messages, msg(3, 'user', 'Vacancy?'), b] });
    expect(useChat.getState().messages[3].text).toBe(WITHHELD);
    expect(useChat.getState().messages.some((m) => m.unchecked)).toBe(false);
    stop();
    const after = useChat.getState().messages;
    expect(after[1]).toBe(a);
    expect(after[3]).toBe(b);
    // no longer watching
    useChat.setState({ messages: [msg(6, 'assistant', 'later', { unchecked: true })] });
    expect(useChat.getState().messages[0].text).toBe('later');
  });
  it('survives a cleared conversation', () => {
    useChat.setState({ messages: [msg(2, 'assistant', 'x', { unchecked: true })] });
    const stop = strictSession(useChat);
    useChat.setState({ messages: [] });
    stop();
    expect(useChat.getState().messages).toEqual([]);
  });
  it('withholds unchecked answers rehydrated after a reload, and storage keeps the originals', () => {
    const saved = serializeChat({ messages: [msg(1, 'user', 'Rent?'), msg(2, 'assistant', 'Rent is $1,995.', { unchecked: true, provider: 'Test' }), msg(3, 'user', 'Ok?'), msg(4, 'assistant', 'Checked.', { checked: true })], folded: null });
    useChat.setState({ messages: deserializeChat(saved).messages });
    const stop = strictSession(useChat, setPersistView);
    const shown = useChat.getState().messages;
    expect(shown[1]).toMatchObject({ text: WITHHELD, failed: true, unchecked: false });
    expect(shown[3].text).toBe('Checked.');
    // what would be written to storage now is the original, still marked unchecked
    const stored = canonicalMessages(shown);
    expect(stored[1]).toMatchObject({ text: 'Rent is $1,995.', unchecked: true });
    stop();
    expect(canonicalMessages(useChat.getState().messages)).toBe(useChat.getState().messages);
    expect(useChat.getState().messages[1].text).toBe('Rent is $1,995.');
  });
});
