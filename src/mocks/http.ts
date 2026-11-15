import { HttpResponse } from 'msw';

import type { Schema } from '@/api/types';
import { env } from '@/lib/env';

import { uidFromAuthorization } from './auth';
import { mockDb } from './db';

// 목 핸들러들이 같이 쓰는 도우미
export const url = (path: string) => `${env.apiBaseUrl}${path}`;

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details: Record<string, unknown> = {},
) {
  return HttpResponse.json(
    { error: { code, message, details, request_id: `req_mock_${crypto.randomUUID()}` } },
    { status },
  );
}

export const unauthenticated = () => errorResponse(401, 'UNAUTHENTICATED', '로그인이 필요합니다');
export const notFound = () => errorResponse(404, 'NOT_FOUND', '찾을 수 없습니다');

export function currentUid(request: Request): string | null {
  return uidFromAuthorization(request.headers.get('Authorization'));
}

export function currentUser(request: Request): Schema<'MeResponse'> | undefined {
  return mockDb.users.get(currentUid(request) ?? '');
}
