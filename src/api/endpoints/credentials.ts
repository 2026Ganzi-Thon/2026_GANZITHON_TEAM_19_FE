import { api } from '@/api/client';
import type { Schema } from '@/api/types';

export type Credential = Schema<'CredentialResponse'>;
export type CredentialCreate = Schema<'CredentialCreateRequest'>;
export type UploadUrl = Schema<'UploadUrlResponse'>;

/** CRD-01. 증빙 파일을 올릴 주소를 받는다 (PDF·JPG·PNG, 10MB 이하) */
export async function requestUploadUrl(body: Schema<'UploadUrlRequest'>): Promise<UploadUrl> {
  const { data } = await api.post<UploadUrl>('/me/credentials/upload-url', body);
  return data;
}

/** CRD-02. verify 가 true 면 국가자격 진위 확인을 함께 한다 */
export async function createCredential(body: CredentialCreate): Promise<Credential> {
  const { data } = await api.post<Credential>('/me/credentials', body);
  return data;
}

/** CRD-03 */
export async function listCredentials(): Promise<Credential[]> {
  const { data } = await api.get<Credential[]>('/me/credentials');
  return data;
}

/** CRD-04. 심사를 요청한다 */
export async function submitCredentials(): Promise<Schema<'SubmitResponse'>> {
  const { data } = await api.post<Schema<'SubmitResponse'>>('/me/credentials/submit');
  return data;
}

/** CRD-05. AI 판독 결과가 틀렸을 때 고친다 */
export async function updateCredential(
  credentialId: string,
  body: Schema<'CredentialUpdateRequest'>,
): Promise<Credential> {
  const { data } = await api.patch<Credential>(`/me/credentials/${credentialId}`, body);
  return data;
}
