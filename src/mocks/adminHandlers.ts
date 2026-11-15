import { http, HttpResponse } from 'msw';

import type { AdminComplaint, ComplaintDecision } from '@/api/pendingAdmin';
import type { Schema } from '@/api/types';
import { kstDateKey } from '@/lib/date';

import {
  adminDb,
  appConfig,
  credentialQueue,
  decideComplaint,
  decideReview,
  kpi,
  revokeStrike,
  riskEventView,
  setUserStatus,
  userRows,
} from './adminDb';
import { currentUser, errorResponse, notFound, unauthenticated, url } from './http';

// 어드민의 목 API (ADM-01~07, STL-02·03, KPI-01, RSK-01~03, CMP-02~06)
const NO_CONTENT = 204;
const DEFAULT_LIMIT = 30;
const MONTH_LENGTH = 7;
const CSV_COLUMNS = [
  'id',
  'provider_id',
  'kind',
  'gross',
  'fee',
  'net',
  'status',
  'status_reason',
] as const;
const noContent = () => new HttpResponse(null, { status: NO_CONTENT });
const invalid = (message: string) => errorResponse(422, 'VALIDATION_ERROR', message);
const now = () => new Date().toISOString();

/** 어드민이 아니면 막는다. 통과하면 null */
function denied(request: Request) {
  const me = currentUser(request);
  if (!me) return unauthenticated();
  return me.role === 'admin' ? null : errorResponse(403, 'FORBIDDEN_ROLE', '권한이 없습니다');
}

function query(request: Request): URLSearchParams {
  return new URL(request.url).searchParams;
}

async function reasonOf(request: Request): Promise<string> {
  const body = (await request.json()) as { reason?: string };
  return (body.reason ?? '').trim();
}

function listItem(complaint: AdminComplaint): AdminComplaint {
  return {
    id: complaint.id,
    created_at: complaint.created_at,
    category: complaint.category,
    source: complaint.source,
    reporter_role: complaint.reporter_role,
    target_display: complaint.target_display,
    target_strike_count: complaint.target_strike_count,
    status: complaint.status,
    decision: complaint.decision,
  };
}

