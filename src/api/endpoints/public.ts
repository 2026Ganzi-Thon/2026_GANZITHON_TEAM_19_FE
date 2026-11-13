import { api } from '@/api/client';
import type { Schema } from '@/api/types';

export type CrisisContact = Schema<'CrisisContact'>;
export type AppConfig = Schema<'AppConfigResponse'>;

/** PUB-01 */
export async function getCrisisContacts(): Promise<CrisisContact[]> {
  const { data } = await api.get<CrisisContact[]>('/public/crisis-contacts');
  return data;
}

/** PUB-02 */
export async function getAppConfig(): Promise<AppConfig> {
  const { data } = await api.get<AppConfig>('/public/app-config');
  return data;
}
