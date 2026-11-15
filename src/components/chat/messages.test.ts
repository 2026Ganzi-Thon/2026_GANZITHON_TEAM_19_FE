import { describe, expect, it } from 'vitest';

import {
  type ChatMessage,
  confirmMessage,
  createPending,
  fromRealtime,
  fromRest,
  isSystemMessage,
  lastConfirmedId,
  markStatus,
  mergeMessages,
} from './messages';

const ME = 'user-me';
const NOW = Date.parse('2026-11-03T10:00:00Z');

function sent(id: string, overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id,
    body: id,
    mine: false,
    createdAt: '2026-11-03T10:00:00Z',
    kind: 'text',
    status: 'sent',
    ...overrides,
  };
}

describe('fromRest', () => {
  it('marks a stored message as mine by its sender id', () => {
    const mine = fromRest({ id: 'm1', sender_id: ME, body: '안녕하세요' }, ME);
    const theirs = fromRest({ id: 'm2', sender_id: 'someone', body: '네' }, ME);

    expect(mine).toMatchObject({ id: 'm1', mine: true, status: 'sent', body: '안녕하세요' });
    expect(theirs?.mine).toBe(false);
  });

  it('drops a message that has no id', () => {
    expect(fromRest({ body: '?' }, ME)).toBeNull();
  });
});

describe('fromRealtime', () => {
  const base = {
    id: 'm1',
    session_id: 's1',
    body: '안녕하세요',
    created_at: '2026-11-03T10:00:00Z',
  };

  it('uses the sender id when the server sends one', () => {
    expect(fromRealtime({ ...base, sender_id: ME }, { id: ME, role: 'client' }).mine).toBe(true);
    expect(fromRealtime({ ...base, sender_id: 'x' }, { id: ME, role: 'client' }).mine).toBe(false);
  });

  it('falls back to the sender role for both sides of the room', () => {
    const fromClient = { ...base, sender_role: 'client' };
    const fromProvider = { ...base, sender_role: 'trainee' };

    expect(fromRealtime(fromClient, { role: 'client' }).mine).toBe(true);
    expect(fromRealtime(fromProvider, { role: 'client' }).mine).toBe(false);
    expect(fromRealtime(fromProvider, { role: 'trainee' }).mine).toBe(true);
    expect(fromRealtime(fromClient, { role: 'expert' }).mine).toBe(false);
  });

  it('keeps the kind so that system messages are drawn differently', () => {
    const system = fromRealtime({ ...base, kind: 'crisis_resources' }, { role: 'client' });

    expect(isSystemMessage(system)).toBe(true);
    expect(isSystemMessage(fromRealtime(base, { role: 'client' }))).toBe(false);
  });
});

describe('mergeMessages', () => {
  it('orders confirmed messages by server id, not by arrival', () => {
    const merged = mergeMessages([sent('0002')], [sent('0003'), sent('0001')]);

    expect(merged.map((message) => message.id)).toEqual(['0001', '0002', '0003']);
  });

  it('keeps one copy when the same message arrives twice', () => {
    const merged = mergeMessages([sent('0001')], [sent('0001', { body: '다시 옴' })]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.body).toBe('다시 옴');
  });

  it('keeps messages still being sent after the confirmed ones', () => {
    const pending = createPending('보내는 중', 'c1', NOW);

    const merged = mergeMessages([pending], [sent('0009')]);

    expect(merged.map((message) => message.status)).toEqual(['sent', 'sending']);
  });

  it('replaces my pending message with its echo and keeps it mine', () => {
    const pending = createPending('안녕하세요', 'c1', NOW);
    const echo = sent('0005', { clientMsgId: 'c1', body: '안녕하세요', mine: false });

    const merged = mergeMessages([pending], [echo]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: '0005', status: 'sent', mine: true });
  });

  it('never turns a confirmed message back into a pending one', () => {
    const confirmed = sent('0005', { clientMsgId: 'c1', mine: true });

    const merged = mergeMessages([confirmed], [createPending('안녕하세요', 'c1', NOW)]);

    expect(merged).toEqual([confirmed]);
  });
});

describe('confirmMessage', () => {
  const saved = { id: '0007', created_at: '2026-11-03T10:00:05Z' };

  it('swaps the temporary id for the server id when the ack arrives', () => {
    const list = confirmMessage([createPending('안녕하세요', 'c1', NOW)], 'c1', saved);

    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: '0007', status: 'sent', createdAt: saved.created_at });
  });

  it('does not duplicate the message when its echo arrived before the ack', () => {
    const echoed = sent('0007', { clientMsgId: 'c1', mine: true });

    expect(confirmMessage([echoed], 'c1', saved)).toEqual([echoed]);
  });

  it('removes a leftover pending copy when the confirmed one is already listed', () => {
    const list = confirmMessage(
      [sent('0007'), createPending('안녕하세요', 'c1', NOW)],
      'c1',
      saved,
    );

    expect(list.map((message) => message.id)).toEqual(['0007']);
  });
});

describe('markStatus', () => {
  it('marks a pending message as failed and back to sending for a retry', () => {
    const failed = markStatus([createPending('안녕하세요', 'c1', NOW)], 'c1', 'failed');
    const retried = markStatus(failed, 'c1', 'sending');

    expect(failed[0]?.status).toBe('failed');
    expect(retried[0]?.status).toBe('sending');
  });

  it('leaves confirmed messages alone', () => {
    const confirmed = sent('0007', { clientMsgId: 'c1' });

    expect(markStatus([confirmed], 'c1', 'failed')).toEqual([confirmed]);
  });
});

describe('lastConfirmedId', () => {
  it('returns the newest server id and ignores messages still being sent', () => {
    const list = [sent('0002'), sent('0010'), createPending('보내는 중', 'zzzz', NOW)];

    expect(lastConfirmedId(list)).toBe('0010');
  });

  it('returns nothing for an empty room', () => {
    expect(lastConfirmedId([])).toBeUndefined();
  });
});
