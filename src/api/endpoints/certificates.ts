import { api } from '@/api/client';
import type { CertificateVerification } from '@/api/pending';

/** SUP-12. 로그인 없이 증빙서가 진짜인지 확인한다 */
export async function verifyCertificate(code: string): Promise<CertificateVerification> {
  const { data } = await api.get<CertificateVerification>(
    `/certificates/verify/${encodeURIComponent(code)}`,
  );
  return data;
}
