import type { Session } from '@/api/endpoints/sessions';
import { SERVICE } from '@/copy/fixed';

/** 입장 버튼이 열리는 시점: 시작 10분 전 (TRD C-01, C-08) */
export const ENTER_BEFORE_MINUTES = 10;
const RECENT_COUNT = 3;

const UPCOMING_STATUSES: ReadonlyArray<Session['status']> = ['CONFIRMED', 'IN_PROGRESS'];

function startTime(session: Session): number {
  return session.scheduled_start ? Date.parse(session.scheduled_start) : 0;
}

/** 가장 가까운 예정 상담 */
export function pickUpcoming(sessions: readonly Session[], now: number): Session | null {
  const upcoming = sessions
    .filter(
      (session) =>
        UPCOMING_STATUSES.includes(session.status) &&
        (session.scheduled_end ? Date.parse(session.scheduled_end) > now : true),
    )
    .sort((a, b) => startTime(a) - startTime(b));
  return upcoming[0] ?? null;
}

/** 최근 끝난 상담 3건 */
export function pickRecent(sessions: readonly Session[]): Session[] {
  return sessions
    .filter((session) => session.status === 'COMPLETED')
    .sort((a, b) => startTime(b) - startTime(a))
    .slice(0, RECENT_COUNT);
}

export function canEnter(session: Session, now: number): boolean {
  if (session.status === 'IN_PROGRESS') return true;
  return startTime(session) - now <= ENTER_BEFORE_MINUTES * 60_000;
}

export function isCoaching(session: Session): boolean {
  return session.track !== 'professional';
}

export function trackLabel(session: Session): string {
  return isCoaching(session) ? SERVICE.coaching : SERVICE.professional;
}
