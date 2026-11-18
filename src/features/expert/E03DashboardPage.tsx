import { Link } from 'react-router';

import { Screen } from '@/app/layouts/Screen';
import { MATCHES } from '@/copy/client';
import { DASHBOARD, SETTLEMENTS } from '@/copy/work';
import { Section, UpcomingSessions } from '@/features/provider/DashboardParts';
import {
  currentMonth,
  sumNet,
  useExpertReferrals,
  useExpertSupervisions,
  useMySettlements,
  useSupervisionRequests,
} from '@/features/provider/queries';
import { useFeatureFlag } from '@/hooks/useAppConfig';
import { useNow } from '@/hooks/useNow';
import { formatKST, formatRemaining } from '@/lib/date';
import { SERVER_HAS } from '@/lib/serverFeatures';
import { useAuthStore } from '@/stores/authStore';

const SUMMARY_STATUSES = ['locked', 'pending', 'paid'] as const;

/** E-03 전문가 대시보드 */
export function E03DashboardPage() {
  const now = useNow();
  const name = useAuthStore(
    (state) => state.me?.provider_profile?.display_name ?? state.me?.nickname ?? '',
  );
  const requestsEnabled = useFeatureFlag('p1_supervision_requests');
  const referrals = useExpertReferrals();
  const supervisions = useExpertSupervisions();
  const requests = useSupervisionRequests(requestsEnabled);
  const settlements = useMySettlements(currentMonth(now));

  const waiting = (referrals.data ?? []).filter(
    (item) => item.status === 'booked' && Date.parse(item.respond_by) > now,
  );
  const nearest = waiting.map((item) => Date.parse(item.respond_by)).sort((a, b) => a - b)[0];
  const todo = (supervisions.data ?? []).filter((item) => item.status !== 'submitted');

  return (
    <Screen>
      <h1 className="whitespace-pre-line border-b border-line pb-6 pt-10 text-title-sm font-bold text-fg">
        {DASHBOARD.traineeTitle(name)}
      </h1>

      {SERVER_HAS.expertInbox && (
        <Section title={DASHBOARD.newReferrals} to="/e/referrals">
          {referrals.data && waiting.length === 0 && (
            <p className="pt-3 text-body-sm text-fg-muted">{DASHBOARD.noReferrals}</p>
          )}
          {waiting.length > 0 && (
            <>
              <p className="pt-3 text-headline font-bold text-fg">
                {DASHBOARD.referralWaiting(waiting.length)}
              </p>
              {nearest !== undefined && (
                <p className="pt-1 text-body-sm text-fg-muted">
                  {DASHBOARD.referralDeadline(formatRemaining(nearest - now))}
                </p>
              )}
            </>
          )}
        </Section>
      )}

      <UpcomingSessions now={now} base="e" />

      {SERVER_HAS.expertInbox && (
        <Section title={DASHBOARD.supervisionTodo} to="/e/supervisions">
          {supervisions.data && todo.length === 0 && (
            <p className="pt-3 text-body-sm text-fg-muted">{DASHBOARD.noSupervisionTodo}</p>
          )}
          <ul>
            {todo.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/e/supervisions/${item.id}/write`}
                  className="flex flex-col gap-1 py-3 text-body-sm"
                >
                  <span className="font-bold text-fg">
                    {DASHBOARD.supervisionItem(item.trainee_display, item.session_count)}
                  </span>
                  <span className="text-fg-muted">
                    {[
                      DASHBOARD.supervisionDue(formatKST(item.due_at)),
                      item.referral_total !== undefined &&
                        DASHBOARD.supervisionGroup(
                          item.referral_total,
                          item.referral_remaining ?? 0,
                        ),
                      item.settlement_locked && DASHBOARD.settlementLocked,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {requestsEnabled && (requests.data?.length ?? 0) > 0 && (
            <Link
              to="/e/supervision-requests"
              className="flex min-h-(--size-touch) items-center text-body-sm font-bold text-fg underline"
            >
              {DASHBOARD.requestsWaiting(requests.data?.length ?? 0)}
            </Link>
          )}
        </Section>
      )}

      <Section title={DASHBOARD.settlementSummary} to="/e/settlements">
        <dl className="flex gap-6 pt-3 text-body-sm">
          {SUMMARY_STATUSES.map((status) => (
            <div key={status}>
              <dt className="text-fg-muted">{SETTLEMENTS.status[status]}</dt>
              <dd className="pt-1 font-bold text-fg">
                {MATCHES.price(sumNet(settlements.data?.items ?? [], status))}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
    </Screen>
  );
}
