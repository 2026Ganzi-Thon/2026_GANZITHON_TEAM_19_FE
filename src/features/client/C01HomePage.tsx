import { useEffect } from 'react';
import { Link } from 'react-router';

import type { Session } from '@/api/endpoints/sessions';
import { isApiError } from '@/api/errors';
import { Screen } from '@/app/layouts/Screen';
import { CrisisButton } from '@/components/crisis/CrisisButton';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListRow } from '@/components/ui/ListRow';
import { Skeleton } from '@/components/ui/Skeleton';
import { EMPTY } from '@/copy/empty';
import { errorCopy } from '@/copy/errorMessages';
import { COMMON, NOTICE } from '@/copy/fixed';
import { REPORT } from '@/copy/referral';
import { CLIENT_HOME } from '@/copy/screens';
import { useNow } from '@/hooks/useNow';
import { track } from '@/lib/analytics';
import { formatKST } from '@/lib/date';
import { useAuthStore } from '@/stores/authStore';

import { useProviderName, useSessions } from './queries';
import { canEnter, isCoaching, pickRecent, pickUpcoming, trackLabel } from './sessions';

const RECENT_LINK =
  'flex min-h-(--size-touch) items-center text-caption font-bold text-fg underline';

function UpcomingSession({ session, now }: { session: Session; now: number }) {
  const providerName = useProviderName(session.provider_id);

  return (
    <section aria-labelledby="upcoming-title" className="border-b border-line pb-8 pt-6">
      <h2 id="upcoming-title" className="text-caption font-medium text-fg-muted">
        {CLIENT_HOME.upcoming}
      </h2>
      {session.scheduled_start && (
        <p className="pt-4 text-headline font-bold text-fg">
          {formatKST(session.scheduled_start, 'M월 D일  ·  HH:mm')}
        </p>
      )}
      <p className="pt-2 text-body font-medium text-fg">
        {[providerName, trackLabel(session)].filter(Boolean).join('  /  ')}
      </p>
      <p className="pt-2 text-caption text-fg-muted">{CLIENT_HOME.enterHint}</p>
      <ButtonLink
        to={`/c/sessions/${session.session_id}/lobby`}
        disabled={!canEnter(session, now)}
        className="mt-4"
      >
        {CLIENT_HOME.enterLobby}
      </ButtonLink>
    </section>
  );
}

function RecentSession({ session }: { session: Session }) {
  const providerName = useProviderName(session.provider_id);
  const when = session.scheduled_start ? formatKST(session.scheduled_start, 'M월 D일') : '';

  return (
    <li className="flex items-center justify-between gap-3 border-b border-line py-4">
      <span className="flex flex-col gap-1">
        <span className="text-body font-medium text-fg">
          {[providerName, trackLabel(session)].filter(Boolean).join('  /  ')}
        </span>
        <span className="text-caption text-fg-muted">{when}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        {session.report && (
          <Link to={`/c/reports/${session.report.id}`} className={RECENT_LINK}>
            {REPORT.view}
          </Link>
        )}
        {isCoaching(session) && session.provider_id && (
          <Link
            to={`/c/providers/${session.provider_id}?rebook_of=${session.session_id}`}
            onClick={() => track('rebook_started')}
            className={RECENT_LINK}
          >
            {CLIENT_HOME.rebook}
          </Link>
        )}
      </span>
    </li>
  );
}

/** C-01 내담자 홈 */
export function C01HomePage() {
  const nickname = useAuthStore((state) => state.me?.nickname ?? '');
  const now = useNow();
  const { data, isPending, isError, error, refetch } = useSessions();

  useEffect(() => {
    track('home_viewed');
  }, []);

  const upcoming = data ? pickUpcoming(data, now) : null;
  const recent = data ? pickRecent(data) : [];
  const empty = data !== undefined && data.length === 0;

  return (
    <Screen>
      <header className="flex items-start justify-between gap-3 border-b border-line pb-6 pt-10">
        <h1 className="whitespace-pre-line text-title-sm font-bold text-fg">
          {CLIENT_HOME.greeting(nickname)}
        </h1>
        <CrisisButton />
      </header>

      {isPending && <Skeleton lines={5} className="pt-6" />}
      {isError && (
        <ErrorState
          title={COMMON.serverErrorTitle}
          description={errorCopy(isApiError(error) ? error.code : '').message}
          requestId={isApiError(error) ? error.requestId : undefined}
          onRetry={() => void refetch()}
        />
      )}

      {upcoming && <UpcomingSession session={upcoming} now={now} />}

      {empty ? (
        <EmptyState
          title={EMPTY.clientHome.title}
          description={EMPTY.clientHome.description}
          action={<ButtonLink to="/c/intake">{EMPTY.clientHome.action}</ButtonLink>}
        />
      ) : (
        data && <ListRow to="/c/intake" title={CLIENT_HOME.newIntake} emphasis />
      )}

      {recent.length > 0 && (
        <section aria-labelledby="recent-title" className="pt-6">
          <h2 id="recent-title" className="text-caption font-medium text-fg-muted">
            {CLIENT_HOME.recent}
          </h2>
          <ul>
            {recent.map((session) => (
              <RecentSession key={session.session_id} session={session} />
            ))}
          </ul>
        </section>
      )}

      <p className="mt-auto pb-6 pt-8 text-micro text-fg-muted">{NOTICE.notMedical}</p>
    </Screen>
  );
}
