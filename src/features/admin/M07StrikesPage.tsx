import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router';

import {
  liftSanction,
  listClientSanctions,
  listStrikes,
  revokeStrike,
} from '@/api/endpoints/admin';
import type { AdminStrikeRow, ClientSanctionRow } from '@/api/pendingAdmin';
import { queryKeys } from '@/api/queryKeys';
import { NotFoundPage } from '@/app/ErrorPages';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { type Column, DataTable } from '@/components/ui/DataTable';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ADMIN_COMPLAINTS, ADMIN_STRIKES } from '@/copy/adminOps';
import { COMMON } from '@/copy/fixed';
import { useFeatureFlag } from '@/hooks/useAppConfig';
import { formatKST } from '@/lib/date';
import { showToast } from '@/stores/uiStore';

import { ReasonModal } from './ReasonModal';
import { toastApiError } from './toastError';

const STALE_MS = 15_000;
const TAB_PARAM = 'tab';
const DATE_FORMAT = 'M월 D일';
const TABS = ['trainees', 'clients'] as const;

type Tab = (typeof TABS)[number];
/** 사유를 받아 처리할 대상: 취소할 스트라이크 또는 해제할 제재 */
type Target = { kind: 'strike'; id: string } | { kind: 'sanction'; id: string };

function actionLabel(row: AdminStrikeRow): string {
  const label = ADMIN_STRIKES.actions[row.action];
  return row.until ? `${label} ${ADMIN_STRIKES.until(formatKST(row.until, DATE_FORMAT))}` : label;
}

function StrikeBoard() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: Tab = searchParams.get(TAB_PARAM) === 'clients' ? 'clients' : 'trainees';
  const [target, setTarget] = useState<Target | null>(null);
  const strikes = useQuery({
    queryKey: queryKeys.admin('strikes', {}),
    queryFn: listStrikes,
    enabled: tab === 'trainees',
    staleTime: STALE_MS,
  });
  const sanctions = useQuery({
    queryKey: queryKeys.admin('sanctions', {}),
    queryFn: listClientSanctions,
    enabled: tab === 'clients',
    staleTime: STALE_MS,
  });
  const active = tab === 'trainees' ? strikes : sanctions;

  const act = useMutation({
    mutationFn: ({ item, reason }: { item: Target; reason: string }) =>
      item.kind === 'strike' ? revokeStrike(item.id, reason) : liftSanction(item.id, reason),
    onSuccess: (_result, { item }) => {
      const strike = item.kind === 'strike';
      showToast(strike ? ADMIN_STRIKES.revokeDone : ADMIN_STRIKES.liftDone, 'success');
      setTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', strike ? 'strikes' : 'sanctions'] });
    },
    onError: toastApiError,
  });

  const traineeColumns: Column<AdminStrikeRow>[] = [
    {
      key: 'trainee',
      header: ADMIN_STRIKES.trainee,
      render: (row) => row.trainee_display,
      sortValue: (row) => row.trainee_display,
    },
    {
      key: 'count',
      header: ADMIN_STRIKES.count,
      render: (row) => ADMIN_STRIKES.countValue(row.count),
      sortValue: (row) => row.count,
    },
    { key: 'action', header: ADMIN_STRIKES.action, render: actionLabel },
    {
      key: 'training',
      header: ADMIN_STRIKES.training,
      render: (row) =>
        row.ethics_training_done ? ADMIN_STRIKES.trainingDone : ADMIN_STRIKES.trainingPending,
    },
    {
      key: 'history',
      header: ADMIN_STRIKES.manage,
      render: (row) => (
        <details>
          <summary className="min-h-(--size-touch) cursor-pointer font-bold underline">
            {ADMIN_STRIKES.history(row.items.length)}
          </summary>
          <ul className="flex flex-col gap-2 pt-2">
            {row.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <span>
                  {formatKST(item.created_at, DATE_FORMAT)} ·{' '}
                  {ADMIN_COMPLAINTS.category[item.category]}
                </span>
                {item.revoked_at ? (
                  <span className="text-fg-muted">{ADMIN_STRIKES.revoked}</span>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setTarget({ kind: 'strike', id: item.id })}
                  >
                    {ADMIN_STRIKES.revoke}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </details>
      ),
    },
  ];

  const clientColumns: Column<ClientSanctionRow>[] = [
    { key: 'nickname', header: ADMIN_STRIKES.nickname, render: (row) => row.nickname },
    {
      key: 'type',
      header: ADMIN_STRIKES.sanctionType,
      render: (row) => ADMIN_STRIKES.sanctionTypes[row.type],
    },
    {
      key: 'period',
      header: ADMIN_STRIKES.period,
      render: (row) =>
        row.until ? ADMIN_STRIKES.until(formatKST(row.until, DATE_FORMAT)) : ADMIN_STRIKES.noPeriod,
    },
    {
      key: 'lift',
      header: ADMIN_STRIKES.manage,
      render: (row) =>
        row.lifted_at ? (
          <span className="text-fg-muted">{ADMIN_STRIKES.lifted}</span>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setTarget({ kind: 'sanction', id: row.id })}
          >
            {ADMIN_STRIKES.lift}
          </Button>
        ),
    },
  ];

  return (
    <>
      <h1 className="text-title-sm font-bold text-fg">{ADMIN_STRIKES.title}</h1>
      <div role="group" aria-label={ADMIN_STRIKES.title} className="flex gap-1.5 py-6">
        {TABS.map((option) => (
          <Chip
            key={option}
            selected={tab === option}
            onClick={() => setSearchParams({ [TAB_PARAM]: option }, { replace: true })}
          >
            {ADMIN_STRIKES.tabs[option]}
          </Chip>
        ))}
      </div>
      {active.isPending && <Skeleton lines={5} />}
      {active.isError && (
        <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void active.refetch()} />
      )}
      {tab === 'trainees' && strikes.data && (
        <DataTable
          caption={ADMIN_STRIKES.tabs.trainees}
          columns={traineeColumns}
          rows={strikes.data}
          rowKey={(row) => row.trainee_id}
        />
      )}
      {tab === 'clients' && sanctions.data && (
        <DataTable
          caption={ADMIN_STRIKES.tabs.clients}
          columns={clientColumns}
          rows={sanctions.data}
          rowKey={(row) => row.id}
        />
      )}

      <ReasonModal
        // 대상이 바뀌면 사유 입력란을 비운다
        key={target?.id ?? 'none'}
        open={target !== null}
        title={target?.kind === 'sanction' ? ADMIN_STRIKES.liftTitle : ADMIN_STRIKES.revokeTitle}
        body={target?.kind === 'sanction' ? undefined : ADMIN_STRIKES.revokeBody}
        confirmLabel={target?.kind === 'sanction' ? ADMIN_STRIKES.lift : ADMIN_STRIKES.revoke}
        loading={act.isPending}
        onConfirm={(reason) => target && act.mutate({ item: target, reason })}
        onClose={() => setTarget(null)}
      />
    </>
  );
}

/** M-07 스트라이크·제재 관리 (CMP-05, CMP-06). P1 기능이라 플래그가 꺼져 있으면 없는 화면이다 */
export function M07StrikesPage() {
  return useFeatureFlag('p1_complaints') ? <StrikeBoard /> : <NotFoundPage />;
}
