import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { type CredentialQueuePage, listCredentialQueue } from '@/api/endpoints/admin';
import { queryKeys } from '@/api/queryKeys';
import { type Column, DataTable } from '@/components/ui/DataTable';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ADMIN, ADMIN_CREDENTIALS } from '@/copy/admin';
import { COMMON } from '@/copy/fixed';
import { useNow } from '@/hooks/useNow';
import { formatKST, formatRemaining } from '@/lib/date';

import { FilterSelect, optionsOf, useUrlFilters } from './filters';

type QueueItem = NonNullable<CredentialQueuePage['items']>[number];

const STALE_MS = 15_000;
const FILTERS = ['role', 'kind', 'verify_result'] as const;
const ROLE_OPTIONS = [
  { value: 'trainee', label: ADMIN.role.trainee },
  { value: 'expert', label: ADMIN.role.expert },
];
const KIND_OPTIONS = [
  { value: 'enrollment', label: ADMIN_CREDENTIALS.kindSchool },
  { value: 'national', label: ADMIN_CREDENTIALS.kindNational },
  { value: 'society', label: ADMIN_CREDENTIALS.kindSociety },
];

/** M-02 자격 심사 대기열. 오래 기다린 신청부터 보여 준다 */
export function M02CredentialQueuePage() {
  const navigate = useNavigate();
  const now = useNow();
  const [filters, setFilter] = useUrlFilters(FILTERS);
  const queue = useQuery({
    queryKey: queryKeys.admin('credentials', filters),
    queryFn: () => listCredentialQueue(filters),
    staleTime: STALE_MS,
  });
  const rows = [...(queue.data?.items ?? [])].sort((a, b) =>
    (a.submitted_at ?? '').localeCompare(b.submitted_at ?? ''),
  );

  const columns: Column<QueueItem>[] = [
    {
      key: 'submitted',
      header: ADMIN_CREDENTIALS.submittedAt,
      render: (row) => (row.submitted_at ? formatKST(row.submitted_at) : ''),
    },
    {
      key: 'name',
      header: ADMIN_CREDENTIALS.displayName,
      render: (row) => row.display_name ?? row.nickname,
    },
    {
      key: 'role',
      header: ADMIN_CREDENTIALS.filterRole,
      render: (row) => (row.role ? ADMIN.role[row.role] : ''),
    },
    {
      key: 'cert',
      header: ADMIN_CREDENTIALS.certName,
      render: (row) => row.credentials?.map((item) => item.cert_name).join(', '),
    },
    {
      key: 'verify',
      header: ADMIN_CREDENTIALS.verifyResult,
      render: (row) =>
        row.credentials?.map((item) => ADMIN.verify[item.verify_result ?? 'none']).join(', '),
    },
    {
      key: 'waiting',
      header: ADMIN_CREDENTIALS.waiting,
      render: (row) =>
        row.submitted_at ? formatRemaining(now - Date.parse(row.submitted_at)) : '',
    },
  ];

  return (
    <>
      <h1 className="text-title-sm font-bold text-fg">{ADMIN_CREDENTIALS.title}</h1>
      <div className="flex flex-wrap gap-4 py-6">
        <FilterSelect
          id="filter-role"
          label={ADMIN_CREDENTIALS.filterRole}
          value={filters.role}
          options={ROLE_OPTIONS}
          onChange={(value) => setFilter('role', value)}
        />
        <FilterSelect
          id="filter-kind"
          label={ADMIN_CREDENTIALS.filterKind}
          value={filters.kind}
          options={KIND_OPTIONS}
          onChange={(value) => setFilter('kind', value)}
        />
        <FilterSelect
          id="filter-verify"
          label={ADMIN_CREDENTIALS.filterVerify}
          value={filters.verify_result}
          options={optionsOf(ADMIN.verify)}
          onChange={(value) => setFilter('verify_result', value)}
        />
      </div>
      {queue.isPending && <Skeleton lines={6} />}
      {queue.isError && (
        <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void queue.refetch()} />
      )}
      {queue.data && (
        <DataTable
          caption={ADMIN_CREDENTIALS.title}
          columns={columns}
          rows={rows}
          rowKey={(row) => row.user_id ?? ''}
          onRowOpen={(row) => navigate(`/admin/credentials/${row.user_id}`)}
        />
      )}
    </>
  );
}
