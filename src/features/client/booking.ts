import type { OpenSlot } from '@/api/endpoints/providers';
import { kstDateKey } from '@/lib/date';

/** 예약할 수 있는 기간 (TRD C-05 날짜 스트립) */
export const BOOKING_DAYS = 14;
/** 예약 뒤 결제까지 자리를 잡아 두는 시간 (TRD C-05) */
export const HOLD_MS = 10 * 60_000;
export const COACHING_MINUTES = 30;
export const PROFESSIONAL_MINUTES = 50;

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** from 부터 days 일의 한국 날짜 키 (YYYY-MM-DD) */
export function bookingDates(from: number, days = BOOKING_DAYS): string[] {
  return Array.from({ length: days }, (_, index) => kstDateKey(from + index * DAY_MS));
}

/** 열린 슬롯을 한국 날짜별로 묶는다. 각 날짜 안에서는 이른 시간 순이다 */
export function groupSlotsByDate(slots: readonly OpenSlot[]): Record<string, OpenSlot[]> {
  return slots
    .filter((slot) => slot.id && slot.start_at)
    .sort((a, b) => Date.parse(a.start_at ?? '') - Date.parse(b.start_at ?? ''))
    .reduce<Record<string, OpenSlot[]>>((groups, slot) => {
      const key = kstDateKey(slot.start_at ?? '');
      return { ...groups, [key]: [...(groups[key] ?? []), slot] };
    }, {});
}

/** 슬롯 길이(분). 시각이 없으면 트랙 기본값을 쓴다 */
export function slotMinutes(slot: OpenSlot | undefined, fallback: number): number {
  if (!slot?.start_at || !slot.end_at) return fallback;
  const minutes = Math.round((Date.parse(slot.end_at) - Date.parse(slot.start_at)) / MINUTE_MS);
  return minutes > 0 ? minutes : fallback;
}

export function defaultMinutes(professional: boolean): number {
  return professional ? PROFESSIONAL_MINUTES : COACHING_MINUTES;
}
