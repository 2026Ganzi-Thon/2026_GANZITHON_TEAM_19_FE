import type { Schema } from '@/api/types';
import { authClient } from '@/lib/auth';
import type { RealtimeMessage, RealtimeTransport, TransportHandlers } from '@/lib/realtime';

import { addDemoRiskEvent } from './adminDb';
import { mockDb, type MockSession, nextMessageId } from './db';
import { createSessionReport, SESSION_REPORT_DELAY_MS } from './reportDb';
import { assessMockRisk } from './risk';

// VITE_API_MOCK=1 에서 STOMP 연결을 대신한다 (TRD 17-4). 상대 메시지, risk:alert, 종료를 메모리로 재생한다.
// - 글에 '종료' 가 들어가면 상담사가 상담을 끝낸다 (session:ended)
// - 글에 '전송 실패' 가 들어가면 첫 전송에는 응답하지 않는다 (재전송 확인용)
const CONNECT_DELAY_MS = 150;
const REPLY_DELAY_MS = 120;
const GREETING_DELAY_MS = 1200;
const TYPING_MS = 1800;
const END_DELAY_MS = 2500;
const ADMIN_RISK_DELAY_MS = 8000;
const END_KEYWORD = '종료';
const FAIL_KEYWORD = '전송 실패';
const PROVIDER_ROLE = 'trainee';
const RISK_DEMO_KEYWORD = '위기 시연';
const CLIENT_LINE = '네, 요즘 일이 많아서 계속 지쳐 있어요.';
const RISKY_CLIENT_LINE = '요즘은 다 그만두고 사라지고 싶어요.';

const GREETING = '안녕하세요. 오늘 어떤 이야기를 나누고 싶으세요?';
const FAREWELL = '오늘 이야기 나눠 주셔서 고마워요. 상담을 마칠게요.';
const PROVIDER_LINES = [
  '그러셨군요. 조금 더 이야기해 주실 수 있을까요?',
  '그 마음이 충분히 이해돼요.',
  '그때 어떤 생각이 가장 먼저 들었나요?',
] as const;

type StoredMessage = Schema<'MessageResponse'>;

interface JoinBody {
  session_id?: string;
  after_id?: string;
}

interface SendBody {
  session_id?: string;
  client_msg_id?: string;
  body?: string;
}

function toRealtime(
  message: StoredMessage,
  senderRole: string,
  clientMsgId?: string,
): RealtimeMessage {
  return {
    id: message.id ?? '',
    session_id: message.session_id ?? '',
    sender_id: message.sender_id,
    sender_role: senderRole,
    kind: 'text',
    body: message.body ?? '',
    created_at: message.created_at ?? '',
    client_msg_id: clientMsgId,
  };
}

