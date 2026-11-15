import { api } from '@/api/client';
import type { ComplaintCreateRequest } from '@/api/pending';

/** CMP-01. 세션 종료 후 7일 안에만 받는다. 같은 세션 중복은 409 */
export async function createComplaint(body: ComplaintCreateRequest): Promise<void> {
  await api.post('/complaints', body);
}
