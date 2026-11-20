import { api } from '@/api/client';
import type { ReferralDetail } from '@/api/pending';
import type { Schema } from '@/api/types';

/** REF-01. 전문 상담 연계를 시작한다 */
export async function createReferral(sourceSessionId: string): Promise<Schema<'ReferralResponse'>> {
  const { data } = await api.post<Schema<'ReferralResponse'>>('/referrals', {
    source_session_id: sourceSessionId,
  });
  return data;
}

/** REF-02 */
export async function getReferral(referralId: string): Promise<ReferralDetail> {
  const { data } = await api.get<ReferralDetail>(`/referrals/${referralId}`);
  // 서버 스키마에서는 모두 선택 값이라 빠져 와도 화면이 깨지지 않게 채운다
  return {
    ...data,
    candidates: data.candidates ?? [],
    eligible_sessions: data.eligible_sessions ?? [],
    included_session_ids: data.included_session_ids ?? [],
    report: data.report ?? null,
  };
}

/** REF-03 */
export async function selectExpert(referralId: string, expertId: string): Promise<void> {
  await api.put(`/referrals/${referralId}/expert`, { expert_id: expertId });
}

/** REF-07. 포함할 상담을 바꾼다. 목록이 바뀌면 종합 리포트를 다시 만든다 */
export async function updateReferralSessions(
  referralId: string,
  sessionIds: readonly string[],
): Promise<void> {
  await api.put(`/referrals/${referralId}/sessions`, { session_ids: sessionIds });
}