export function createMockTransport(handlers: TransportHandlers): RealtimeTransport {
  const timers = new Set<number>();
  const greeted = new Set<string>();
  const failedOnce = new Set<string>();
  const delivered = new Map<string, StoredMessage>();
  let active = false;
  let lineIndex = 0;
  let adminAlerted = false;

  function later(run: () => void, ms: number): void {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      if (active) run();
    }, ms);
    timers.add(timer);
  }

  function emit(type: string, data: unknown): void {
    handlers.onEvent({ type, data });
  }

  function reply(
    reqId: string | undefined,
    ok: boolean,
    extra: Record<string, unknown> = {},
  ): void {
    if (reqId) later(() => handlers.onReply({ req_id: reqId, ok, ...extra }), REPLY_DELAY_MS);
  }

  function currentUser() {
    const uid = authClient().getUser()?.uid;
    return uid ? mockDb.users.get(uid) : undefined;
  }

  function findSession(sessionId: string | undefined): MockSession | undefined {
    const me = currentUser();
    return mockDb.sessions.find(
      (session) =>
        session.session_id === sessionId &&
        (session.client_id === me?.id || session.provider_id === me?.id),
    );
  }

  function store(sessionId: string, senderId: string | undefined, body: string): StoredMessage {
    const message: StoredMessage = {
      id: nextMessageId(),
      session_id: sessionId,
      sender_id: senderId,
      body,
      created_at: new Date().toISOString(),
    };
    mockDb.messages.set(sessionId, [...(mockDb.messages.get(sessionId) ?? []), message]);
    return message;
  }

  function providerSays(session: MockSession, body: string): void {
    const message = store(session.session_id ?? '', session.provider_id, body);
    emit('message:new', toRealtime(message, PROVIDER_ROLE));
  }

  function join(body: JoinBody, reqId: string | undefined): void {
    const session = findSession(body.session_id);
    const sessionId = session?.session_id;
    if (!session || !sessionId) {
      reply(reqId, false, { error: 'FORBIDDEN_RESOURCE' });
      return;
    }
    if (session.status !== 'CONFIRMED' && session.status !== 'IN_PROGRESS') {
      reply(reqId, false, { error: 'INVALID_STATE' });
      return;
    }
    session.status = 'IN_PROGRESS';
    reply(reqId, true, { session_status: session.status });

    const history = mockDb.messages.get(sessionId) ?? [];
    const afterId = body.after_id;
    const missed = afterId ? history.filter((message) => (message.id ?? '') > afterId) : [];
    if (missed.length > 0) {
      const messages = missed.map((message) =>
        toRealtime(message, message.sender_id === session.client_id ? 'client' : PROVIDER_ROLE),
      );
      later(
        () => emit('message:backfill', { session_id: sessionId, messages }),
        REPLY_DELAY_MS * 2,
      );
    }
    later(
      () => emit('presence', { session_id: sessionId, user_role: PROVIDER_ROLE, online: true }),
      REPLY_DELAY_MS * 2,
    );
    if (history.length === 0 && !greeted.has(sessionId) && currentUser()?.role === 'client') {
      greeted.add(sessionId);
      later(() => providerSays(session, GREETING), GREETING_DELAY_MS);
    }
  }

  function sendMessage(body: SendBody, reqId: string | undefined): void {
    const me = currentUser();
    const session = findSession(body.session_id);
    const sessionId = session?.session_id;
    const clientMsgId = body.client_msg_id ?? '';
    const text = body.body ?? '';
    if (!me || !session || !sessionId) {
      reply(reqId, false, { error: 'FORBIDDEN_RESOURCE' });
      return;
    }
    if (session.status !== 'IN_PROGRESS') {
      reply(reqId, false, { error: 'INVALID_STATE' });
      return;
    }
    if (text.includes(FAIL_KEYWORD) && !failedOnce.has(clientMsgId)) {
      failedOnce.add(clientMsgId);
      return;
    }

    // 같은 client_msg_id 재전송은 한 건만 저장한다
    const existing = delivered.get(clientMsgId);
    const message = existing ?? store(sessionId, me.id, text);
    delivered.set(clientMsgId, message);
    reply(reqId, true, { message: { id: message.id, created_at: message.created_at } });
    if (existing) return;

    later(
      () => emit('message:new', toRealtime(message, me.role ?? 'client', clientMsgId)),
      REPLY_DELAY_MS,
    );
    if (me.role !== 'client') {
      // 상담사 화면 확인용: '위기 시연' 을 보내면 위험한 내담자 메시지와 위기 경고가 온다
      const risky = text.includes(RISK_DEMO_KEYWORD);
      later(() => {
        const reply = store(sessionId, session.client_id, risky ? RISKY_CLIENT_LINE : CLIENT_LINE);
        emit('message:new', toRealtime(reply, 'client'));
      }, TYPING_MS);
      if (risky) {
        later(
          () =>
            emit('risk:alert', {
              session_id: sessionId,
              risk_event_id: 'risk-mock-1',
              level: 'high',
              evidence: RISKY_CLIENT_LINE,
              script: ['지금 안전한 곳에 계신가요?', '자신을 해칠 생각이 드시나요?'],
            }),
          TYPING_MS + REPLY_DELAY_MS,
        );
      }
      return;
    }

    const level = assessMockRisk(text);
    if (level === 'high' || level === 'critical') {
      later(() => emit('risk:alert', { session_id: sessionId, level }), REPLY_DELAY_MS * 3);
    }
    if (text.includes(END_KEYWORD)) {
      later(() => providerSays(session, FAREWELL), TYPING_MS);
      later(() => {
        session.status = 'COMPLETED';
        emit('session:ended', { session_id: sessionId, ended_by: 'provider' });
        const reportId = createSessionReport(sessionId);
        later(
          () =>
            emit('report:ready', {
              report_id: reportId,
              scope: 'session',
              version: 1,
              session_id: sessionId,
            }),
          SESSION_REPORT_DELAY_MS,
        );
      }, TYPING_MS + END_DELAY_MS);
      return;
    }
    later(() => emit('typing', { session_id: sessionId, is_typing: true }), REPLY_DELAY_MS * 2);
    later(() => {
      emit('typing', { session_id: sessionId, is_typing: false });
      providerSays(session, PROVIDER_LINES[lineIndex % PROVIDER_LINES.length] ?? GREETING);
      lineIndex += 1;
    }, TYPING_MS);
  }

  /** 어드민 화면 확인용: 접속하고 잠시 뒤 새 위기 경고(risk:new)가 한 번 온다 */
  function alertAdmin(): void {
    if (adminAlerted || currentUser()?.role !== 'admin') return;
    adminAlerted = true;
    const event = addDemoRiskEvent();
    emit('risk:new', {
      risk_event_id: event.id,
      level: event.level,
      source: event.source,
      elapsed_seconds: 0,
    });
  }

  return {
    activate() {
      active = true;
      later(() => handlers.onConnectionChange(true), CONNECT_DELAY_MS);
      later(alertAdmin, ADMIN_RISK_DELAY_MS);
    },
    deactivate() {
      active = false;
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      handlers.onConnectionChange(false);
    },
    send(event, body, reqId) {
      if (event === 'session.join') join(body as JoinBody, reqId);
      else if (event === 'message.send') sendMessage(body as SendBody, reqId);
      else if (event === 'session.leave' || event === 'crisis.share') reply(reqId, true);
    },
  };
}
