import { api } from '@/api/client';
import type { Schema } from '@/api/types';

export type ProviderPublic = Schema<'ProviderPublicResponse'>;
export type OpenSlot = Schema<'OpenSlotResponse'>;

/** USR-05 */
export async function getProvider(providerId: string): Promise<ProviderPublic> {
  const { data } = await api.get<ProviderPublic>(`/providers/${providerId}`);
  return data;
}

/** SLT-03 */
export async function listOpenSlots(
  providerId: string,
  params: { from: string; to: string },
): Promise<OpenSlot[]> {
  const { data } = await api.get<OpenSlot[]>(`/providers/${providerId}/slots`, { params });
  return data;
}
