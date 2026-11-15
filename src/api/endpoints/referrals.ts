import { api } from '@/api/client';
import type { ReferralDetail } from '@/api/pending';

/** REF-01. 전문 상담 연계를 시작한다. 이미 권유된 연계가 있으면 그것이 돌아온다 */
export async function createReferral(sourceSessionId: string): Promise<ReferralDetail> {
  const { data } = await api.post<ReferralDetail>('/referrals', {
    source_session_id: sourceSessionId,
  });
  return data;
}

/** REF-02 */
export async function getReferral(referralId: string): Promise<ReferralDetail> {
  const { data } = await api.get<ReferralDetail>(`/referrals/${referralId}`);
  return data;
}

/** REF-03 */
export async function selectExpert(referralId: string, expertId: string): Promise<void> {
  await api.post(`/referrals/${referralId}/select-expert`, { expert_id: expertId });
}

/** REF-07. 포함할 상담을 바꾼다. 목록이 바뀌면 종합 리포트를 다시 만든다 */
export async function updateReferralSessions(
  referralId: string,
  sessionIds: readonly string[],
): Promise<void> {
  await api.put(`/referrals/${referralId}/sessions`, { session_ids: sessionIds });
}
