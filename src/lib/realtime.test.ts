import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RealtimeTransport, TransportHandlers } from './realtime';

interface SentFrame {
  event: string;
  body: Record<string, unknown>;
  reqId?: string;
}

const wire = vi.hoisted(() => ({
  sent: [] as SentFrame[],
  handlers: null as TransportHandlers | null,
  track: vi.fn(),
}));

vi.mock('./env', () => ({ env: { wsUrl: 'wss://api.test/ws', apiBaseUrl: '' } }));
vi.mock('./analytics', () => ({ track: wire.track }));
vi.mock('./stomp', () => ({
  createStompTransport: (handlers: TransportHandlers): RealtimeTransport => {
    wire.handlers = handlers;
    return {
      activate: () => handlers.onConnectionChange(true),
      deactivate: () => undefined,
      send: (event, body, reqId) => {
        wire.sent.push({ event, body: body as Record<string, unknown>, reqId });
      },
    };
  },
}));

/** 테스트마다 연결 상태가 섞이지 않게 모듈을 새로 불러 연결한다 */
async function connect() {
  vi.resetModules();
  const realtime = await import('./realtime');
  await realtime.startRealtime();
  return realtime;
}

function server(): TransportHandlers {
  if (!wire.handlers) throw new Error('transport was not created');
  return wire.handlers;
}

describe('realtime', () => {
  beforeEach(() => {
    wire.sent.length = 0;
    wire.handlers = null;
    wire.track.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves a request when the reply with the same request id arrives', async () => {
    const { request } = await connect();

    const reply = request('message.send', { session_id: 's1', body: '안녕하세요' });
    const frame = wire.sent[0];
    server().onReply({ req_id: frame?.reqId, ok: true, message: { id: 'm1' } });

    await expect(reply).resolves.toMatchObject({ message: { id: 'm1' } });
    expect(frame).toMatchObject({ event: 'message.send', body: { session_id: 's1' } });
  });

  it('reads the reply contents from a data envelope as well', async () => {
    const { request } = await connect();

    const reply = request('session.join', { session_id: 's1' });
    server().onReply({
      req_id: wire.sent[0]?.reqId,
      ok: true,
      data: { session_status: 'IN_PROGRESS' },
    });

    await expect(reply).resolves.toMatchObject({ session_status: 'IN_PROGRESS' });
  });

  it('rejects with the server error code when the server refuses', async () => {
    const { request } = await connect();

    const reply = request('message.send', { session_id: 's1' });
    server().onReply({ req_id: wire.sent[0]?.reqId, ok: false, error: 'RATE_LIMITED' });

    await expect(reply).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('gives up after five seconds without a reply', async () => {
    const { request } = await connect();
    vi.useFakeTimers();

    const reply = request('message.send', { session_id: 's1' });
    const outcome = expect(reply).rejects.toMatchObject({ code: 'TIMEOUT' });
    vi.advanceTimersByTime(5000);

    await outcome;
  });

  it('fails waiting requests at once when the connection drops', async () => {
    const { request, isRealtimeConnected } = await connect();

    const reply = request('message.send', { session_id: 's1' });
    server().onConnectionChange(false);

    await expect(reply).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(isRealtimeConnected()).toBe(false);
    await expect(request('message.send', {})).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('joins a room and reports the result of the join', async () => {
    const { joinRoom } = await connect();
    const onJoin = vi.fn();

    joinRoom('s1', () => 'm7', onJoin);
    const frame = wire.sent[0];
    server().onReply({ req_id: frame?.reqId, ok: true, session_status: 'IN_PROGRESS' });

    expect(frame).toMatchObject({
      event: 'session.join',
      body: { session_id: 's1', after_id: 'm7' },
    });
    await vi.waitFor(() =>
      expect(onJoin).toHaveBeenCalledWith({ ok: true, sessionStatus: 'IN_PROGRESS' }),
    );
  });

  it('rejoins open rooms after a reconnect with the latest message id', async () => {
    const { joinRoom } = await connect();
    let lastId = 'm1';
    joinRoom('s1', () => lastId, vi.fn());

    lastId = 'm9';
    server().onConnectionChange(false);
    server().onConnectionChange(true);

    const joins = wire.sent.filter((frame) => frame.event === 'session.join');
    expect(joins.map((frame) => frame.body.after_id)).toEqual(['m1', 'm9']);
    expect(wire.track).toHaveBeenCalledWith('realtime_reconnect');
  });

  it('stops rejoining a room after leaving it', async () => {
    const { joinRoom, leaveRoom } = await connect();
    joinRoom('s1', () => undefined, vi.fn());

    leaveRoom('s1');
    server().onConnectionChange(false);
    server().onConnectionChange(true);

    expect(wire.sent.map((frame) => frame.event)).toEqual(['session.join', 'session.leave']);
  });

  it('delivers server events by type until unsubscribed', async () => {
    const { onEvent } = await connect();
    const onTyping = vi.fn();
    const unsubscribe = onEvent('typing', onTyping);

    server().onEvent({ type: 'typing', data: { session_id: 's1', is_typing: true } });
    server().onEvent({ type: 'presence', data: { session_id: 's1' } });
    unsubscribe();
    server().onEvent({ type: 'typing', data: { session_id: 's1', is_typing: false } });

    expect(onTyping).toHaveBeenCalledOnce();
    expect(onTyping).toHaveBeenCalledWith({ session_id: 's1', is_typing: true });
  });

  it('does not send anything once realtime was stopped', async () => {
    const { request, publish, stopRealtime } = await connect();

    stopRealtime();
    publish('typing', { session_id: 's1', is_typing: true });

    await expect(request('message.send', {})).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(wire.sent).toHaveLength(0);
  });
});
