import { http, HttpResponse } from 'msw';

import type { ComplaintCreateRequest, Consent, ConsentCreateRequest } from '@/api/pending';

import { mockDb } from './db';
import { currentUser, errorResponse, notFound, unauthenticated, url } from './http';
import { changeIncluded, createReferral, referralView, reportDb, reportView } from './reportDb';

// 상담 정리·연계·동의·민원의 목 API (RPT-01, REF-01~03·07, CNS-01~03, CMP-01)
const NO_CONTENT = 204;
const SIGNUP_CONSENTS = ['terms', 'privacy', 'sensitive', 'age14'] as const;
const noContent = () => new HttpResponse(null, { status: NO_CONTENT });

function ownReferral(referralId: unknown, userId: string | undefined) {
  const stored = reportDb.referrals.get(String(referralId));
  return stored && stored.clientId === userId ? stored : undefined;
}

export const reportHandlers = [
  http.get(url('/me/reports/:reportId'), ({ request, params }) => {
    if (!currentUser(request)) return unauthenticated();
    const report = reportView(String(params.reportId));
    // 서버처럼 요약을 JSON 글자로 준다
    return report
      ? HttpResponse.json({
          ...report,
          client_summary: report.client_summary && JSON.stringify(report.client_summary),
        })
      : notFound();
  }),

  http.post(url('/referrals'), ({ request }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    const created = createReferral(me.id).referral;
    return HttpResponse.json({ id: created.id, status: created.status }, { status: 201 });
  }),

  http.get(url('/referrals/:referralId'), ({ request, params }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    if (!ownReferral(params.referralId, me.id)) return notFound();
    return HttpResponse.json(referralView(String(params.referralId)));
  }),

  http.put(url('/referrals/:referralId/expert'), async ({ request, params }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    const stored = ownReferral(params.referralId, me.id);
    if (!stored) return notFound();
    const body = (await request.json()) as { expert_id?: string };
    stored.detail.referral = {
      ...stored.detail.referral,
      status: 'expert_selected',
      expert_id: body.expert_id,
    };
    return noContent();
  }),

  http.put(url('/referrals/:referralId/sessions'), async ({ request, params }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    const stored = ownReferral(params.referralId, me.id);
    if (!stored) return notFound();
    if (stored.detail.referral.included_locked_at) {
      return errorResponse(409, 'INCLUDED_LOCKED', '동의한 뒤에는 포함할 상담을 바꿀 수 없습니다');
    }
    const body = (await request.json()) as { session_ids?: string[] };
    const eligible = stored.detail.eligible_sessions.map((session) => session.session_id);
    const ids = body.session_ids ?? [];
    if (ids.length === 0 || ids.some((id) => !eligible.includes(id))) {
      return errorResponse(422, 'SESSION_NOT_ELIGIBLE', '포함할 수 없는 상담입니다');
    }
    changeIncluded(String(params.referralId), ids);
    return noContent();
  }),

  http.get(url('/me/consents'), ({ request }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    const signup: Consent[] = SIGNUP_CONSENTS.map((type) => ({
      id: `signup-${type}`,
      type,
      granted_at: '2026-10-20T03:00:00Z',
    }));
    // 목 내부에서만 쓰는 값(userId, referralId)은 응답에 싣지 않는다
    const transfers: Consent[] = reportDb.consents
      .filter((consent) => consent.userId === me.id)
      .map((consent) => ({
        id: consent.id,
        type: consent.type,
        granted_at: consent.granted_at,
        revoked_at: consent.revoked_at,
        target_expert_display: consent.target_expert_display,
        report_version: consent.report_version,
        session_count: consent.session_count,
        session_dates: consent.session_dates,
      }));
    return HttpResponse.json([...transfers, ...signup]);
  }),

  http.post(url('/consents'), async ({ request }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    const body = (await request.json()) as ConsentCreateRequest;
    const stored = ownReferral(body.referral_id, me.id);
    const view = referralView(body.referral_id ?? '');
    if (!stored || !view) return notFound();
    if (!stored.detail.referral.expert_id) {
      return errorResponse(409, 'INVALID_STATE', '전문가를 먼저 선택해 주세요');
    }
    if (view.report?.status !== 'ready') {
      return errorResponse(409, 'REPORT_NOT_READY', '리포트를 만드는 중입니다');
    }
    const now = new Date().toISOString();
    stored.detail.referral = {
      ...stored.detail.referral,
      included_locked_at: stored.detail.referral.included_locked_at ?? now,
    };
    const included = stored.detail.included_session_ids;
    reportDb.consents.push({
      id: crypto.randomUUID(),
      type: body.type,
      granted_at: now,
      target_expert_display: mockDb.providers.find(
        (provider) => provider.provider_id === stored.detail.referral.expert_id,
      )?.display_name,
      report_version: view.report.version,
      session_count: included.length,
      session_dates: stored.detail.eligible_sessions
        .filter((session) => included.includes(session.session_id))
        .map((session) => session.date),
      userId: me.id,
      referralId: body.referral_id,
    });
    return noContent();
  }),

  http.post(url('/consents/:consentId/revoke'), async ({ request, params }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    if (String(params.consentId).startsWith('signup-')) {
      return errorResponse(422, 'VALIDATION_ERROR', '필수 약관 동의는 탈퇴로만 철회할 수 있습니다');
    }
    const consent = reportDb.consents.find(
      (item) => item.id === params.consentId && item.userId === me.id,
    );
    if (!consent) return notFound();
    const body = (await request.json()) as { reason?: string };
    if (!body.reason) return errorResponse(422, 'VALIDATION_ERROR', '철회 사유가 필요합니다');
    consent.revoked_at = new Date().toISOString();
    return noContent();
  }),

  http.post(url('/complaints'), async ({ request }) => {
    const me = currentUser(request);
    if (!me) return unauthenticated();
    const body = (await request.json()) as ComplaintCreateRequest;
    if (reportDb.complaintSessionIds.has(body.session_id)) {
      return errorResponse(409, 'COMPLAINT_EXISTS', '이미 접수된 민원이 있습니다');
    }
    reportDb.complaintSessionIds.add(body.session_id);
    return noContent();
  }),
];
