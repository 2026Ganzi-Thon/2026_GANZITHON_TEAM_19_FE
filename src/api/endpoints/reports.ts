import { api } from '@/api/client';
import type { ClientReport, ClientSummary } from '@/api/pending';

/** 서버는 AI 요약을 JSON 글자로 주고, 시드 데이터는 평범한 문장을 준다. 문장이면 그대로 둔다 */
export function parseSummary(raw: ClientReport['client_summary']): ClientSummary | string | null {
  if (typeof raw !== 'string') return raw ?? null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed !== null && typeof parsed === 'object' ? (parsed as ClientSummary) : raw;
  } catch {
    return raw;
  }
}

/** RPT-01. 세션 리포트와 연계(종합) 리포트의 내담자용 요약 */
export async function getReport(reportId: string): Promise<ClientReport> {
  const { data } = await api.get<ClientReport>(`/me/reports/${reportId}`);
  return { ...data, client_summary: parseSummary(data.client_summary) };
}
