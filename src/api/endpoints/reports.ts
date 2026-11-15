import { api } from '@/api/client';
import type { ClientReport } from '@/api/pending';

/** RPT-01. 세션 리포트와 연계(종합) 리포트의 내담자용 요약 */
export async function getReport(reportId: string): Promise<ClientReport> {
  const { data } = await api.get<ClientReport>(`/me/reports/${reportId}`);
  return data;
}
