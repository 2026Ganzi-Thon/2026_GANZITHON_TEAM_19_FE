import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { COMMON } from '@/copy/fixed';
import { DASHBOARD } from '@/copy/work';
import { pickUpcomingList } from '@/features/client/sessions';

import { useProviderSessions } from './queries';
import { SessionRow } from './SessionRow';

interface SectionProps {
  title: string;
  /** 제목 옆 '전체 보기' 링크 */
  to?: string;
  children: ReactNode;
}

/** 대시보드의 한 구역: 제목과 내용, 아래에 가는 구분선 */
export function Section({ title, to, children }: SectionProps) {
  return (
    <section className="border-b border-line pb-5 pt-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-caption font-medium text-fg-muted">{title}</h2>
        {to && (
          <Link
            to={to}
            className="relative text-caption font-bold text-fg underline after:absolute after:-inset-3"
          >
            {DASHBOARD.viewAll}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

const UPCOMING_COUNT = 3;

/** 오늘·다가오는 세션 (T-03 ①, E-03 ②) */
export function UpcomingSessions({ now, base }: { now: number; base: 't' | 'e' }) {
  const sessions = useProviderSessions();
  const upcoming = pickUpcomingList(sessions.data ?? [], now).slice(0, UPCOMING_COUNT);

  return (
    <Section title={DASHBOARD.upcoming} to={base === 't' ? '/t/sessions' : undefined}>
      {sessions.isPending && <Skeleton lines={2} className="pt-3" />}
      {sessions.isError && (
        <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void sessions.refetch()} />
      )}
      {sessions.data && upcoming.length === 0 && (
        <p className="pt-3 text-body-sm text-fg-muted">{DASHBOARD.noUpcoming}</p>
      )}
      <ul>
        {upcoming.map((session) => (
          <SessionRow key={session.session_id} session={session} now={now} base={base} />
        ))}
      </ul>
    </Section>
  );
}
