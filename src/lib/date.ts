import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

export const KST = 'Asia/Seoul';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const RELATIVE_DAYS = ['오늘', '내일', '모레'] as const;

export type DateInput = string | number | Date;

/** 서버의 UTC 시각을 한국 시간으로 본다. 화면 표시는 이 모듈만 거친다 (TRD 10-2). */
export function toKST(value: DateInput): dayjs.Dayjs {
  return dayjs(value).tz(KST);
}

/** 화면에 보일 한국 시간 문자열. */
export function formatKST(value: DateInput, pattern = 'M월 D일 HH:mm'): string {
  return toKST(value).format(pattern);
}

export function formatKSTDate(value: DateInput): string {
  const date = toKST(value);
  return `${date.format('M월 D일')} (${WEEKDAYS[date.day()]})`;
}

export function formatKSTTime(value: DateInput): string {
  return toKST(value).format('HH:mm');
}

/** 날짜 칩에 쓰는 짧은 표기. 예: 11/03 (화) */
export function formatKSTShortDate(value: DateInput): string {
  const date = toKST(value);
  return `${date.format('MM/DD')} (${WEEKDAYS[date.day()]})`;
}

/** 한국 시간 기준 날짜 키 (YYYY-MM-DD). 슬롯을 날짜별로 묶을 때 쓴다. */
export function kstDateKey(value: DateInput): string {
  return toKST(value).format('YYYY-MM-DD');
}

/** 가까운 날은 '내일 19:00' 처럼 상대 표현으로 보여 준다. */
export function formatRelativeKST(value: DateInput, now: DateInput = Date.now()): string {
  const target = toKST(value);
  const days = target.startOf('day').diff(toKST(now).startOf('day'), 'day');
  const label = days >= 0 ? RELATIVE_DAYS[days] : undefined;
  return label ? `${label} ${target.format('HH:mm')}` : target.format('M월 D일 HH:mm');
}

/** 한국 시간으로 고른 날짜·시각을 서버에 보낼 UTC ISO 문자열로 바꾼다. */
export function kstToUtcIso(date: string, time = '00:00'): string {
  return dayjs.tz(`${date} ${time}`, 'YYYY-MM-DD HH:mm', KST).utc().toISOString();
}

export function minutesUntil(value: DateInput, now: DateInput = Date.now()): number {
  return dayjs(value).diff(dayjs(now), 'minute', true);
}

const SECOND_MS = 1000;
const MINUTE_SECONDS = 60;
const HOUR_SECONDS = 60 * MINUTE_SECONDS;
const DAY_HOURS = 24;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** 남은 시간. 1시간 안쪽은 'mm:ss', 그보다 길면 'n시간 n분', 하루가 넘으면 'n일 n시간'. */
export function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / SECOND_MS));
  const hours = Math.floor(totalSeconds / HOUR_SECONDS);
  const minutes = Math.floor((totalSeconds % HOUR_SECONDS) / MINUTE_SECONDS);
  if (hours >= DAY_HOURS) return `${Math.floor(hours / DAY_HOURS)}일 ${hours % DAY_HOURS}시간`;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${pad(minutes)}:${pad(totalSeconds % MINUTE_SECONDS)}`;
}
