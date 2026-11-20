import type { RiskLevel } from '@/stores/crisisStore';

import { track } from './analytics';
import { env } from './env';

// 실시간 채널 (TRD 17-4, 백엔드 14장). 로그인 중 연결은 하나이고 구독은 내 큐 2개뿐이다.
// 실제 연결은 lib/stomp.ts 가, 목 모드에서는 mocks/realtime.ts 가 같은 인터페이스로 맡는다.

/** 실시간 메시지 한 건 (백엔드 14-3 message:new) */
export interface RealtimeMessage {
  id: string;
  session_id: string;
  sender_role?: string;
  sender_id?: string;
  kind?: string;
  body: string;
  created_at: string;
  client_msg_id?: string;
}

/** 서버 → 클라이언트 이벤트와 data 모양 (백엔드 14-3). OpenAPI 밖의 계약이라 여기에 적는다. */
export interface RealtimeEventMap {
  'message:new': RealtimeMessage;
  'message:backfill': { session_id: string; messages: RealtimeMessage[] };
  presence: { session_id: string; user_role: string; online: boolean };
  typing: { session_id: string; is_typing: boolean };
  'risk:alert': {
    session_id: string;
    level: RiskLevel;
    risk_event_id?: string;
    evidence?: string;
    script?: string[];
  };
  /** 어드민 전원과 당직자에게 온다 */
  'risk:new': {
    risk_event_id: string;
    level: RiskLevel;
    source: string;
    session_id?: string;
    elapsed_seconds?: number;
  };
  'contact:warning': { session_id: string; message_id: string };
  'session:updated': { session_id: string; status: string };
  'session:ending_soon': { session_id: string; minutes_left: number };
  'session:ended': { session_id: string; ended_by?: string };
  'session:no_show': { session_id: string; refunded: boolean };
  'report:ready': {
    report_id: string;
    scope: string;
    version?: number;
    session_id?: string;
    referral_id?: string;
  };
  'certificate:ready': { certificate_id: string };
  'notification:new': { id: string; type: string; title: string; link?: string };
  'account:status': { status: string; until?: string };
}

export type RealtimeEventType = keyof RealtimeEventMap;

/** session.join 응답 (백엔드 14-2) */
export interface JoinReply {
  session_status?: string;
}

/** message.send 응답 (백엔드 14-2) */
export interface SendReply {
  message?: { id: string; created_at: string };
}

/** /user/queue/replies 로 오는 응답. 내용은 최상위나 data 안에 온다 */
export interface ReplyEnvelope {
  req_id?: string;
  ok?: boolean;
  error?: string;
  data?: unknown;
  [field: string]: unknown;
}

export interface TransportHandlers {
  onEvent: (event: { type?: string; data?: unknown }) => void;
  onReply: (reply: ReplyEnvelope) => void;
  onConnectionChange: (connected: boolean) => void;
}

export interface RealtimeTransport {
  activate: () => void;
  deactivate: () => void;
  /** reqId 가 있으면 서버가 같은 ID로 응답(ack)한다 */
  send: (event: string, body: object, reqId?: string) => void;
}

export const REALTIME_TIMEOUT = 'TIMEOUT';
export const REALTIME_OFFLINE = 'NETWORK_ERROR';
const ACK_TIMEOUT_MS = 5000;
const JOIN_RETRY_MS = 2000;
const UNKNOWN_FAILURE = 'INTERNAL';

export class RealtimeError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = 'RealtimeError';
    this.code = code;
  }
}

export type JoinResult = { ok: true; sessionStatus?: string } | { ok: false; code: string };

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: RealtimeError) => void;
  timer: number;
}

interface Room {
  /** 마지막으로 받은 메시지 ID. 재연결 때 그 뒤 메시지를 다시 받는 데 쓴다 */
  getAfterId: () => string | undefined;
  onJoin: (result: JoinResult) => void;
}

let transport: RealtimeTransport | null = null;
let creating: Promise<RealtimeTransport | null> | null = null;
let wanted = false;
let connected = false;
let connectedBefore = false;

const pending = new Map<string, PendingRequest>();
const listeners = new Map<string, Set<(data: unknown) => void>>();
const connectionListeners = new Set<() => void>();
const rooms = new Map<string, Room>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function failPending(code: string): void {
  pending.forEach((request) => {
    window.clearTimeout(request.timer);
    request.reject(new RealtimeError(code));
  });
  pending.clear();
}

function rejoinRooms(): void {
  [...rooms.keys()].forEach((sessionId) => void sendJoin(sessionId));
}

const handlers: TransportHandlers = {
  onEvent(event) {
    if (!event.type) return;
    listeners.get(event.type)?.forEach((listener) => listener(event.data));
  },
  onReply(reply) {
    const request = reply.req_id ? pending.get(reply.req_id) : undefined;
    if (!request || !reply.req_id) return;
    pending.delete(reply.req_id);
    window.clearTimeout(request.timer);
    if (reply.ok === false) request.reject(new RealtimeError(reply.error ?? UNKNOWN_FAILURE));
    else request.resolve({ ...reply, ...(isRecord(reply.data) ? reply.data : {}) });
  },
  onConnectionChange(next) {
    if (next === connected) return;
    connected = next;
    if (next) {
      if (connectedBefore) track('realtime_reconnect');
      connectedBefore = true;
      // 재연결할 때마다 열려 있는 상담방에 다시 들어가 놓친 메시지를 받는다
      rejoinRooms();
    } else {
      failPending(REALTIME_OFFLINE);
    }
    connectionListeners.forEach((listener) => listener());
  },
};

