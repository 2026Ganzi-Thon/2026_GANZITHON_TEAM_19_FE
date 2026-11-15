import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import { listRiskEvents } from '@/api/endpoints/admin';
import type { RiskEvent, RiskEventStatus } from '@/api/pendingAdmin';
import { queryKeys } from '@/api/queryKeys';
import { Chip } from '@/components/ui/Chip';
import { type Column, DataTable } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ADMIN_RISKS } from '@/copy/adminOps';
import { EXPERT_REFERRAL } from '@/copy/expertReferral';
import { COMMON } from '@/copy/fixed';
import { useNow } from '@/hooks/useNow';
import { cx } from '@/lib/cx';
import { formatRemaining } from '@/lib/date';

import { RiskDetail } from './RiskDetail';
import { elapsedMs, sortRiskEvents } from './risks';

const STATUSES: readonly RiskEventStatus[] = ['open', 'acknowledged', 'escalated', 'resolved'];
const DEFAULT_STATUS: RiskEventStatus = 'open';
const STATUS_PARAM = 'status';
const ID_PARAM = 'id';
const TICK_MS = 1000;
const REFRESH_MS = 30_000;

function parseStatus(value: string | null): RiskEventStatus {
  return STATUSES.find((status) => status === value) ?? DEFAULT_STATUS;
}

/** M-04 Red Flag 모니터 (RSK-01~03). 새 경고(risk:new)가 오면 틀이 목록을 다시 부른다 */
export function M04RisksPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = parseStatus(searchParams.get(STATUS_PARAM));
  const selectedId = searchParams.get(ID_PARAM);
  const now = useNow(TICK_MS);
  const events = useQuery({
    queryKey: queryKeys.admin('risks', { status }),
    queryFn: () => listRiskEvents({ status }),
    refetchInterval: REFRESH_MS,
  });
  const rows = sortRiskEvents(events.data ?? []);
  const selected = rows.find((event) => event.id === selectedId);

  function update(change: (params: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams);
    change(next);
    setSearchParams(next, { replace: true });
  }

  function showTab(tab: RiskEventStatus) {
    update((params) => {
      params.delete(ID_PARAM);
      if (tab === DEFAULT_STATUS) params.delete(STATUS_PARAM);
      else params.set(STATUS_PARAM, tab);
    });
  }

  const closeDrawer = () => update((params) => params.delete(ID_PARAM));

  const columns: Column<RiskEvent>[] = [
    {
      key: 'level',
      header: ADMIN_RISKS.level,
      render: (row) => (
        <span
          className={cx(
            'rounded-sm px-2 py-0.5 font-bold',
            row.level === 'critical' || row.level === 'high'
              ? 'bg-danger-bg text-danger'
              : 'bg-chip text-fg',
          )}
        >
          {EXPERT_REFERRAL.riskLevel[row.level]}
        </span>
      ),
    },
    { key: 'source', header: ADMIN_RISKS.source, render: (row) => ADMIN_RISKS.sources[row.source] },
    { key: 'client', header: ADMIN_RISKS.client, render: (row) => row.client_nickname },
    {
      key: 'provider',
      header: ADMIN_RISKS.provider,
      render: (row) => row.provider_display ?? ADMIN_RISKS.noProvider,
    },
    {
      key: 'elapsed',
      header: ADMIN_RISKS.elapsed,
      render: (row) => (
        <span className="tabular-nums">
          {formatRemaining(elapsedMs(row, events.dataUpdatedAt, now))}
        </span>
      ),
    },
    {
      key: 'acked',
      header: ADMIN_RISKS.providerAcked,
      render: (row) => (row.provider_acked ? ADMIN_RISKS.acked : ADMIN_RISKS.notAcked),
    },
  ];

  return (
    <>
      <h1 className="text-title-sm font-bold text-fg">{ADMIN_RISKS.title}</h1>
      <div role="group" aria-label={ADMIN_RISKS.title} className="flex gap-1.5 py-6">
        {STATUSES.map((tab) => (
          <Chip key={tab} selected={status === tab} onClick={() => showTab(tab)}>
            {ADMIN_RISKS.tabs[tab]}
          </Chip>
        ))}
      </div>
      {events.isPending && <Skeleton lines={6} />}
      {events.isError && (
        <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void events.refetch()} />
      )}
      {events.data && (
        <DataTable
          caption={ADMIN_RISKS.title}
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          onRowOpen={(row) => update((params) => params.set(ID_PARAM, row.id))}
        />
      )}

      <Drawer open={selected !== undefined} title={ADMIN_RISKS.drawerTitle} onClose={closeDrawer}>
        {selected && (
          <RiskDetail
            key={selected.id}
            event={selected}
            onDone={() => {
              closeDrawer();
              void queryClient.invalidateQueries({ queryKey: ['admin', 'risks'] });
            }}
          />
        )}
      </Drawer>
    </>
  );
}
