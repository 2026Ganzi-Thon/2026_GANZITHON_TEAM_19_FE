import { kstDateKey, kstToUtcIso } from '@/lib/date';

/** 하루에 열 수 있는 시간대 (한국 시간) */
export const DAY_START_HOUR = 6;
export const DAY_END_HOUR = 24;
export const MAX_REPEAT_WEEKS = 4;

const MINUTE_MS = 60_000;
const HOUR_MINUTES = 60;
const DAY_MS = 24 * HOUR_MINUTES * MINUTE_MS;
const WEEK_DAYS = 7;
const COACHING_STEP = 30;
/** 전문 상담은 50분 진행 + 10분 휴식이라 한 시간 간격으로 연다 (TRD T-04) */
const PROFESSIONAL_STEP = 60;

export interface DayCell {
  /** UTC ISO 시작 시각 */
  start: string;
  /** 한국 시간 HH:mm */
  label: string;
}

export function stepMinutes(professional: boolean): number {
  return professional ? PROFESSIONAL_STEP : COACHING_STEP;
}

/** from 이 속한 날부터 7일의 한국 날짜 키 */
export function weekDays(from: number): string[] {
  return Array.from({ length: WEEK_DAYS }, (_, index) => kstDateKey(from + index * DAY_MS));
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** 한 날짜의 시간 칸. step 분 간격으로 06:00 부터 24:00 전까지 */
export function dayCells(dateKey: string, step: number): DayCell[] {
  const count = ((DAY_END_HOUR - DAY_START_HOUR) * HOUR_MINUTES) / step;
  return Array.from({ length: count }, (_, index) => {
    const minutes = DAY_START_HOUR * HOUR_MINUTES + index * step;
    const label = `${pad(Math.floor(minutes / HOUR_MINUTES))}:${pad(minutes % HOUR_MINUTES)}`;
    return { start: kstToUtcIso(dateKey, label), label };
  });
}

/** 같은 순간인지. 서버가 밀리초 없이 돌려줘도 같은 시각으로 본다 */
export function sameInstant(a: string | undefined, b: string): boolean {
  return a !== undefined && Date.parse(a) === Date.parse(b);
}
