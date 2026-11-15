import { delay, http, HttpResponse } from 'msw';

import type { SessionCreateRequest } from '@/api/pending';
import type { Schema } from '@/api/types';

import { MOCK_PRICE, mockDb, type MockSession } from './db';
import { currentUser, errorResponse, notFound, unauthenticated, url } from './http';
import { sessionReportOf } from './reportDb';
import { assessMockRisk } from './risk';

// 접수·예약·결제·상담 흐름의 목 API (INT, SLT, SES, PAY, MSG)
// - 고민 글에 '후보 없음' 이 들어가면 후보가 없는 결과를, '분석 지연' 이 들어가면 ai_fallback 을 돌려준다
const HOLD_MS = 10 * 60_000;
const INTAKE_DELAY_MS = 1500;
const MIN_INTAKE_CHARS = 20;
const MATCH_COUNT = 3;
const NO_CONTENT = 204;
const EMPTY_KEYWORD = '후보 없음';
const FALLBACK_KEYWORD = '분석 지연';

type Intake = Schema<'IntakeResponse'>;
type Match = Schema<'Match'>;

// 인덱스 시그니처가 있는 ai_tags 에 넣을 수 있게 interface 가 아닌 type 으로 둔다
type Tags = { emotions: string[]; distortions: string[]; keywords: string[] };

const DEFAULT_TAGS: Tags = { emotions: ['허무'], distortions: [], keywords: [] };

const TAGS: Record<string, Tags> = {
  career: { emotions: ['불안', '초조'], distortions: ['파국화'], keywords: ['청년 진로'] },
  burnout: { emotions: ['무기력', '좌절'], distortions: ['당위적 사고'], keywords: ['번아웃'] },
  relationship: { emotions: ['외로움', '불안'], distortions: ['독심술'], keywords: ['대인관계'] },
  romance: { emotions: ['슬픔', '외로움'], distortions: ['과일반화'], keywords: ['연애'] },
  family: { emotions: ['분노', '죄책감'], distortions: ['개인화'], keywords: ['가족'] },
  self: { emotions: ['수치심', '우울'], distortions: ['낙인찍기'], keywords: ['자존감'] },
};

const noContent = () => new HttpResponse(null, { status: NO_CONTENT });

/** 역할에 맞는 세션 응답: 내담자에게는 리포트 요약, 상담사에게는 내담자 닉네임·카테고리·회기 수 */
function sessionView(session: MockSession, viewerId: string | undefined) {
  if (session.client_id === viewerId) {
    return { ...session, report: sessionReportOf(session.session_id) };
  }
  const client = [...mockDb.users.values()].find((user) => user.id === session.client_id);
  const earlier = mockDb.sessions.filter(
    (item) =>
      item.client_id === session.client_id &&
      item.provider_id === session.provider_id &&
      (item.scheduled_start ?? '') <= (session.scheduled_start ?? ''),
  );
  return {
    ...session,
    client_nickname: client?.nickname ?? '내담자',
    category: 'burnout',
    visit_no: earlier.length,
    supervision_ready: session.status === 'COMPLETED',
    intake_summary: {
      category: 'burnout',
      ai_tags: { emotions: ['무기력', '좌절'], distortions: ['당위적 사고'] },
      raw_text: null,
    },
  };
}

function findSession(sessionId: unknown, userId: string | undefined): MockSession | undefined {
  return mockDb.sessions.find(
    (session) =>
      session.session_id === sessionId &&
      (session.client_id === userId || session.provider_id === userId),
  );
}

function releaseSlot(sessionId: string): void {
  const slot = mockDb.slots.find((item) => item.id === mockDb.sessionSlots.get(sessionId));
  if (slot) slot.status = 'open';
  mockDb.sessionSlots.delete(sessionId);
  mockDb.holds.delete(sessionId);
}

function holdExpired(sessionId: string): boolean {
  return (mockDb.holds.get(sessionId) ?? 0) < Date.now();
}

/** 서버의 1분 배치처럼, 홀드가 끝난 결제 대기 세션을 취소한다 */
function expireHolds(): void {
  mockDb.sessions
    .filter(
      (session) => session.status === 'PENDING_PAYMENT' && holdExpired(session.session_id ?? ''),
    )
    .forEach((session) => {
      session.status = 'CANCELLED';
      releaseSlot(session.session_id ?? '');
    });
}

function earliestSlot(providerId: string | undefined): string | undefined {
  return mockDb.slots
    .filter((slot) => slot.provider_id === providerId && slot.status === 'open')
    .map((slot) => slot.start_at ?? '')
    .sort()[0];
}

