import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  type AdminUser,
  changeUserStatus,
  listUsers,
  revokeUserTokens,
} from '@/api/endpoints/admin';
import { isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import type { AccountStatus } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { type Column, DataTable } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextField } from '@/components/ui/TextField';
import { ADMIN, ADMIN_USERS } from '@/copy/admin';
import { errorCopy } from '@/copy/errorMessages';
import { COMMON } from '@/copy/fixed';
import { formatKST, kstToUtcIso } from '@/lib/date';
import { showToast } from '@/stores/uiStore';

import { FilterSelect, optionsOf, useUrlFilters } from './filters';

const STALE_MS = 15_000;
const PAGE_SIZE = '30';
const FILTERS = ['q', 'role', 'status'] as const;
const TIMED_STATUSES: readonly string[] = ['suspended', 'restricted'];

function toastError(error: unknown): void {
  showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
}

interface UserDrawerProps {
  user: AdminUser;
  onDone: () => void;
}

/** 드로어: 상태 변경과 강제 로그아웃. 둘 다 사유가 필요하다 (ADM-05) */
function UserActions({ user, onDone }: UserDrawerProps) {
  const [status, setStatus] = useState<string>(user.status ?? 'active');
  const [until, setUntil] = useState('');
  const [reason, setReason] = useState('');
  const hasReason = reason.trim().length > 0;

  const change = useMutation({
    mutationFn: () =>
      changeUserStatus(user.id ?? '', {
        status: status as AccountStatus,
        reason: reason.trim(),
        until: TIMED_STATUSES.includes(status) && until ? kstToUtcIso(until) : undefined,
      }),
    onSuccess: () => {
      showToast(ADMIN_USERS.changed, 'success');
      onDone();
    },
    onError: toastError,
  });
  const logout = useMutation({
    mutationFn: () => revokeUserTokens(user.id ?? '', reason.trim()),
    onSuccess: () => {
      showToast(ADMIN_USERS.loggedOut, 'success');
      onDone();
    },
    onError: toastError,
  });

  return (
    <div className="flex flex-col gap-4 text-body-sm">
      <p className="font-bold text-fg">
        {[user.display_name ?? user.nickname, user.role && ADMIN.role[user.role]]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <p className="text-micro text-fg-muted">{ADMIN_USERS.privacyNotice}</p>
      <FilterSelect
        id="user-status"
        label={ADMIN_USERS.newStatus}
        value={status}
        options={optionsOf(ADMIN.status)}
        onChange={setStatus}
        withAll={false}
      />
      {TIMED_STATUSES.includes(status) && (
        <TextField
          label={ADMIN_USERS.until}
          type="date"
          value={until}
          onChange={(event) => setUntil(event.target.value)}
        />
      )}
      <TextField
        label={ADMIN.reason}
        hint={ADMIN.reasonRequired}
        maxLength={500}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <div className="flex gap-2">
        <Button
          size="md"
          disabled={!hasReason || status === user.status}
          loading={change.isPending}
          onClick={() => change.mutate()}
        >
          {ADMIN_USERS.change}
        </Button>
        <Button
          size="md"
          variant="danger"
          disabled={!hasReason}
          loading={logout.isPending}
          onClick={() => logout.mutate()}
        >
          {ADMIN_USERS.forceLogout}
        </Button>
      </div>
    </div>
  );
}

/** M-08 사용자 관리 (ADM-04, ADM-05) */
export function M08UsersPage() {
  const queryClient = useQueryClient();
  const [filters, setFilter] = useUrlFilters(FILTERS);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const users = useInfiniteQuery({
    queryKey: queryKeys.admin('users', filters),
    queryFn: ({ pageParam }) => listUsers({ ...filters, cursor: pageParam, limit: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    staleTime: STALE_MS,
  });
  const rows = users.data?.pages.flatMap((page) => page.items ?? []) ?? [];

  const columns: Column<AdminUser>[] = [
    {
      key: 'joined',
      header: ADMIN_USERS.joinedAt,
      render: (row) => (row.created_at ? formatKST(row.created_at, 'YYYY년 M월 D일') : ''),
    },
    { key: 'nickname', header: ADMIN_USERS.nickname, render: (row) => row.nickname },
    { key: 'display', header: ADMIN_USERS.displayName, render: (row) => row.display_name },
    {
      key: 'role',
      header: ADMIN_USERS.filterRole,
      render: (row) => (row.role ? ADMIN.role[row.role] : ''),
    },
    {
      key: 'status',
      header: ADMIN_USERS.filterStatus,
      render: (row) => (row.status ? ADMIN.status[row.status] : ''),
    },
  ];

  return (
    <>
      <h1 className="text-title-sm font-bold text-fg">{ADMIN_USERS.title}</h1>
      <div className="flex flex-wrap items-end gap-4 py-6">
        <TextField
          label={ADMIN_USERS.search}
          type="search"
          value={filters.q}
          onChange={(event) => setFilter('q', event.target.value)}
        />
        <FilterSelect
          id="filter-user-role"
          label={ADMIN_USERS.filterRole}
          value={filters.role}
          options={optionsOf(ADMIN.role)}
          onChange={(value) => setFilter('role', value)}
        />
        <FilterSelect
          id="filter-user-status"
          label={ADMIN_USERS.filterStatus}
          value={filters.status}
          options={optionsOf(ADMIN.status)}
          onChange={(value) => setFilter('status', value)}
        />
      </div>
      {users.isPending && <Skeleton lines={6} />}
      {users.isError && (
        <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void users.refetch()} />
      )}
      {users.data && (
        <DataTable
          caption={ADMIN_USERS.title}
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id ?? ''}
          onRowOpen={setSelected}
          hasMore={users.hasNextPage}
          loadingMore={users.isFetchingNextPage}
          onLoadMore={() => void users.fetchNextPage()}
        />
      )}

      <Drawer
        open={selected !== null}
        title={ADMIN_USERS.drawerTitle}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <UserActions
            key={selected.id}
            user={selected}
            onDone={() => {
              setSelected(null);
              void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            }}
          />
        )}
      </Drawer>
    </>
  );
}
