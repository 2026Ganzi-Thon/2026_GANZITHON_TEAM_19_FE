import { api } from '@/api/client';
import type {
  ExpertReferralItem,
  ExpertReport,
  ReferralDeclineReason,
  ReferralSuggestionRequest,
  SessionHistoryItem,
} from '@/api/pendingProvider';

/** REF-05. 나에게 온 연계 요청 */
export async function listExpertReferrals(): Promise<ExpertReferralItem[]> {
  const { data } = await api.get<ExpertReferralItem[]>('/expert/referrals');
  return data;
}

/** REF-06. 거절에는 사유가 필요하다 */
export async function respondReferral(
  referralId: string,
  body: { action: 'accept' } | { action: 'decline'; reason: ReferralDeclineReason },
): Promise<void> {
  await api.post(`/expert/referrals/${referralId}/respond`, body);
}

/** RPT-02. 유효한 전달 동의가 없으면 403 (NO_CONSENT, CONSENT_REVOKED) */
export async function getExpertReport(reportId: string): Promise<ExpertReport> {
  const { data } = await api.get<ExpertReport>(`/expert/reports/${reportId}`);
  return data;
}

/** SES-09. 같은 내담자와 내가 진행한 이전 회기 */
export async function getSessionHistory(sessionId: string): Promise<SessionHistoryItem[]> {
  const { data } = await api.get<SessionHistoryItem[]>(`/sessions/${sessionId}/history`);
  return data;
}

/** REF-04. 수련생이 전문 상담을 권유한다 */
export async function suggestReferral(
  sessionId: string,
  body: ReferralSuggestionRequest,
): Promise<void> {
  await api.post(`/sessions/${sessionId}/referral-suggestion`, body);
}

/** RSK-04. 상담사가 위기 경고를 확인했다고 기록한다 */
export async function acknowledgeRisk(riskEventId: string): Promise<void> {
  await api.post(`/risk-events/${riskEventId}/ack`);
}

/** RSK-04. 당직 전문가를 호출한다 */
export async function callOncall(riskEventId: string): Promise<void> {
  await api.post(`/risk-events/${riskEventId}/call-oncall`);
}