function buildMatches(expertsOnly: boolean, keywords: readonly string[]): Match[] {
  return mockDb.providers
    .filter((provider) => (provider.track === 'expert') === expertsOnly)
    .filter((provider) => earliestSlot(provider.provider_id) !== undefined)
    .slice(0, MATCH_COUNT)
    .map((provider, index): Match => {
      const fits = provider.specialties?.some((item) => keywords.includes(item)) ?? false;
      return {
        provider_id: provider.provider_id,
        display_name: provider.display_name,
        track: expertsOnly ? 'professional' : 'coaching',
        specialties: provider.specialties,
        reasons: [fits ? '고민 분야와 잘 맞아요' : '가까운 시간에 예약할 수 있어요'],
        earliest_slot: earliestSlot(provider.provider_id),
        price: expertsOnly ? MOCK_PRICE.professional : MOCK_PRICE.coaching,
        score_rank: index + 1,
      };
    });
}

export const clientHandlers = [
  http.post(url('/intakes'), async ({ request }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    const body = (await request.json()) as Schema<'IntakeCreateRequest'>;
    if (Array.from(body.text).length < MIN_INTAKE_CHARS) {
      return errorResponse(422, 'VALIDATION_ERROR', '입력값을 확인해 주세요', {
        fields: { text: '20자 이상 적어 주세요' },
      });
    }
    await delay(INTAKE_DELAY_MS);

    const level = assessMockRisk(body.text);
    const tags = TAGS[body.category] ?? DEFAULT_TAGS;
    const intake: Intake = {
      intake_id: crypto.randomUUID(),
      category: body.category,
      ai_tags: tags,
      ai_fallback: body.text.includes(FALLBACK_KEYWORD),
      risk: { level },
      matches: body.text.includes(EMPTY_KEYWORD)
        ? []
        : buildMatches(level === 'high' || level === 'critical', tags.keywords),
    };
    mockDb.intakes.set(intake.intake_id ?? '', intake);
    return HttpResponse.json(intake);
  }),

  http.get(url('/intakes/:intakeId/matches'), ({ request, params }) => {
    if (!currentUser(request)) return unauthenticated();
    const intake = mockDb.intakes.get(String(params.intakeId));
    return intake ? HttpResponse.json(intake.matches ?? []) : notFound();
  }),

  http.get(url('/providers/:providerId/slots'), ({ request, params }) => {
    const query = new URL(request.url).searchParams;
    const from = Date.parse(query.get('from') ?? '') || 0;
    const to = Date.parse(query.get('to') ?? '') || Number.MAX_SAFE_INTEGER;
    const open: Schema<'OpenSlotResponse'>[] = mockDb.slots
      .filter((slot) => slot.provider_id === params.providerId && slot.status === 'open')
      .filter((slot) => {
        const start = Date.parse(slot.start_at ?? '');
        return start >= from && start <= to;
      })
      .map((slot) => ({ id: slot.id, start_at: slot.start_at, end_at: slot.end_at }));
    return HttpResponse.json(open);
  }),

  http.get(url('/sessions'), ({ request }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    expireHolds();
    return HttpResponse.json(
      mockDb.sessions
        .filter((session) => session.client_id === me.id || session.provider_id === me.id)
        .map((session) => sessionView(session, me.id)),
    );
  }),

  http.post(url('/sessions'), async ({ request }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    if (me.status === 'restricted') {
      return errorResponse(403, 'CLIENT_RESTRICTED', '예약이 제한된 계정입니다');
    }
    const body = (await request.json()) as SessionCreateRequest;
    const slot = mockDb.slots.find((item) => item.id === body.slot_id);
    if (!slot) return notFound();
    if (slot.status !== 'open') return errorResponse(409, 'SLOT_TAKEN', '이미 예약된 시간입니다');

    const provider = mockDb.providers.find((item) => item.provider_id === slot.provider_id);
    const session: MockSession = {
      session_id: crypto.randomUUID(),
      track: provider?.track === 'expert' ? 'professional' : 'coaching',
      status: 'PENDING_PAYMENT',
      client_id: me.id,
      provider_id: slot.provider_id,
      scheduled_start: slot.start_at,
      scheduled_end: slot.end_at,
    };
    slot.status = 'held';
    mockDb.sessions.push(session);
    mockDb.holds.set(session.session_id ?? '', Date.now() + HOLD_MS);
    mockDb.sessionSlots.set(session.session_id ?? '', slot.id ?? '');
    return HttpResponse.json(session, { status: 201 });
  }),

  http.get(url('/sessions/:sessionId'), ({ request, params }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    expireHolds();
    const session = findSession(params.sessionId, me.id);
    return session ? HttpResponse.json(sessionView(session, me.id)) : notFound();
  }),

  http.post(url('/sessions/:sessionId/cancel'), ({ request, params }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    const session = findSession(params.sessionId, me.id);
    if (!session) return notFound();
    if (session.status !== 'CONFIRMED' && session.status !== 'PENDING_PAYMENT') {
      return errorResponse(409, 'INVALID_STATE', '지금 상태에서는 할 수 없는 요청입니다');
    }
    session.status = 'CANCELLED';
    releaseSlot(session.session_id ?? '');
    return noContent();
  }),

  http.post(url('/sessions/:sessionId/mood'), async ({ request, params }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    if (!findSession(params.sessionId, me.id)) return notFound();
    const body = (await request.json()) as Schema<'MoodCheckRequest'>;
    const key = `${String(params.sessionId)}:${body.phase}`;
    if (mockDb.moods.has(key)) {
      return errorResponse(409, 'ALREADY_SUBMITTED', '이미 제출되었습니다');
    }
    mockDb.moods.add(key);
    return noContent();
  }),

  http.post(url('/sessions/:sessionId/review'), async ({ request, params }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    const session = findSession(params.sessionId, me.id);
    if (!session) return notFound();
    const body = (await request.json()) as Schema<'SessionReviewRequest'>;
    session.rating = body.rating;
    return noContent();
  }),

  http.get(url('/sessions/:sessionId/messages'), ({ request, params }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    if (!findSession(params.sessionId, me.id)) return notFound();
    const afterId = new URL(request.url).searchParams.get('afterId');
    const messages = mockDb.messages.get(String(params.sessionId)) ?? [];
    return HttpResponse.json(
      afterId ? messages.filter((message) => (message.id ?? '') > afterId) : messages,
    );
  }),

  http.post(url('/identity/verify'), ({ request }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    mockDb.verifiedUserIds.add(me.id ?? '');
    const verified: Schema<'IdentityVerifyResponse'> = { verified: true };
    return HttpResponse.json(verified);
  }),

  http.post(url('/payments/prepare'), async ({ request }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    const body = (await request.json()) as Schema<'PaymentPrepareRequest'>;
    const session = findSession(body.session_id, me.id);
    if (!session) return notFound();
    if (session.status !== 'PENDING_PAYMENT') {
      return errorResponse(409, 'INVALID_STATE', '지금 상태에서는 할 수 없는 요청입니다');
    }
    if (holdExpired(body.session_id)) {
      return errorResponse(410, 'HOLD_EXPIRED', '예약 대기 시간이 지났습니다');
    }
    if (!mockDb.verifiedUserIds.has(me.id ?? '')) {
      return errorResponse(409, 'INVALID_STATE', '본인인증이 필요합니다');
    }
    const amount = session.track === 'professional' ? MOCK_PRICE.professional : MOCK_PRICE.coaching;
    const prepared: Schema<'PaymentPrepareResponse'> = {
      order_id: `order_${crypto.randomUUID()}`,
      amount,
      provider: 'mock',
    };
    mockDb.orders.set(prepared.order_id ?? '', { session_id: body.session_id, amount });
    return HttpResponse.json(prepared);
  }),

  http.post(url('/payments/confirm'), async ({ request }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    const body = (await request.json()) as Schema<'PaymentConfirmRequest'>;
    const order = mockDb.orders.get(body.order_id);
    const session = order ? findSession(order.session_id, me.id) : undefined;
    if (!order || !session) return notFound();
    if (session.status === 'PENDING_PAYMENT' && holdExpired(order.session_id)) {
      return errorResponse(410, 'HOLD_EXPIRED', '예약 대기 시간이 지났습니다');
    }
    const slot = mockDb.slots.find((item) => item.id === mockDb.sessionSlots.get(order.session_id));
    if (slot) slot.status = 'booked';
    session.status = 'CONFIRMED';
    mockDb.holds.delete(order.session_id);
    const confirmed: Schema<'PaymentConfirmResponse'> = {
      payment_id: crypto.randomUUID(),
      session_id: order.session_id,
      status: 'paid',
      amount: order.amount,
      paid_at: new Date().toISOString(),
    };
    return HttpResponse.json(confirmed);
  }),
];
