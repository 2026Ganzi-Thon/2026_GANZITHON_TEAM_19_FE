import { api, idempotencyHeader } from '@/api/client';
import type { PendingSessionFields, SessionCreateRequest } from '@/api/pending';
import type { ProviderSessionFields } from '@/api/pendingProvider';
import type { Schema } from '@/api/types';

// report·can_rebook 은 아직 배포 전이라 지금 서버 응답에는 없다 (api/pending.ts)
export type Session = Schema<'SessionResponse'> & PendingSessionFields & ProviderSessionFields;
export type SessionStatus = NonNullable<Session['status']>;

/** SES-01. 10분 홀드된 결제 대기 세션을 만든다. 같은 선택의 재시도에는 같은 멱등 키를 쓴다 */
export async function createSession(
  body: SessionCreateRequest,
  idempotencyKey: string,
): Promise<Session> {
  const { data } = await api.post<Session>('/sessions', body, {
    headers: idempotencyHeader(idempotencyKey),
  });
  return data;
}

/** SES-02 */
export async function listSessions(): Promise<Session[]> {
  const { data } = await api.get<Session[]>('/sessions');
  return data;
}

/** SES-03 */
export async function getSession(sessionId: string): Promise<Session> {
  const { data } = await api.get<Session>(`/sessions/${sessionId}`);
  return data;
}

/** SES-04 */
export async function cancelSession(
  sessionId: string,
  body: Schema<'SessionCancelRequest'>,
): Promise<void> {
  await api.post(`/sessions/${sessionId}/cancel`, body);
}

/** SES-05 */
export async function submitMood(
  sessionId: string,
  body: Schema<'MoodCheckRequest'>,
): Promise<void> {
  await api.post(`/sessions/${sessionId}/mood`, body);
}

/** SES-06 */
export async function endSession(
  sessionId: string,
  body: Schema<'SessionEndRequest'>,
): Promise<void> {
  await api.post(`/sessions/${sessionId}/end`, body);
}

/** SES-07 */
export async function reviewSession(
  sessionId: string,
  body: Schema<'SessionReviewRequest'>,
): Promise<void> {
  await api.post(`/sessions/${sessionId}/review`, body);
}

/** SES-08 */
export async function saveSessionNote(
  sessionId: string,
  body: Schema<'SessionNoteRequest'>,
): Promise<void> {
  await api.put(`/sessions/${sessionId}/note`, body);
}
