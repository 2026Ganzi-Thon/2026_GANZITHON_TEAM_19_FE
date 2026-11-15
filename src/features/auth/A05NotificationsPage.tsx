import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '@/api/endpoints/notifications';
import { isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { safeNextPath } from '@/app/access';
import { Screen } from '@/app/layouts/Screen';
import { CrisisButton } from '@/components/crisis/CrisisButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { NOTIFICATIONS } from '@/copy/account';
import { EMPTY } from '@/copy/empty';
import { errorCopy } from '@/copy/errorMessages';
import { COMMON } from '@/copy/fixed';
import { formatKST } from '@/lib/date';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/stores/uiStore';

const PAGE_SIZE = 20;
const STALE_MS = 60_000;

/** A-05 알림함 */
export function A05NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.me?.role);
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications });

  const list = useInfiniteQuery({
    queryKey: [...queryKeys.notifications, 'list'],
    queryFn: ({ pageParam }) => listNotifications({ cursor: pageParam, limit: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    staleTime: STALE_MS,
  });

  const readAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => void refresh(),
    onError: (error) => {
      showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
    },
  });

  /** 읽음 처리한 뒤 알림이 가리키는 화면으로 간다. 앱 안의 경로만 연다 (TRD 11-3) */
  async function open(item: NotificationItem) {
    if (item.id && !item.read_at) {
      try {
        await markNotificationRead(item.id);
        void refresh();
      } catch {
        // 읽음 처리가 실패해도 화면 이동은 막지 않는다
      }
    }
    const path = safeNextPath(item.link);
    if (path) navigate(path);
  }

  const items = list.data?.pages.flatMap((page) => page.items ?? []) ?? [];
  // 긴급 도움은 내담자 화면에만 둔다
  const crisis = role === 'client' ? <CrisisButton /> : undefined;
  const unreadCount = list.data?.pages[0]?.unread_count ?? 0;

  return (
    <Screen>
      <ScreenHeader hideBack right={crisis} />
      <div className="flex items-end justify-between gap-3 pt-6.5">
        <h1 className="text-title-sm font-bold text-fg">{NOTIFICATIONS.title}</h1>
        <button
          type="button"
          disabled={unreadCount === 0 || readAll.isPending}
          onClick={() => readAll.mutate()}
          className="min-h-(--size-touch) text-caption font-bold text-fg underline disabled:text-fg-muted disabled:no-underline"
        >
          {NOTIFICATIONS.readAll}
        </button>
      </div>

      {list.isPending && <Skeleton lines={5} className="pt-6" />}
      {list.isError && (
        <ErrorState
          title={COMMON.serverErrorTitle}
          description={errorCopy(isApiError(list.error) ? list.error.code : '').message}
          requestId={isApiError(list.error) ? list.error.requestId : undefined}
          onRetry={() => void list.refetch()}
        />
      )}
      {list.data && items.length === 0 && <EmptyState title={EMPTY.notifications.title} />}

      <ul className="pt-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => void open(item)}
              className="flex w-full items-start gap-3 border-b border-line py-4 text-left"
            >
              <span
                aria-hidden="true"
                className={
                  item.read_at
                    ? 'mt-1.5 size-2 shrink-0'
                    : 'mt-1.5 size-2 shrink-0 rounded-full bg-danger'
                }
              />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-body-sm font-bold text-fg">
                  {item.title}
                  {!item.read_at && <span className="sr-only"> ({NOTIFICATIONS.unread})</span>}
                </span>
                {item.body && <span className="text-body-sm text-fg-muted">{item.body}</span>}
                {item.created_at && (
                  <span className="text-micro text-fg-muted">{formatKST(item.created_at)}</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {list.hasNextPage && (
        <Button
          block
          size="md"
          variant="secondary"
          className="mb-6 mt-4"
          loading={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          {NOTIFICATIONS.more}
        </Button>
      )}
    </Screen>
  );
}
