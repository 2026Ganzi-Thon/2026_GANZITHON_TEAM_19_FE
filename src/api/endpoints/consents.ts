import { api } from '@/api/client';
import type { Consent, ConsentCreateRequest } from '@/api/pending';

// shortcut: 서버가 전송 동의 약관 버전을 따로 주지 않아 고정 값을 보낸다. 버전이 생기면 그 값으로 바꾼다
export const TRANSFER_CONSENT_VERSION = '1.0';
// shortcut: 서버는 철회 사유를 꼭 받지만 TRD 화면에는 사유 입력이 없어 고정 값을 보낸다
const REVOKE_REASON = 'client_revoked';

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
  await api.post(`/consents/${consentId}/revoke`, { reason: REVOKE_REASON });
}
