import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

export const KST = 'Asia/Seoul';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

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

/** 한국 시간으로 고른 날짜·시각을 서버에 보낼 UTC ISO 문자열로 바꾼다. */
export function kstToUtcIso(date: string, time = '00:00'): string {
  return dayjs.tz(`${date} ${time}`, 'YYYY-MM-DD HH:mm', KST).utc().toISOString();
}

export function minutesUntil(value: DateInput, now: DateInput = Date.now()): number {
  return dayjs(value).diff(dayjs(now), 'minute', true);
}
