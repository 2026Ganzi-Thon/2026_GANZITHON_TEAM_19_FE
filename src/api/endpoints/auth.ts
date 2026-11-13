import { api } from '@/api/client';
import type { Schema } from '@/api/types';

export type RegisterRequest = Schema<'RegisterRequest'>;
export type Terms = Schema<'TermsResponse'>;

/** AUTH-01 */
export async function register(body: RegisterRequest): Promise<Schema<'MeResponse'>> {
  const { data } = await api.post<Schema<'MeResponse'>>('/auth/register', body);
  return data;
}

/** AUTH-02 */
export async function getTerms(): Promise<Terms[]> {
  const { data } = await api.get<Terms[]>('/public/terms');
  return data;
}
