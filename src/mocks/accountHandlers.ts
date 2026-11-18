import { http, HttpResponse } from 'msw';

import type { CertificateVerification } from '@/api/pending';
import type { Schema } from '@/api/types';

import { mockDb } from './db';
import { currentUid, currentUser, errorResponse, notFound, unauthenticated, url } from './http';

// 설정·알림함·증빙서 확인의 목 API (USR-02~04, NTF-01~03, SUP-12)
const NO_CONTENT = 204;
const ACCEPTED = 202;
const VALID_CODE = 'MC-2026-0001';
const noContent = () => new HttpResponse(null, { status: NO_CONTENT });

type Notification = Schema<'NotificationResponse'>;

let notifications: Notification[] = [
  {
    id: 'n-3',
    type: 'report_ready',
    title: '상담 정리가 도착했어요',
    body: '지난 마음 코칭을 정리했어요.',
    link: '/c/reports/00000000-0000-7000-8000-00000000b002',
    created_at: new Date(Date.now() - 3_600_000).toISOString(),
  },
  {
    id: 'n-2',
    type: 'session_confirmed',
    title: '예약이 확정되었어요',
    body: '상담 시작 10분 전부터 입장할 수 있어요.',
    link: '/c/sessions',
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
  },
  {
    id: 'n-1',
    type: 'welcome',
    title: '마음 케어에 오신 것을 환영해요',
    created_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    read_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  },
];

export const accountHandlers = [
  http.patch(url('/me'), async ({ request }) => {
    const uid = currentUid(request);
    const me = currentUser(request);
    if (!uid || !me) return unauthenticated();
    const body = (await request.json()) as Schema<'NicknameUpdateRequest'>;
    const taken = [...mockDb.users.values()].some(
      (user) => user.id !== me.id && user.nickname === body.nickname,
    );
    if (taken) return errorResponse(409, 'NICKNAME_TAKEN', '이미 사용 중인 닉네임입니다');
    const updated = { ...me, nickname: body.nickname };
    mockDb.users.set(uid, updated);
    return HttpResponse.json(updated);
  }),

  http.delete(url('/me'), ({ request }) => {
    const uid = currentUid(request);
    const me = currentUser(request);
    if (!uid || !me) return unauthenticated();
    const active = mockDb.sessions.some(
      (session) =>
        (session.client_id === me.id || session.provider_id === me.id) &&
        (session.status === 'confirmed' || session.status === 'in_progress'),
    );
    if (active) {
      return errorResponse(409, 'ACTIVE_SESSIONS_EXIST', '예정되거나 진행 중인 상담이 있습니다');
    }
    mockDb.users.delete(uid);
    return new HttpResponse(null, { status: ACCEPTED });
  }),

  http.post(url('/me/device-tokens'), ({ request }) =>
    currentUser(request) ? noContent() : unauthenticated(),
  ),

  http.get(url('/notifications'), ({ request }) => {
    if (!currentUser(request)) return unauthenticated();
    const limit = Number(new URL(request.url).searchParams.get('limit')) || notifications.length;
    const page: Schema<'NotificationPageResponse'> = {
      items: notifications.slice(0, limit),
      unread_count: notifications.filter((item) => !item.read_at).length,
    };
    return HttpResponse.json(page);
  }),

  http.post(url('/notifications/read-all'), ({ request }) => {
    if (!currentUser(request)) return unauthenticated();
    const now = new Date().toISOString();
    notifications = notifications.map((item) => ({ ...item, read_at: item.read_at ?? now }));
    return noContent();
  }),

  http.post(url('/notifications/:notificationId/read'), ({ request, params }) => {
    if (!currentUser(request)) return unauthenticated();
    const now = new Date().toISOString();
    notifications = notifications.map((item) =>
      item.id === params.notificationId ? { ...item, read_at: item.read_at ?? now } : item,
    );
    return noContent();
  }),

  http.get(url('/certificates/verify/:code'), ({ params }) => {
    if (params.code !== VALID_CODE) return notFound();
    const certificate: CertificateVerification = {
      valid: true,
      issued_at: '2026-11-01T03:00:00Z',
      trainee_name_masked: '김*성',
      hours: 42,
      session_count: 84,
      supervision_count: 6,
    };
    return HttpResponse.json(certificate);
  }),
];
