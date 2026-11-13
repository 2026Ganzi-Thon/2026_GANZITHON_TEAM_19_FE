import { api } from '@/api/client';
import type { Schema } from '@/api/types';

export type Session = Schema<'SessionResponse'>;
export type SessionStatus = NonNullable<Session['status']>;

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
