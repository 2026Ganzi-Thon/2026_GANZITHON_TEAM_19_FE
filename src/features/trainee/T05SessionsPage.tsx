import { useSearchParams } from 'react-router';

import { Screen } from '@/app/layouts/Screen';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { COMMON } from '@/copy/fixed';
import { PROVIDER_SESSIONS } from '@/copy/work';
import { splitSessions } from '@/features/client/sessions';
import { useProviderSessions } from '@/features/provider/queries';
import { SessionRow } from '@/features/provider/SessionRow';
import { useNow } from '@/hooks/useNow';

const TAB_PARAM = 'tab';

/** T-05 세션 목록 */
export function T05SessionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const done = searchParams.get(TAB_PARAM) === 'done';
  const now = useNow();
  const sessions = useProviderSessions();
  const { upcoming, past } = splitSessions(sessions.data ?? []);
  const list = done ? past : upcoming;

  return (
    <Screen>
      <h1 className="pt-10 text-title-sm font-bold text-fg">{PROVIDER_SESSIONS.title}</h1>
      <div role="group" aria-label={PROVIDER_SESSIONS.tabsLabel} className="flex gap-1.5 pt-4">
        <Chip selected={!done} onClick={() => setSearchParams({}, { replace: true })}>
          {PROVIDER_SESSIONS.tabUpcoming}
        </Chip>
        <Chip
          selected={done}
          onClick={() => setSearchParams({ [TAB_PARAM]: 'done' }, { replace: true })}
        >
          {PROVIDER_SESSIONS.tabDone}
        </Chip>
      </div>

      {sessions.isPending && <Skeleton lines={5} className="pt-6" />}
      {sessions.isError && (
        <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void sessions.refetch()} />
      )}
      {sessions.data && list.length === 0 && (
        <p className="pt-8 text-body-sm text-fg-muted">
          {done ? PROVIDER_SESSIONS.emptyDone : PROVIDER_SESSIONS.emptyUpcoming}
        </p>
      )}
      <ul className="pb-6 pt-2">
        {list.map((session) => (
          <SessionRow key={session.session_id} session={session} now={now} base="t" detailed />
        ))}
      </ul>
    </Screen>
  );
}
