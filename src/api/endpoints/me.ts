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

/** USR-04. 웹 푸시를 받을 기기 토큰을 등록한다 */
export async function registerDeviceToken(body: Schema<'DeviceTokenRequest'>): Promise<void> {
  await api.post('/me/device-tokens', body);
}

/** USR-03 (배포 전). 30일 뒤 영구 삭제된다. 예정·진행 중인 상담이 있으면 409 */
export async function withdraw(): Promise<void> {
  await api.delete('/me');
}
