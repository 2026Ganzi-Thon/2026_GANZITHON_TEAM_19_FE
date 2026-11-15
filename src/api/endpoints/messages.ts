import { api } from '@/api/client';
import type { Schema } from '@/api/types';

export type Message = Schema<'MessageResponse'>;

/** MSG-01. afterId 를 주면 그 뒤 메시지만 받는다 */
export async function listMessages(sessionId: string, afterId?: string): Promise<Message[]> {
  const { data } = await api.get<Message[]>(`/sessions/${sessionId}/messages`, {
    params: afterId ? { afterId } : undefined,
  });
  return data;
}
