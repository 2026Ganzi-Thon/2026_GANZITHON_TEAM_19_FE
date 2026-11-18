import { Link } from 'react-router';

import { Screen } from '@/app/layouts/Screen';
import { MATCHES } from '@/copy/client';
import { DASHBOARD } from '@/copy/work';
import { Section, UpcomingSessions } from '@/features/provider/DashboardParts';
import {
  currentMonth,
  sumNet,
  useCompetency,
  useMySettlements,
  useMyStrikes,
  useTraineeSupervisions,
} from '@/features/provider/queries';
import { useNow } from '@/hooks/useNow';
import { cx } from '@/lib/cx';
import { formatKST } from '@/lib/date';
import { SERVER_HAS } from '@/lib/serverFeatures';
import { useAuthStore } from '@/stores/authStore';

const FEEDBACK_COUNT = 3;

/** T-03 수련생 대시보드 */
export function T03DashboardPage() {
  const now = useNow();
  const name = useAuthStore(
    (state) => state.me?.provider_profile?.display_name ?? state.me?.nickname ?? '',
  );
  const supervisions = useTraineeSupervisions();
  const competency = useCompetency();
  const settlements = useMySettlements(currentMonth(now));
  const strikes = useMyStrikes();

  const unread = (supervisions.data ?? []).filter((item) => !item.read_at).slice(0, FEEDBACK_COUNT);
  const totals = competency.data?.totals;
  const strikeCount = strikes.data?.count ?? 0;

  return (
    <Screen>
      <h1 className="whitespace-pre-line border-b border-line pb-6 pt-10 text-title-sm font-bold text-fg">
        {DASHBOARD.traineeTitle(name)}
      </h1>

      <UpcomingSessions now={now} base="t" />

      {SERVER_HAS.supervisionFeedback && (
        <Section title={DASHBOARD.newFeedback} to="/t/supervisions">
          {supervisions.data && unread.length === 0 && (
            <p className="pt-3 text-body-sm text-fg-muted">{DASHBOARD.noFeedback}</p>
          )}
          <ul>
            {unread.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/t/supervisions/${item.id}`}
                  className="flex min-h-(--size-touch) flex-col justify-center gap-1 py-2 text-body-sm"
                >
                  <span className="font-bold text-fg">{item.expert_display}</span>
                  <span className="text-fg-muted">{formatKST(item.submitted_at, 'M월 D일')}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {SERVER_HAS.supervisionFeedback && (
        <Section title={DASHBOARD.totals}>
          {totals && (
            <p className="pt-3 text-body font-medium text-fg">
              {[
                DASHBOARD.hours(totals.session_hours),
                DASHBOARD.sessions(totals.session_count),
                DASHBOARD.supervisions(totals.supervision_count),
              ].join(' · ')}
            </p>
          )}
        </Section>
      )}

      <Section title={DASHBOARD.settlement} to="/t/settlements">
        <p className="pt-3 text-headline font-bold text-fg">
          {MATCHES.price(sumNet(settlements.data?.items ?? [], 'pending'))}
        </p>
      </Section>

      {SERVER_HAS.strikes && (
        <Section title={DASHBOARD.strikes} to="/t/settlements?tab=strikes">
          {strikes.data && (
            // 1회 이상이면 주의 색으로, 숫자와 함께 보여 준다
            <p
              className={cx(
                'pt-3 text-body font-bold',
                strikeCount > 0 ? 'text-danger' : 'text-fg',
              )}
            >
              {DASHBOARD.strikeCount(strikeCount, strikes.data.limit)}
            </p>
          )}
        </Section>
      )}
    </Screen>
  );
}
