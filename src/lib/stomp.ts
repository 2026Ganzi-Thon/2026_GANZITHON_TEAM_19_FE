import { Client, type IMessage } from '@stomp/stompjs';

import { getIdToken } from './auth';
import { env } from './env';
import type { RealtimeTransport, ReplyEnvelope, TransportHandlers } from './realtime';

// STOMP 연결 (TRD 17-4). 이 파일은 로그인 뒤에 따로 내려받는다 (realtime 청크).
const HEARTBEAT_MS = 10_000;
const MIN_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;
const EVENTS_QUEUE = '/user/queue/events';
const REPLIES_QUEUE = '/user/queue/replies';
const REQ_ID_HEADER = 'req-id';

function parseBody(message: IMessage): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(message.body);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    // 형식이 깨진 프레임은 버린다
    return null;
  }
}

export function createStompTransport(handlers: TransportHandlers): RealtimeTransport {
  let delay = MIN_RECONNECT_MS;

  const client = new Client({
    brokerURL: env.wsUrl,
    heartbeatIncoming: HEARTBEAT_MS,
    heartbeatOutgoing: HEARTBEAT_MS,
    reconnectDelay: delay,
    // 연결·재연결마다 새 ID 토큰을 CONNECT 헤더로 보낸다
    beforeConnect: async () => {
      const token = await getIdToken();
      client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    },
    onConnect: () => {
      delay = MIN_RECONNECT_MS;
      client.reconnectDelay = delay;
      client.subscribe(EVENTS_QUEUE, (message) => {
        const event = parseBody(message);
        if (event) handlers.onEvent(event);
      });
      client.subscribe(REPLIES_QUEUE, (message) => {
        const reply = parseBody(message) as ReplyEnvelope | null;
        if (!reply) return;
        handlers.onReply({ ...reply, req_id: reply.req_id ?? message.headers[REQ_ID_HEADER] });
      });
      handlers.onConnectionChange(true);
    },
    onWebSocketClose: () => {
      // 지수 백오프 1 → 30초
      delay = Math.min(delay * 2, MAX_RECONNECT_MS);
      client.reconnectDelay = delay;
      handlers.onConnectionChange(false);
    },
  });

  return {
    activate: () => client.activate(),
    deactivate: () => void client.deactivate(),
    send: (event, body, reqId) =>
      client.publish({
        destination: `/app/${event}`,
        body: JSON.stringify(body),
        headers: reqId ? { [REQ_ID_HEADER]: reqId } : {},
      }),
  };
}