async function createTransport(): Promise<RealtimeTransport | null> {
  // 빌드 때 값이 정해지는 조건이라 운영 빌드에는 목 코드가 들어가지 않는다
  if (import.meta.env.VITE_API_MOCK === '1') {
    const { createMockTransport } = await import('@/mocks/realtime');
    return createMockTransport(handlers);
  }
  if (!env.wsUrl) return null;
  const { createStompTransport } = await import('./stomp');
  return createStompTransport(handlers);
}

function onVisibilityChange(): void {
  // 백그라운드에서 돌아오면 놓친 메시지를 다시 받는다 (TRD 18-4)
  if (document.visibilityState === 'visible' && connected) rejoinRooms();
}

/** 로그인 상태가 ready 가 되면 부른다 (TRD 17-4). STOMP 코드는 이때 따로 내려받는다. */
export async function startRealtime(): Promise<void> {
  wanted = true;
  creating ??= createTransport();
  const created = await creating;
  if (!wanted || !created || transport) return;
  transport = created;
  document.addEventListener('visibilitychange', onVisibilityChange);
  created.activate();
}

/** 로그아웃하면 부른다. */
export function stopRealtime(): void {
  wanted = false;
  document.removeEventListener('visibilitychange', onVisibilityChange);
  transport?.deactivate();
  transport = null;
  creating = null;
  connectedBefore = false;
  handlers.onConnectionChange(false);
}

/**
 * 요청-응답(ack). req-id 를 붙여 보내고 5초 안에 응답이 없으면 실패로 본다.
 * 실패하면 RealtimeError 를 던진다 (code: 서버 오류 코드, TIMEOUT, NETWORK_ERROR).
 */
export function request<Reply = Record<string, unknown>>(
  event: string,
  body: object,
  timeoutMs = ACK_TIMEOUT_MS,
): Promise<Reply> {
  const active = transport;
  if (!active || !connected) return Promise.reject(new RealtimeError(REALTIME_OFFLINE));

  const reqId = crypto.randomUUID();
  return new Promise<Reply>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pending.delete(reqId);
      reject(new RealtimeError(REALTIME_TIMEOUT));
    }, timeoutMs);
    pending.set(reqId, { resolve: (value) => resolve(value as Reply), reject, timer });
    try {
      active.send(event, body, reqId);
    } catch {
      pending.delete(reqId);
      window.clearTimeout(timer);
      reject(new RealtimeError(REALTIME_OFFLINE));
    }
  });
}

/** 응답 없이 보내기만 한다 (typing). 끊겨 있으면 버린다. */
export function publish(event: string, body: object): void {
  if (!transport || !connected) return;
  try {
    transport.send(event, body);
  } catch {
    // 입력 중 표시는 놓쳐도 대화에 영향이 없다
  }
}

/** 서버 이벤트를 type 으로 구독한다. 구독 해제 함수를 돌려준다. */
export function onEvent<Type extends RealtimeEventType>(
  type: Type,
  handler: (data: RealtimeEventMap[Type]) => void,
): () => void {
  const listener = handler as (data: unknown) => void;
  const typeListeners = listeners.get(type) ?? new Set<(data: unknown) => void>();
  listeners.set(type, typeListeners);
  typeListeners.add(listener);
  return () => {
    typeListeners.delete(listener);
  };
}

export function subscribeConnection(listener: () => void): () => void {
  connectionListeners.add(listener);
  return () => {
    connectionListeners.delete(listener);
  };
}

export function isRealtimeConnected(): boolean {
  return connected;
}

async function sendJoin(sessionId: string): Promise<void> {
  const room = rooms.get(sessionId);
  if (!room) return;
  try {
    const reply = await request<JoinReply>('session.join', {
      session_id: sessionId,
      after_id: room.getAfterId(),
    });
    rooms.get(sessionId)?.onJoin({ ok: true, sessionStatus: reply.session_status });
  } catch (error) {
    const code = error instanceof RealtimeError ? error.code : UNKNOWN_FAILURE;
    rooms.get(sessionId)?.onJoin({ ok: false, code });
    // 연결은 살아 있는데 응답만 늦었으면 재연결을 기다리지 않고 다시 들어간다
    if (code === REALTIME_TIMEOUT) {
      window.setTimeout(() => {
        if (connected && rooms.has(sessionId)) void sendJoin(sessionId);
      }, JOIN_RETRY_MS);
    }
  }
}

/** 상담방에 들어간다. 연결될 때마다(재연결 포함) session.join 을 다시 보낸다. */
export function joinRoom(
  sessionId: string,
  getAfterId: () => string | undefined,
  onJoin: (result: JoinResult) => void,
): void {
  rooms.set(sessionId, { getAfterId, onJoin });
  if (connected) void sendJoin(sessionId);
}

export function leaveRoom(sessionId: string): void {
  if (!rooms.delete(sessionId) || !connected) return;
  // 나가는 중의 실패는 서버가 연결 끊김으로 정리한다
  request('session.leave', { session_id: sessionId }).catch(() => undefined);
}
