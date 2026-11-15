import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  exportAdminSettlements,
  listAdminSettlements,
  listUsers,
  paySettlements,
} from '@/api/endpoints/admin';
import { queryKeys } from '@/api/queryKeys';
import type { Schema } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { type Column, DataTable } from '@/components/ui/DataTable';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextField } from '@/components/ui/TextField';
import { ADMIN_SETTLEMENTS } from '@/copy/adminOps';
import { MATCHES } from '@/copy/client';
import { COMMON } from '@/copy/fixed';
import { SETTLEMENTS } from '@/copy/work';
import { toKST } from '@/lib/date';
import { saveBlob } from '@/lib/download';
import { showToast } from '@/stores/uiStore';

import { FilterSelect, optionsOf, useUrlFilters } from './filters';
import { toastApiError } from './toastError';

type Settlement = Schema<'SettlementResponse'>;

const STALE_MS = 15_000;
const NAME_STALE_MS = 5 * 60_000;
const FILTERS = ['month', 'status', 'kind'] as const;
const NAME_LOOKUP = { limit: '100' };
const SHORT_ID_LENGTH = 8;

/** M-09 정산 관리 (STL-02, STL-03). 지급 예정 건만 골라 모의 지급한다 */
export function M09SettlementsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilter] = useUrlFilters(FILTERS);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const thisMonth = toKST(Date.now()).format('YYYY-MM');
  const params = { month: filters.month || thisMonth, status: filters.status, kind: filters.kind };

  const settlements = useQuery({
    queryKey: queryKeys.admin('settlements', params),
    queryFn: () => listAdminSettlements(params),
    staleTime: STALE_MS,
  });
  // 정산 응답에는 공급자 ID 만 있어서 활동명은 사용자 목록에서 찾는다
  const users = useQuery({
    queryKey: queryKeys.admin('users', NAME_LOOKUP),
    queryFn: () => listUsers(NAME_LOOKUP),
    staleTime: NAME_STALE_MS,
  });
  const names = new Map(
    (users.data?.items ?? []).map((user) => [user.id ?? '', user.display_name ?? user.nickname]),
  );
  const providerName = (row: Settlement) =>
    names.get(row.provider_id ?? '') ?? (row.provider_id ?? '').slice(0, SHORT_ID_LENGTH);

  const rows = settlements.data?.items ?? [];
  const payable = rows.filter((row) => row.status === 'pending' && selected.has(row.id ?? ''));
  const payableNet = MATCHES.price(payable.reduce((sum, row) => sum + (row.net ?? 0), 0));

  const pay = useMutation({
    mutationFn: () => paySettlements(payable.map((row) => row.id ?? '')),
    onSuccess: (result) => {
      showToast(
        ADMIN_SETTLEMENTS.paid(result.paid_count ?? 0, MATCHES.price(result.paid_net ?? 0)),
        'success',
      );
      setSelected(new Set());
      setConfirming(false);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'settlements'] });
    },
    onError: (error) => {
      toastApiError(error);
      setConfirming(false);
    },
  });
  const exportCsv = useMutation({
    mutationFn: () => exportAdminSettlements(params),
    onSuccess: (blob) => saveBlob(blob, ADMIN_SETTLEMENTS.csvName(params.month)),
    onError: toastApiError,
  });

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const columns: Column<Settlement>[] = [
    {
      key: 'select',
      header: ADMIN_SETTLEMENTS.select,
      render: (row) => (
        <Checkbox
          checked={selected.has(row.id ?? '')}
          disabled={row.status !== 'pending'}
          onChange={() => toggle(row.id ?? '')}
          label={<span className="sr-only">{ADMIN_SETTLEMENTS.selectRow(providerName(row))}</span>}
        />
      ),
    },
    {
      key: 'provider',
      header: ADMIN_SETTLEMENTS.provider,
      render: providerName,
      sortValue: providerName,
    },
    {
      key: 'kind',
      header: ADMIN_SETTLEMENTS.kind,
      render: (row) => (row.kind ? SETTLEMENTS.kind[row.kind] : ''),
    },
    {
      key: 'gross',
      header: ADMIN_SETTLEMENTS.gross,
      render: (row) => MATCHES.price(row.gross ?? 0),
      sortValue: (row) => row.gross ?? 0,
    },
    { key: 'fee', header: ADMIN_SETTLEMENTS.fee, render: (row) => MATCHES.price(row.fee ?? 0) },
    {
      key: 'net',
      header: ADMIN_SETTLEMENTS.net,
      render: (row) => MATCHES.price(row.net ?? 0),
      sortValue: (row) => row.net ?? 0,
    },
    {
      key: 'status',
      header: ADMIN_SETTLEMENTS.status,
      render: (row) => (row.status ? SETTLEMENTS.status[row.status] : ''),
    },
    { key: 'reason', header: ADMIN_SETTLEMENTS.holdReason, render: (row) => row.status_reason },
  ];

  return (
    <>
      <h1 className="text-title-sm font-bold text-fg">{ADMIN_SETTLEMENTS.title}</h1>
      <div className="flex flex-wrap items-end gap-4 py-6">
        <TextField
          label={ADMIN_SETTLEMENTS.month}
          type="month"
          value={params.month}
          max={thisMonth}
          onChange={(event) => setFilter('month', event.target.value)}
        />
        <FilterSelect
          id="filter-settlement-status"
          label={ADMIN_SETTLEMENTS.filterStatus}
          value={filters.status}
          options={optionsOf(SETTLEMENTS.status)}
          onChange={(value) => setFilter('status', value)}
        />
        <FilterSelect
          id="filter-settlement-kind"
          label={ADMIN_SETTLEMENTS.filterKind}
          value={filters.kind}
          options={optionsOf(SETTLEMENTS.kind)}
          onChange={(value) => setFilter('kind', value)}
        />
        <div className="ml-auto flex gap-2">
          <Button
            size="md"
            variant="secondary"
            loading={exportCsv.isPending}
            onClick={() => exportCsv.mutate()}
          >
            {ADMIN_SETTLEMENTS.exportCsv}
          </Button>
          <Button size="md" disabled={payable.length === 0} onClick={() => setConfirming(true)}>
            {ADMIN_SETTLEMENTS.pay(payable.length)}
          </Button>
        </div>
      </div>
      {settlements.isPending && <Skeleton lines={6} />}
      {settlements.isError && (
        <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void settlements.refetch()} />
      )}
      {settlements.data && (
        <DataTable
          caption={ADMIN_SETTLEMENTS.title}
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id ?? ''}
        />
      )}

      <Modal
        open={confirming}
        title={ADMIN_SETTLEMENTS.payConfirmTitle}
        onClose={() => setConfirming(false)}
        footer={
          <>
            <Button block size="md" variant="secondary" onClick={() => setConfirming(false)}>
              {COMMON.cancel}
            </Button>
            <Button block size="md" loading={pay.isPending} onClick={() => pay.mutate()}>
              {ADMIN_SETTLEMENTS.pay(payable.length)}
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-fg-muted">
          {ADMIN_SETTLEMENTS.payConfirmBody(payable.length, payableNet)}
        </p>
      </Modal>
    </>
  );
}
