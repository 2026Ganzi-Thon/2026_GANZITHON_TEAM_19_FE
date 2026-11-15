import { api } from '@/api/client';
import type {
  AdminComplaint,
  AdminComplaintDetail,
  AdminStrikeRow,
  ClientSanctionRow,
  ComplaintDecision,
  Kpi,
  RiskEvent,
} from '@/api/pendingAdmin';
import type { Schema } from '@/api/types';

export type CredentialQueuePage = Schema<'PageResponseCredentialReviewItem'>;
export type CredentialReview = Schema<'CredentialReviewDetail'>;
export type AdminUser = Schema<'AdminUserRow'>;
export type AdminUserPage = Schema<'PageResponseAdminUserRow'>;
export type Setting = Schema<'SettingResponse'>;
export type AdminSettlementPage = Schema<'PageResponseSettlementResponse'>;

type Query = Record<string, string | undefined>;

/** 빈 값은 보내지 않는다 */
function clean(params: Query): Query {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value));
}

/** ADM-01 */
export async function listCredentialQueue(params: Query): Promise<CredentialQueuePage> {
  const { data } = await api.get<CredentialQueuePage>('/admin/credentials', {
    params: clean(params),
  });
  return data;
}

/** ADM-02. 실명과 서류를 본다. 열람은 서버 감사 로그에 남는다 */
export async function getCredentialReview(userId: string): Promise<CredentialReview> {
  const { data } = await api.get<CredentialReview>(`/admin/credentials/${userId}`);
  return data;
}

/** ADM-03. 반려에는 사유가 필요하다 */
export async function decideCredential(
  userId: string,
  body: Schema<'CredentialDecisionRequest'>,
): Promise<void> {
  await api.post(`/admin/credentials/${userId}/decision`, body);
}

/** ADM-04 */
export async function listUsers(params: Query): Promise<AdminUserPage> {
  const { data } = await api.get<AdminUserPage>('/admin/users', { params: clean(params) });
  return data;
}

/** ADM-05 상태 변경 */
export async function changeUserStatus(
  userId: string,
  body: Schema<'AdminUserStatusRequest'>,
): Promise<void> {
  await api.patch(`/admin/users/${userId}`, body);
}

/** ADM-05 강제 로그아웃 (토큰 폐기) */
export async function revokeUserTokens(userId: string, reason: string): Promise<void> {
  await api.post(`/admin/users/${userId}/revoke-tokens`, { reason });
}

/** ADM-06 */
export async function listSettings(): Promise<Setting[]> {
  const { data } = await api.get<Schema<'PageResponseSettingResponse'>>('/admin/settings');
  return data.items ?? [];
}

/** ADM-07. 값은 키마다 모양이 다른 JSON 이다 */
export async function updateSetting(key: string, value: unknown, reason: string): Promise<void> {
  await api.put(`/admin/settings/${encodeURIComponent(key)}`, { value, reason });
}

/** STL-02 */
export async function listAdminSettlements(params: Query): Promise<AdminSettlementPage> {
  const { data } = await api.get<AdminSettlementPage>('/admin/settlements', {
    params: clean(params),
  });
  return data;
}

/** STL-02 CSV 내보내기 */
export async function exportAdminSettlements(params: Query): Promise<Blob> {
  const { data } = await api.get<Blob>('/admin/settlements', {
    params: clean(params),
    headers: { Accept: 'text/csv' },
    responseType: 'blob',
  });
  return data;
}

/** STL-03. 지급 예정 건만 지급 완료로 바뀐다 */
export async function paySettlements(ids: string[]): Promise<Schema<'SettlementPayResponse'>> {
  const { data } = await api.post<Schema<'SettlementPayResponse'>>('/admin/settlements/pay', {
    ids,
  });
  return data;
}

/** KPI-01 (배포 전) */
export async function getKpi(params: { from: string; to: string }): Promise<Kpi> {
  const { data } = await api.get<Kpi>('/admin/kpi', { params });
  return data;
}

/** RSK-01 (배포 전) */
export async function listRiskEvents(params: Query): Promise<RiskEvent[]> {
  const { data } = await api.get<RiskEvent[]>('/admin/risk-events', { params: clean(params) });
  return data;
}

/** RSK-02 (배포 전) */
export async function ackRiskEvent(id: string): Promise<void> {
  await api.post(`/admin/risk-events/${id}/ack`);
}

/** RSK-03 (배포 전). 당직 전문가에게 넘긴다 */
export async function escalateRiskEvent(id: string, expertId: string): Promise<void> {
  await api.post(`/admin/risk-events/${id}/escalate`, { expert_id: expertId });
}

/** RSK-03 (배포 전). 종결에는 조치 메모가 필요하다 */
export async function resolveRiskEvent(
  id: string,
  body: { note: string; false_positive: boolean },
): Promise<void> {
  await api.post(`/admin/risk-events/${id}/resolve`, body);
}

/** CMP-02 (배포 전) */
export async function listComplaints(params: Query): Promise<AdminComplaint[]> {
  const { data } = await api.get<AdminComplaint[]>('/admin/complaints', { params: clean(params) });
  return data;
}

/** CMP-03 (배포 전) */
export async function getComplaint(id: string): Promise<AdminComplaintDetail> {
  const { data } = await api.get<AdminComplaintDetail>(`/admin/complaints/${id}`);
  return data;
}

/** CMP-04 (배포 전) */
export async function decideComplaint(
  id: string,
  body: { decision: ComplaintDecision; reason: string },
): Promise<void> {
  await api.post(`/admin/complaints/${id}/decision`, body);
}

/** CMP-05 (배포 전) */
export async function listStrikes(): Promise<AdminStrikeRow[]> {
  const { data } = await api.get<AdminStrikeRow[]>('/admin/strikes');
  return data;
}

/** CMP-05 (배포 전) */
export async function listClientSanctions(): Promise<ClientSanctionRow[]> {
  const { data } = await api.get<ClientSanctionRow[]>('/admin/client-sanctions');
  return data;
}

/** CMP-06 (배포 전). 취소하면 조치를 다시 계산한다 */
export async function revokeStrike(strikeId: string, reason: string): Promise<void> {
  await api.post(`/admin/strikes/${strikeId}/revoke`, { reason });
}

/** CMP-06 (배포 전) */
export async function liftSanction(sanctionId: string, reason: string): Promise<void> {
  await api.post(`/admin/client-sanctions/${sanctionId}/lift`, { reason });
}