export const adminHandlers = [
  http.get(url('/admin/credentials'), ({ request }) => {
    const blocked = denied(request);
    if (blocked) return blocked;
    const params = query(request);
    const role = params.get('role');
    const kind = params.get('kind');
    const verifyResult = params.get('verify_result');
    // 화면의 '재학·수료' 는 재학과 수료를 함께 본다
    const kinds = kind === 'enrollment' ? ['enrollment', 'completion'] : [kind];
    const items = credentialQueue().filter(
      (item) =>
        (!role || item.role === role) &&
        (!kind || item.credentials?.some((credential) => kinds.includes(credential.kind ?? ''))) &&
        (!verifyResult ||
          item.credentials?.some((credential) => credential.verify_result === verifyResult)),
    );
    const page: Schema<'PageResponseCredentialReviewItem'> = { items };
    return HttpResponse.json(page);
  }),

  http.get(url('/admin/credentials/:userId'), ({ request, params }) => {
    const blocked = denied(request);
    if (blocked) return blocked;
    const review = adminDb.reviews.find((item) => item.user_id === params.userId);
    return review ? HttpResponse.json(review) : notFound();
  }),

  http.post(url('/admin/credentials/:userId/decision'), async ({ request, params }) => {
    const blocked = denied(request);
    if (blocked) return blocked;
    const body = (await request.json()) as Schema<'CredentialDecisionRequest'>;
    const approve = body.decision === 'approve';
    if (!approve && !(body.reason ?? '').trim()) return invalid('반려 사유를 입력해 주세요');
    return decideReview(String(params.userId), approve) ? noContent() : notFound();
  }),

  http.get(url('/admin/users'), ({ request }) => {
    const blocked = denied(request);
    if (blocked) return blocked;
    const params = query(request);
    const keyword = (params.get('q') ?? '').trim();
    const role = params.get('role');
    const status = params.get('status');
    const rows = userRows().filter(
      (row) =>
        (!role || row.role === role) &&
        (!status || row.status === status) &&
        (!keyword || `${row.nickname ?? ''} ${row.display_name ?? ''}`.includes(keyword)),
    );
    const offset = Number(params.get('cursor')) || 0;
    const limit = Number(params.get('limit')) || DEFAULT_LIMIT;
    const page: Schema<'PageResponseAdminUserRow'> = {
      items: rows.slice(offset, offset + limit),
      next_cursor: offset + limit < rows.length ? String(offset + limit) : undefined,
    };
    return HttpResponse.json(page);
  }),

  http.patch(url('/admin/users/:userId'), async ({ request, params }) => {
    const blocked = denied(request);
    if (blocked) return blocked;
    const body = (await request.json()) as Schema<'AdminUserStatusRequest'>;
    if (!body.reason.trim()) return invalid('사유를 입력해 주세요');
    return setUserStatus(String(params.userId), body.status, body.until) ? noContent() : notFound();
  }),

  http.post(url('/admin/users/:userId/revoke-tokens'), async ({ request }) => {
    const blocked = denied(request);
    if (blocked) return blocked;
    return (await reasonOf(request)) ? noContent() : invalid('사유를 입력해 주세요');
  }),

  http.get(url('/admin/settings'), ({ request }) => {
    const blocked = denied(request);
    if (blocked) return blocked;
    const page: Schema<'PageResponseSettingResponse'> = { items: adminDb.settings };
    return HttpResponse.json(page);
  }),

  http.put(url('/admin/settings/:key'), async ({ request, params }) => {
    const blocked = denied(request);
    if (blocked) return blocked;
    const setting = adminDb.settings.find((item) => item.key === params.key);
    if (!setting) return notFound();
    const body = (await request.json()) as { value?: unknown };
    setting.value = body.value as typeof setting.value;
    setting.updated_at = now();
    // 기능 플래그와 점검 모드는 PUB-02 응답에 바로 반영된다
    if (setting.key === 'feature_flags') {
      appConfig.feature_flags = body.value as Record<string, boolean>;
    }
    if (setting.key === 'maintenance') {
      appConfig.maintenance = body.value as Schema<'Maintenance'>;
    }
    return HttpResponse.json(setting);
  }),

  http.get(url('/admin/settlements'), ({ request }) => {
    const blocked = denied(request);
    if (blocked) return blocked;
    const params = query(request);
    const month = params.get('month');
    const status = params.get('status');
    const kind = params.get('kind');
    const items = adminDb.settlements.filter(
      (item) =>
        (!month || kstDateKey(item.created_at ?? '').slice(0, MONTH_LENGTH) === month) &&
        (!status || item.status === status) &&
        (!kind || item.kind === kind),
    );
    if ((request.headers.get('Accept') ?? '').includes('text/csv')) {
      const lines = [
        CSV_COLUMNS.join(','),
        ...items.map((item) => CSV_COLUMNS.map((column) => item[column] ?? '').join(',')),
      ];
      return new HttpResponse(`﻿${lines.join('\n')}`, {
        headers: { 'Content-Type': 'text/csv; charset=utf-8' },
      });
    }
    const page: Schema<'PageResponseSettlementResponse'> = { items };
    return HttpResponse.json(page);
  }),

  http.post(url('/admin/settlements/pay'), async ({ request }) => {
    const blocked = denied(request);
    if (blocked) return blocked;
    const body = (await request.json()) as Schema<'SettlementPayRequest'>;
    // 지급 예정(pending) 건만 지급 완료로 바뀐다
    const targets = adminDb.settlements.filter(
      (item) => body.ids.includes(item.id ?? '') && item.status === 'pending',
    );
    targets.forEach((item) => {
      item.status = 'paid';
      item.paid_at = now();
    });
    const result: Schema<'SettlementPayResponse'> = {
      paid_count: targets.length,
      paid_net: targets.reduce((sum, item) => sum + (item.net ?? 0), 0),
    };
    return HttpResponse.json(result);
  }),

  http.get(url('/admin/kpi'), ({ request }) => {
    const blocked = denied(request);
    if (blocked) return blocked;
    const params = query(request);
    return HttpResponse.json(kpi(params.get('from') ?? '', params.get('to') ?? ''));
  }),

  http.get(url('/admin/risk-events'), ({ request }) => {
    const blocked = denied(request);
    if (blocked) return blocked;
    const params = query(request);
    const status = params.get('status');
    const level = params.get('level');
    const events = adminDb.riskEvents
      .filter((event) => (!status || event.status === status) && (!level || event.level === level))
      .map(riskEventView);
    return HttpResponse.json(events);
  }),

  http.post(url('/admin/risk-events/:id/ack'), ({ request, params }) => {
    const blocked = denied(request);
    if (blocked) return blocked;
    const event = adminDb.riskEvents.find((item) => item.id === params.id);
    if (!event) return notFound();
    event.status = 'acknowledged';
    event.timeline = [...event.timeline, { at: now(), action: '어드민 확인' }];
    return noContent();
  }),

  http.post(url('/admin/risk-events/:id/escalate'), async ({ request, params }) => {
    const blocked = denied(request);
    if (blocked) return blocked;
    const event = adminDb.riskEvents.find((item) => item.id === params.id);
    if (!event) return notFound();
    const body = (await request.json()) as { expert_id?: string };
    if (!body.expert_id) return invalid('연결할 전문가를 골라 주세요');
    const expert = userRows().find((row) => row.id === body.expert_id);
    event.status = 'escalated';
    event.timeline = [
      ...event.timeline,
      { at: now(), action: `전문가 연결: ${expert?.display_name ?? expert?.nickname ?? ''}` },
    ];
    return noContent();
  }),

  http.post(url('/admin/risk-events/:id/resolve'), async ({ request, params }) => {
    const blocked = denied(request);
    if (blocked) return blocked;
    const event = adminDb.riskEvents.find((item) => item.id === params.id);
    if (!event) return notFound();
    const body = (await request.json()) as { note?: string; false_positive?: boolean };
    const note = (body.note ?? '').trim();
    if (!note) return invalid('조치 메모를 입력해 주세요');
    event.status = 'resolved';
    event.false_positive = body.false_positive === true;
    event.timeline = [...event.timeline, { at: now(), action: `종결: ${note}` }];
    return noContent();
  }),

  http.get(url('/admin/complaints'), ({ request }) => {
    const blocked = denied(request);
    if (blocked) return blocked;
    const params = query(request);
    const status = params.get('status');
    const category = params.get('category');
    const source = params.get('source');
    const items = adminDb.complaints
      .filter(
        (item) =>
          (!status || item.status === status) &&
          (!category || item.category === category) &&
          (!source || item.source === source),
      )
      .map(listItem);
    return HttpResponse.json(items);
  }),

  http.get(url('/admin/complaints/:id'), ({ request, params }) => {
    const blocked = denied(request);
    if (blocked) return blocked;
    const complaint = adminDb.complaints.find((item) => item.id === params.id);
    if (!complaint) return notFound();
    // 어드민이 열면 심사 중으로 바뀐다 (백엔드 15-10)
    if (complaint.status === 'received') complaint.status = 'in_review';
    return HttpResponse.json(complaint);
  }),

  http.post(url('/admin/complaints/:id/decision'), async ({ request, params }) => {
    const blocked = denied(request);
    if (blocked) return blocked;
    const body = (await request.json()) as { decision?: ComplaintDecision; reason?: string };
    if (!body.decision || !(body.reason ?? '').trim())
      return invalid('판정과 사유를 입력해 주세요');
    return decideComplaint(String(params.id), body.decision) ? noContent() : notFound();
  }),

  http.get(url('/admin/strikes'), ({ request }) => {
    const blocked = denied(request);
    return blocked ?? HttpResponse.json(adminDb.strikes);
  }),

  http.get(url('/admin/client-sanctions'), ({ request }) => {
    const blocked = denied(request);
    return blocked ?? HttpResponse.json(adminDb.sanctions);
  }),

  http.post(url('/admin/strikes/:id/revoke'), async ({ request, params }) => {
    const blocked = denied(request);
    if (blocked) return blocked;
    if (!(await reasonOf(request))) return invalid('사유를 입력해 주세요');
    return revokeStrike(String(params.id)) ? noContent() : notFound();
  }),

  http.post(url('/admin/client-sanctions/:id/lift'), async ({ request, params }) => {
    const blocked = denied(request);
    if (blocked) return blocked;
    if (!(await reasonOf(request))) return invalid('사유를 입력해 주세요');
    const sanction = adminDb.sanctions.find((item) => item.id === params.id);
    if (!sanction) return notFound();
    sanction.lifted_at = now();
    return noContent();
  }),
];
