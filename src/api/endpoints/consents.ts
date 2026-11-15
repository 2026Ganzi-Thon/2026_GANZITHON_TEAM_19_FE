import { api } from '@/api/client';
import type { Consent, ConsentCreateRequest } from '@/api/pending';

/** CNS-01 */
export async function listConsents(): Promise<Consent[]> {
  const { data } = await api.get<Consent[]>('/me/consents');
  return data;
}

/** CNS-02 */
export async function grantConsent(body: ConsentCreateRequest): Promise<void> {
  await api.post('/consents', body);
}

/** CNS-03. 철회하면 전문가의 열람이 바로 막힌다 */
export async function revokeConsent(consentId: string): Promise<void> {
  await api.post(`/consents/${consentId}/revoke`, {});
}
