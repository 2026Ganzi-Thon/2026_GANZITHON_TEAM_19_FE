import { api } from '@/api/client';
import type { Schema } from '@/api/types';

export type Me = Schema<'MeResponse'>;

/** USR-01 */
export async function getMe(): Promise<Me> {
  const { data } = await api.get<Me>('/me');
  return data;
}

/** USR-02 */
export async function updateNickname(body: Schema<'NicknameUpdateRequest'>): Promise<Me> {
  const { data } = await api.patch<Me>('/me', body);
  return data;
}

/** USR-07 */
export async function completeEthicsTraining(): Promise<void> {
  await api.post('/me/ethics-training/complete');
}
