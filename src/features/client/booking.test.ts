import { describe, expect, it } from 'vitest';

import {
  BOOKING_DAYS,
  bookingDates,
  COACHING_MINUTES,
  defaultMinutes,
  groupSlotsByDate,
  PROFESSIONAL_MINUTES,
  slotMinutes,
} from './booking';

describe('bookingDates', () => {
  it('lists fourteen Korean dates starting from today in Korea', () => {
    // 한국 시간으로는 이미 11월 4일 새벽 1시
    const dates = bookingDates(Date.parse('2026-11-03T16:00:00Z'));

    expect(dates).toHaveLength(BOOKING_DAYS);
    expect(dates[0]).toBe('2026-11-04');
    expect(dates.at(-1)).toBe('2026-11-17');
  });
});

describe('groupSlotsByDate', () => {
  it('groups open slots by Korean date with the earliest time first', () => {
    const groups = groupSlotsByDate([
      { id: 'late', start_at: '2026-11-03T12:00:00Z', end_at: '2026-11-03T12:30:00Z' },
      { id: 'early', start_at: '2026-11-03T10:00:00Z', end_at: '2026-11-03T10:30:00Z' },
      // UTC 로는 11월 3일이지만 한국에서는 11월 4일 0시 30분
      { id: 'next-day', start_at: '2026-11-03T15:30:00Z', end_at: '2026-11-03T16:00:00Z' },
    ]);

    expect(groups['2026-11-03']?.map((slot) => slot.id)).toEqual(['early', 'late']);
    expect(groups['2026-11-04']?.map((slot) => slot.id)).toEqual(['next-day']);
  });

  it('skips slots the client could not book anyway', () => {
    expect(groupSlotsByDate([{ start_at: '2026-11-03T10:00:00Z' }, { id: 'no-time' }])).toEqual({});
  });
});

describe('slotMinutes', () => {
  it('measures the slot and falls back to the track default', () => {
    const slot = { id: 's', start_at: '2026-11-03T10:00:00Z', end_at: '2026-11-03T10:50:00Z' };

    expect(slotMinutes(slot, COACHING_MINUTES)).toBe(50);
    expect(slotMinutes(undefined, COACHING_MINUTES)).toBe(30);
    expect(slotMinutes({ id: 's', start_at: slot.start_at }, PROFESSIONAL_MINUTES)).toBe(50);
  });

  it('knows the session length of each track', () => {
    expect(defaultMinutes(false)).toBe(30);
    expect(defaultMinutes(true)).toBe(50);
  });
});
