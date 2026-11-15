import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { listComplaints } from '@/api/endpoints/admin';
import type { AdminComplaint } from '@/api/pendingAdmin';
import { queryKeys } from '@/api/queryKeys';
import { NotFoundPage } from '@/app/ErrorPages';
import { type Column, DataTable } from '@/components/ui/DataTable';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ADMIN_COMPLAINTS } from '@/copy/adminOps';
import { COMMON } from '@/copy/fixed';
import { useFeatureFlag } from '@/hooks/useAppConfig';
import { formatKST } from '@/lib/date';

import { FilterSelect, optionsOf, useUrlFilters } from './filters';

const STALE_MS = 15_000;
const FILTERS = ['status', 'category', 'source'] as const;

const COLUMNS: Column<AdminComplaint>[] = [
  {
    key: 'created',
    header: ADMIN_COMPLAINTS.createdAt,
    render: (row) => formatKST(row.created_at),
    sortValue: (row) => row.created_at,
  },
  {
    key: 'category',
    header: ADMIN_COMPLAINTS.filterCategory,
    render: (row) => ADMIN_COMPLAINTS.category[row.category],
  },
  {
    key: 'reporter',
    header: ADMIN_COMPLAINTS.reporterRole,
    render: (row) => ADMIN_COMPLAINTS.reporter[row.reporter_role],
  },
  { key: 'target', header: ADMIN_COMPLAINTS.target, render: (row) => row.target_display },
  {
    key: 'strikes',
    header: ADMIN_COMPLAINTS.strikes,
    render: (row) => ADMIN_COMPLAINTS.strikeCount(row.target_strike_count),
    sortValue: (row) => row.target_strike_count,
  },
  {
    key: 'status',
    header: ADMIN_COMPLAINTS.filterStatus,
    render: (row) =>
      row.decision
        ? ADMIN_COMPLAINTS.alreadyDecided(ADMIN_COMPLAINTS.decisions[row.decision])
        : ADMIN_COMPLAINTS.status[row.status],
  },
];

function ComplaintList() {
  const navigate = useNavigate();
  const [filters, setFilter] = useUrlFilters(FILTERS);
  const complaints = useQuery({
    queryKey: queryKeys.admin('complaints', filters),
    queryFn: () => listComplaints(filters),
    staleTime: STALE_MS,
  });

  return (
    <>
      <h1 className="text-title-sm font-bold text-fg">{ADMIN_COMPLAINTS.title}</h1>
      <div className="flex flex-wrap gap-4 py-6">
        <FilterSelect
          id="filter-complaint-status"
          label={ADMIN_COMPLAINTS.filterStatus}
          value={filters.status}
          options={optionsOf(ADMIN_COMPLAINTS.status)}
          onChange={(value) => setFilter('status', value)}
        />
        <FilterSelect
          id="filter-complaint-category"
          label={ADMIN_COMPLAINTS.filterCategory}
          value={filters.category}
          options={optionsOf(ADMIN_COMPLAINTS.category)}
          onChange={(value) => setFilter('category', value)}
        />
        <FilterSelect
          id="filter-complaint-source"
          label={ADMIN_COMPLAINTS.filterSource}
          value={filters.source}
          options={optionsOf(ADMIN_COMPLAINTS.source)}
          onChange={(value) => setFilter('source', value)}
        />
      </div>
      {complaints.isPending && <Skeleton lines={6} />}
      {complaints.isError && (
        <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void complaints.refetch()} />
      )}
      {complaints.data && (
        <DataTable
          caption={ADMIN_COMPLAINTS.title}
          columns={COLUMNS}
          rows={complaints.data}
          rowKey={(row) => row.id}
          onRowOpen={(row) => navigate(`/admin/complaints/${row.id}`)}
        />
      )}
    </>
  );
}

/** M-05 민원 목록 (CMP-02). P1 기능이라 플래그가 꺼져 있으면 없는 화면이다 */
export function M05ComplaintsPage() {
  return useFeatureFlag('p1_complaints') ? <ComplaintList /> : <NotFoundPage />;
}
