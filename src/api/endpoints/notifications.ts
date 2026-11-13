import { api } from '@/api/client';
import type { Schema } from '@/api/types';

export type NotificationPage = Schema<'NotificationPageResponse'>;
export type NotificationItem = Schema<'NotificationResponse'>;

/** NTF-01 */
export async function listNotifications(params: {
  cursor?: string;
  limit?: number;
  unread_only?: boolean;
}): Promise<NotificationPage> {
  const { data } = await api.get<NotificationPage>('/notifications', { params });
  return data;
}

/** NTF-02 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  await api.post(`/notifications/${notificationId}/read`);
}

/** NTF-03 */
export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/read-all');
}
