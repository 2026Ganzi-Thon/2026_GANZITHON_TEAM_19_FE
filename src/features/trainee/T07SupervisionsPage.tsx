import { Link } from 'react-router';

import { Screen } from '@/app/layouts/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { COMMON } from '@/copy/fixed';
import { SUPERVISION } from '@/copy/supervision';
import { useTraineeSupervisions } from '@/features/provider/queries';
import { categoryLabel } from '@/features/provider/SessionRow';
import { formatKST } from '@/lib/date';

/** T-07 슈퍼비전 피드백 목록 */
export function T07SupervisionsPage() {
  const supervisions = useTraineeSupervisions();
  const items = supervisions.data ?? [];

  return (
    <Screen>
      <h1 className="pt-10 text-title-sm font-bold text-fg">{SUPERVISION.listTitle}</h1>
      {supervisions.isPending && <Skeleton lines={5} className="pt-6" />}
      {supervisions.isError && (
        <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void supervisions.refetch()} />
      )}
      {supervisions.data && items.length === 0 && <EmptyState title={SUPERVISION.empty} />}
      <ul className="pb-6 pt-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to={`/t/supervisions/${item.id}`}
              className="flex items-start gap-3 border-b border-line py-4 text-body-sm"
            >
              <span
                aria-hidden="true"
                className={
                  item.read_at
                    ? 'mt-1.5 size-2 shrink-0'
                    : 'mt-1.5 size-2 shrink-0 rounded-full bg-danger'
                }
              />
              <span className="flex flex-col gap-1">
                <span className="font-bold text-fg">
                  {[formatKST(item.session_date, 'M월 D일'), categoryLabel(item.category)]
                    .filter(Boolean)
                    .join(' · ')}
                  {!item.read_at && <span className="sr-only"> ({SUPERVISION.unread})</span>}
                </span>
                <span className="text-fg-muted">
                  {[
                    item.expert_display,
                    SUPERVISION.arrived(formatKST(item.submitted_at, 'M월 D일')),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
