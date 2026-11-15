import { Link } from 'react-router';

import { Screen } from '@/app/layouts/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { EXPERT_SUPERVISION } from '@/copy/expertSupervision';
import { COMMON } from '@/copy/fixed';
import { DASHBOARD } from '@/copy/work';
import { useExpertSupervisions, useSupervisionRequests } from '@/features/provider/queries';
import { useFeatureFlag } from '@/hooks/useAppConfig';
import { cx } from '@/lib/cx';
import { formatKST } from '@/lib/date';

/** E-08 슈퍼비전 목록: 작성할 것과 제출한 것 */
export function E08SupervisionsPage() {
  const requestsEnabled = useFeatureFlag('p1_supervision_requests');
  const supervisions = useExpertSupervisions();
  const requests = useSupervisionRequests(requestsEnabled);
  const items = supervisions.data ?? [];

  return (
    <Screen>
      <h1 className="pt-10 text-title-sm font-bold text-fg">{EXPERT_SUPERVISION.listTitle}</h1>
      {requestsEnabled && (
        <Link
          to="/e/supervision-requests"
          className="flex min-h-(--size-touch) items-center self-start pt-2 text-body-sm font-bold text-fg underline"
        >
          {EXPERT_SUPERVISION.requests(requests.data?.length ?? 0)}
        </Link>
      )}

      {supervisions.isPending && <Skeleton lines={5} className="pt-6" />}
      {supervisions.isError && (
        <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void supervisions.refetch()} />
      )}
      {supervisions.data && items.length === 0 && <EmptyState title={EXPERT_SUPERVISION.empty} />}

      <ul className="pb-6 pt-2">
        {items.map((item) => {
          const submitted = item.status === 'submitted';
          const facts = [
            EXPERT_SUPERVISION.status[item.status],
            !submitted && DASHBOARD.supervisionDue(formatKST(item.due_at)),
            item.referral_total !== undefined &&
              DASHBOARD.supervisionGroup(item.referral_total, item.referral_remaining ?? 0),
            item.settlement_locked && DASHBOARD.settlementLocked,
          ].filter(Boolean);
          const body = (
            <>
              <span className={cx('font-bold', submitted ? 'text-fg-muted' : 'text-fg')}>
                {DASHBOARD.supervisionItem(item.trainee_display, item.session_count)}
              </span>
              <span className="text-fg-muted">{facts.join(' · ')}</span>
            </>
          );
          return (
            <li key={item.id} className="border-b border-line text-body-sm">
              {submitted ? (
                <span className="flex flex-col gap-1 py-4">{body}</span>
              ) : (
                <Link to={`/e/supervisions/${item.id}/write`} className="flex flex-col gap-1 py-4">
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </Screen>
  );
}
