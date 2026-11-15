import { http, HttpResponse } from 'msw';

import type { Schema } from '@/api/types';

import { accountHandlers } from './accountHandlers';
import { appConfig } from './adminDb';
import { adminHandlers } from './adminHandlers';
import { clientHandlers } from './clientHandlers';
import { mockDb } from './db';
import { currentUid, errorResponse, notFound, unauthenticated, url } from './http';
import { providerHandlers } from './providerHandlers';
import { reportHandlers } from './reportHandlers';
import { workHandlers } from './workHandlers';

// 목 응답도 schema.d.ts 타입으로 써서 계약이 어긋나면 타입 오류가 나게 한다 (TRD 7-5, 10-2)
const terms: Schema<'TermsResponse'>[] = [
  {
    type: 'terms',
    version: '1.0',
    title: '이용약관',
    body_md: '시연용 이용약관 초안입니다.',
    required: true,
  },
  {
    type: 'privacy',
    version: '1.0',
    title: '개인정보 수집·이용 동의',
    body_md: '시연용 초안입니다.',
    required: true,
  },
  {
    type: 'sensitive',
    version: '1.0',
    title: '민감정보(정신건강 정보) 처리 동의',
    body_md: '시연용 초안입니다.',
    required: true,
  },
  {
    type: 'age14',
    version: '1.0',
    title: '만 14세 이상 확인',
    body_md: '시연용 초안입니다.',
    required: true,
  },
  {
    type: 'training_data',
    version: '1.0',
    title: '수련 목적 비식별 활용 동의',
    body_md: '시연용 초안입니다.',
    required: false,
  },
  {
    type: 'marketing',
    version: '1.0',
    title: '마케팅 정보 수신 동의',
    body_md: '시연용 초안입니다.',
    required: false,
  },
];

const crisisContacts: Schema<'CrisisContact'>[] = [
  { name: '자살예방상담', number: '109', description: '24시간 자살 위기 상담' },
  { name: '정신건강위기상담', number: '1577-0199', description: '24시간 정신건강 위기 상담' },
  { name: '경찰', number: '112', description: '긴급 신고' },
  { name: '구급', number: '119', description: '응급 구조' },
];

export const handlers = [
  http.get(url('/public/app-config'), () => HttpResponse.json(appConfig)),
  http.get(url('/public/crisis-contacts'), () => HttpResponse.json(crisisContacts)),
  http.get(url('/public/terms'), () => HttpResponse.json(terms)),

  http.get(url('/me'), ({ request }) => {
    const uid = currentUid(request);
    if (!uid) return unauthenticated();
    const me = mockDb.users.get(uid);
    if (!me) return errorResponse(404, 'USER_NOT_REGISTERED', '가입을 먼저 완료해 주세요');
    return HttpResponse.json(me);
  }),

  http.post(url('/auth/register'), async ({ request }) => {
    const uid = currentUid(request);
    if (!uid) return unauthenticated();
    if (mockDb.users.has(uid))
      return errorResponse(409, 'ALREADY_REGISTERED', '이미 가입된 계정입니다');
    const body = (await request.json()) as Schema<'RegisterRequest'>;
    const taken = [...mockDb.users.values()].some((user) => user.nickname === body.nickname);
    if (taken) return errorResponse(409, 'NICKNAME_TAKEN', '이미 사용 중인 닉네임입니다');
    const me: Schema<'MeResponse'> = {
      id: crypto.randomUUID(),
      role: body.role,
      status: body.role === 'client' ? 'active' : 'pending_review',
      nickname: body.nickname,
    };
    mockDb.users.set(uid, me);
    return HttpResponse.json(me, { status: 201 });
  }),

  http.get(url('/providers/:providerId'), ({ params }) => {
    const provider = mockDb.providers.find((item) => item.provider_id === params.providerId);
    return provider ? HttpResponse.json(provider) : notFound();
  }),

  http.post(url('/events'), () => new HttpResponse(null, { status: 204 })),

  ...accountHandlers,
  ...adminHandlers,
  ...clientHandlers,
  ...providerHandlers,
  ...reportHandlers,
  ...workHandlers,
];
