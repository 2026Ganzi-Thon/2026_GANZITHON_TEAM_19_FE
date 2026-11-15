import { useQuery } from '@tanstack/react-query';

import { listNotifications } from '@/api/endpoints/notifications';
import { queryKeys } from '@/api/queryKeys';
import { useAuthStore } from '@/stores/authStore';

const STALE_MS = 60_000;

/** 읽지 않은 알림 수 (TRD A-05). 실시간 notification:new 가 오면 다시 받는다. */
export function useUnreadCount(): number {
  const ready = useAuthStore((state) => state.status === 'ready');
  const { data } = useQuery({
    queryKey: [...queryKeys.notifications, 'unread'],
    queryFn: () => listNotifications({ limit: 1 }),
    enabled: ready,
    staleTime: STALE_MS,
  });
  return data?.unread_count ?? 0;
}
