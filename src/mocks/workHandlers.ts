import { http, HttpResponse } from 'msw';

import type { SupervisionRequestCreate, SupervisionWrite } from '@/api/pendingProvider';
import type { Schema } from '@/api/types';

import { mockDb, type MockSlot } from './db';
import { currentUser, errorResponse, notFound, unauthenticated, url } from './http';
import {
  expertReport,
  providerDb,
  sessionHistory,
  settlements,
  supervisionContext,
} from './providerDb';

// 수련생·전문가 업무의 목 API (SLT-01·02·04, STL-01, SUP, REF-04~06, RPT-02, SES-06·08·09, RSK-04, CMP-05)
const NO_CONTENT = 204;
const ACCEPTED = 202;
const MINUTE = 60_000;
const WEEK = 7 * 24 * 60 * MINUTE;
const CERTIFICATE_DELAY_MS = 3000;
const noContent = () => new HttpResponse(null, { status: NO_CONTENT });

function slotMinutes(expert: boolean): number {
  return expert ? 50 : 30;
}

export const workHandlers = [
  http.get(url('/me/slots'), ({ request }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    const query = new URL(request.url).searchParams;
    const from = Date.parse(query.get('from') ?? '') || 0;
    const to = Date.parse(query.get('to') ?? '') || Number.MAX_SAFE_INTEGER;
    const mine: Schema<'MySlotResponse'>[] = mockDb.slots
      .filter((slot) => slot.provider_id === me.id)
      .filter((slot) => {
        const start = Date.parse(slot.start_at ?? '');
        return start >= from && start < to;
      })
      .map((slot) => ({
        id: slot.id,
        start_at: slot.start_at,
        end_at: slot.end_at,
        status: slot.status,
      }));
    return HttpResponse.json(mine);
  }),

  http.post(url('/me/slots'), async ({ request }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    if (me.status === 'suspended') {
      return errorResponse(403, 'ACCOUNT_SUSPENDED', '이용이 정지된 계정입니다');
    }
    const body = (await request.json()) as Schema<'SlotCreateRequest'>;
    const length = slotMinutes(me.role === 'expert') * MINUTE;
    const weeks = Array.from({ length: (body.repeat_weeks ?? 0) + 1 }, (_, week) => week);
    const starts = body.starts.flatMap((start) =>
      weeks.map((week) => Date.parse(start) + week * WEEK),
    );
    const mine = mockDb.slots.filter((slot) => slot.provider_id === me.id);
    const overlaps = starts.some(
      (start) =>
        start < Date.now() ||
        mine.some(
          (slot) =>
            start < Date.parse(slot.end_at ?? '') &&
            start + length > Date.parse(slot.start_at ?? ''),
        ),
    );
    if (overlaps) return errorResponse(422, 'SLOT_OVERLAP', '다른 시간과 겹칩니다');
    const created = starts.map((start): MockSlot => ({
      id: crypto.randomUUID(),
      provider_id: me.id ?? '',
      start_at: new Date(start).toISOString(),
      end_at: new Date(start + length).toISOString(),
      status: 'open',
    }));
    mockDb.slots.push(...created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.delete(url('/me/slots/:slotId'), ({ request, params }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    const index = mockDb.slots.findIndex(
      (slot) => slot.id === params.slotId && slot.provider_id === me.id,
    );
    const slot = mockDb.slots[index];
    if (!slot) return notFound();
    if (slot.status !== 'open') {
      return errorResponse(409, 'SLOT_BOOKED', '예약이 있는 시간은 바꿀 수 없습니다');
    }
    mockDb.slots.splice(index, 1);
    return noContent();
  }),

  http.get(url('/me/settlements'), ({ request }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    const month = new URL(request.url).searchParams.get('month') ?? '';
    return HttpResponse.json(settlements(month, me.role === 'expert'));
  }),

  http.get(url('/me/strikes'), ({ request }) =>
    currentUser(request) ? HttpResponse.json(providerDb.strikes) : unauthenticated(),
  ),

  http.get(url('/trainee/supervisions'), ({ request }) => {
    if (!currentUser(request)) return unauthenticated();
    return HttpResponse.json(
      providerDb.supervisions.map((item) => ({
        id: item.id,
        session_date: item.session_date,
        category: item.category,
        expert_display: item.expert_display,
        submitted_at: item.submitted_at,
        read_at: item.read_at,
        session_count: item.session_count,
      })),
    );
  }),

  http.get(url('/trainee/supervisions/:id'), ({ request, params }) => {
    if (!currentUser(request)) return unauthenticated();
    const index = providerDb.supervisions.findIndex((item) => item.id === params.id);
    const found = providerDb.supervisions[index];
    if (!found) return notFound();
    // 처음 열면 읽음으로 기록한다
    const read = { ...found, read_at: found.read_at ?? new Date().toISOString() };
    providerDb.supervisions[index] = read;
    return HttpResponse.json(read);
  }),

  http.get(url('/trainee/competency'), ({ request }) =>
    currentUser(request) ? HttpResponse.json(providerDb.competency) : unauthenticated(),
  ),

  http.get(url('/trainee/certificates'), ({ request }) => {
    if (!currentUser(request)) return unauthenticated();
    const now = Date.now();
    return HttpResponse.json(
      providerDb.certificates.map((item) =>
        item.status === 'generating' &&
        now - Date.parse(item.issued_at ?? '') > CERTIFICATE_DELAY_MS
          ? { ...item, status: 'ready' }
          : item,
      ),
    );
  }),

  http.post(url('/trainee/certificates'), ({ request }) => {
    if (!currentUser(request)) return unauthenticated();
    const certificate = {
      id: crypto.randomUUID(),
      status: 'generating' as const,
      code: 'MC-2026-0001',
      issued_at: new Date().toISOString(),
    };
    providerDb.certificates = [certificate, ...providerDb.certificates];
    return HttpResponse.json(certificate, { status: ACCEPTED });
  }),

  http.get(url('/trainee/certificates/:id/download'), ({ request }) =>
    currentUser(request) ? HttpResponse.json({ url: '/verify/MC-2026-0001' }) : unauthenticated(),
  ),

  http.get(url('/trainee/supervision-requests'), ({ request }) =>
    currentUser(request) ? HttpResponse.json(providerDb.supervisionRequests) : unauthenticated(),
  ),

  http.post(url('/supervision-requests'), async ({ request }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    const body = (await request.json()) as SupervisionRequestCreate;
    const session = mockDb.sessions.find((item) => item.session_id === body.session_id);
    providerDb.supervisionRequests = [
      {
        id: crypto.randomUUID(),
        session_id: body.session_id,
        session_date: session?.scheduled_start ?? new Date().toISOString(),
        question: body.question,
        status: 'pending',
        created_at: new Date().toISOString(),
        fee: 0,
        expert_display: null,
        trainee_display: me.provider_profile?.display_name ?? me.nickname,
      },
      ...providerDb.supervisionRequests,
    ];
    return noContent();
  }),

  http.get(url('/expert/supervisions'), ({ request }) =>
    currentUser(request) ? HttpResponse.json(providerDb.expertSupervisions) : unauthenticated(),
  ),

  http.get(url('/expert/supervisions/:id/context'), ({ request, params }) =>
    currentUser(request)
      ? HttpResponse.json(supervisionContext(String(params.id)))
      : unauthenticated(),
  ),

  http.put(url('/expert/supervisions/:id'), async ({ request, params }) => {
    if (!currentUser(request)) return unauthenticated();
    const id = String(params.id);
    const index = providerDb.expertSupervisions.findIndex((item) => item.id === id);
    const found = providerDb.expertSupervisions[index];
    if (!found) return notFound();
    if (found.status === 'submitted') {
      return errorResponse(409, 'ALREADY_SUBMITTED', '이미 제출되었습니다');
    }
    const body = (await request.json()) as SupervisionWrite;
    providerDb.supervisionWrites.set(id, body);
    providerDb.expertSupervisions[index] = body.draft
      ? { ...found, status: 'draft' }
      : { ...found, status: 'submitted', settlement_locked: false, referral_remaining: 0 };
    return noContent();
  }),

  http.get(url('/expert/supervision-requests'), ({ request }) =>
    currentUser(request)
      ? HttpResponse.json(
          providerDb.supervisionRequests.filter((item) => item.status === 'pending'),
        )
      : unauthenticated(),
  ),

  http.post(url('/supervision-requests/:id/accept'), ({ request, params }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    const target = providerDb.supervisionRequests.find((item) => item.id === params.id);
    if (!target) return notFound();
    providerDb.supervisionRequests = providerDb.supervisionRequests.map((item) =>
      item === target
        ? { ...item, status: 'accepted', expert_display: me.provider_profile?.display_name }
        : item,
    );
    const supervisionId = `esup-${crypto.randomUUID()}`;
    providerDb.expertSupervisions = [
      ...providerDb.expertSupervisions,
      {
        id: supervisionId,
        trainee_display: target.trainee_display ?? '',
        session_count: 1,
        due_at: new Date(Date.now() + 3 * 24 * 60 * MINUTE).toISOString(),
        status: 'pending',
        settlement_locked: false,
      },
    ];
    return HttpResponse.json({ supervision_id: supervisionId });
  }),

  http.get(url('/expert/referrals'), ({ request }) =>
    currentUser(request) ? HttpResponse.json(providerDb.referrals) : unauthenticated(),
  ),

  http.post(url('/expert/referrals/:id/respond'), async ({ request, params }) => {
    if (!currentUser(request)) return unauthenticated();
    const body = (await request.json()) as { action?: string };
    const target = providerDb.referrals.find((item) => item.id === params.id);
    if (!target) return notFound();
    providerDb.referrals = providerDb.referrals.map((item) =>
      item === target
        ? { ...item, status: body.action === 'accept' ? 'accepted' : 'declined' }
        : item,
    );
    return noContent();
  }),

  http.get(url('/expert/reports/:reportId'), ({ request, params }) => {
    if (!currentUser(request)) return unauthenticated();
    const report = expertReport(String(params.reportId));
    return report
      ? HttpResponse.json(report)
      : errorResponse(403, 'NO_CONSENT', '열람 동의가 없습니다');
  }),

  http.get(url('/sessions/:sessionId/history'), ({ request }) =>
    currentUser(request) ? HttpResponse.json(sessionHistory()) : unauthenticated(),
  ),

  http.post(url('/sessions/:sessionId/referral-suggestion'), ({ request }) =>
    currentUser(request) ? noContent() : unauthenticated(),
  ),

  http.put(url('/sessions/:sessionId/note'), ({ request }) =>
    currentUser(request) ? noContent() : unauthenticated(),
  ),

  http.post(url('/sessions/:sessionId/end'), ({ request, params }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    const session = mockDb.sessions.find(
      (item) => item.session_id === params.sessionId && item.provider_id === me.id,
    );
    if (!session) return notFound();
    session.status = 'completed';
    return noContent();
  }),

  http.get(url('/risk-events'), ({ request }) =>
    currentUser(request) ? HttpResponse.json([]) : unauthenticated(),
  ),

  http.post(url('/risk-events/:id/acknowledge'), ({ request }) =>
    currentUser(request) ? noContent() : unauthenticated(),
  ),

  http.post(url('/risk-events/:id/call-oncall'), ({ request }) =>
    currentUser(request) ? noContent() : unauthenticated(),
  ),
];
