import { api } from '@/api/client';
import type { Schema } from '@/api/types';

export type Settlement = Schema<'SettlementResponse'>;
export type SettlementSummary = Schema<'SettlementSummaryResponse'>;

/** STL-01. month 는 YYYY-MM */
export async function getMySettlements(month: string): Promise<SettlementSummary> {
  const { data } = await api.get<SettlementSummary>('/me/settlements', { params: { month } });
  return data;
}
