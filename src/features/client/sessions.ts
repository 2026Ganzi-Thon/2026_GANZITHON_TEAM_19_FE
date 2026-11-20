import type { Session } from '@/api/endpoints/sessions';
import { SERVICE } from '@/copy/fixed';

/** 입장 버튼이 열리는 시점: 시작 10분 전 (TRD C-01, C-08) */
export const ENTER_BEFORE_MINUTES = 10;
/** 서버는 종료 5분 뒤부터 입장을 거절한다 (RealtimeService JOIN_AFTER_END) */
const ENTER_AFTER_END_MINUTES = 5;
/** 이 시간 전에 취소해야 전액 환불된다 (TRD C-06, 운영 설정값) */
export const REFUND_BEFORE_HOURS = 24;
const RECENT_COUNT = 3;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

const ACTIVE_STATUSES: ReadonlyArray<Session['status']> = ['confirmed', 'in_progress'];
const UPCOMING_STATUSES: ReadonlyArray<Session['status']> = [
  'pending_payment',
  'confirmed',
  'in_progress',
];
const PROFESSIONAL_TRACKS: ReadonlyArray<string | undefined> = ['professional', 'expert'];

function startTime(session: Session): number {
  return session.scheduled_start ? Date.parse(session.scheduled_start) : 0;
}

/** 예정 상담을 가까운 순으로 */
export function pickUpcomingList(sessions: readonly Session[], now: number): Session[] {
  return sessions
    .filter(
      (session) =>
        ACTIVE_STATUSES.includes(session.status) &&
        (session.scheduled_end ? Date.parse(session.scheduled_end) > now : true),
    )
    .sort((a, b) => startTime(a) - startTime(b));
}

/** 가장 가까운 예정 상담 */
export function pickUpcoming(sessions: readonly Session[], now: number): Session | null {
  return pickUpcomingList(sessions, now)[0] ?? null;
}

/** 최근 끝난 상담 3건 */
export function pickRecent(sessions: readonly Session[]): Session[] {
  return sessions
    .filter((session) => session.status === 'completed')
    .sort((a, b) => startTime(b) - startTime(a))
    .slice(0, RECENT_COUNT);
}

/** C-07 탭: 예정(결제 대기·확정·진행 중)은 가까운 순, 지난 상담은 최근 순 */
export function splitSessions(sessions: readonly Session[]): {
  upcoming: Session[];
  past: Session[];
} {
  const isUpcoming = (session: Session) => UPCOMING_STATUSES.includes(session.status);
  return {
    upcoming: sessions.filter(isUpcoming).sort((a, b) => startTime(a) - startTime(b)),
    past: sessions
      .filter((session) => !isUpcoming(session))
      .sort((a, b) => startTime(b) - startTime(a)),
  };
}

export function canEnter(session: Session, now: number): boolean {
  const end = session.scheduled_end ? Date.parse(session.scheduled_end) : Infinity;
  if (now > end + ENTER_AFTER_END_MINUTES * MINUTE_MS) return false;
  if (session.status === 'in_progress') return true;
  if (session.status !== 'confirmed') return false;
  return startTime(session) - now <= ENTER_BEFORE_MINUTES * MINUTE_MS;
}

/** 지금 취소하면 전액 환불되는지 (시작 24시간 전까지) */
export function isRefundable(session: Session, now: number): boolean {
  return startTime(session) - now >= REFUND_BEFORE_HOURS * HOUR_MS;
}

export function sessionMinutes(session: Session): number | null {
  if (!session.scheduled_start || !session.scheduled_end) return null;
  const minutes = Math.round(
    (Date.parse(session.scheduled_end) - Date.parse(session.scheduled_start)) / MINUTE_MS,
  );
  return minutes > 0 ? minutes : null;
}

/** 매칭·세션은 coaching/professional, 상담사 프로필은 trainee/expert 로 트랙을 적는다 */
export function isProfessionalTrack(track: string | undefined): boolean {
  return PROFESSIONAL_TRACKS.includes(track);
}

/** 화면에 보일 서비스 이름. 수련생 서비스는 "마음 코칭" 이라고만 부른다 (TRD 14장) */
export function serviceLabel(track: string | undefined): string {
  return isProfessionalTrack(track) ? SERVICE.professional : SERVICE.coaching;
}

export function isCoaching(session: Session): boolean {
  return !isProfessionalTrack(session.track);
}

export function trackLabel(session: Session): string {
  return serviceLabel(session.track);
}

/** 민원은 상담이 끝나고 이 기간 안에만 낼 수 있다 (TRD C-13) */
export const COMPLAINT_WINDOW_DAYS = 7;

export function isComplaintOpen(session: Session, now: number): boolean {
  if (session.status !== 'completed' && session.status !== 'no_show') return false;
  const endedAt = session.scheduled_end ? Date.parse(session.scheduled_end) : startTime(session);
  return now - endedAt <= COMPLAINT_WINDOW_DAYS * 24 * HOUR_MS;
}
