import { describe, expect, it } from 'vitest';

import { dayCells, sameInstant, stepMinutes, weekDays } from './availability';

describe('weekDays', () => {
  it('lists seven Korean dates starting from the given moment', () => {
    // 한국 시간으로는 11월 4일 새벽
    const days = weekDays(Date.parse('2026-11-03T16:00:00Z'));

    expect(days).toHaveLength(7);
    expect(days[0]).toBe('2026-11-04');
    expect(days[6]).toBe('2026-11-10');
  });
});

describe('dayCells', () => {
  it('makes thirty-minute cells from 06:00 until midnight for coaching', () => {
    const cells = dayCells('2026-11-04', stepMinutes(false));

    expect(cells).toHaveLength(36);
    expect(cells[0]).toEqual({ start: '2026-11-03T21:00:00.000Z', label: '06:00' });
    expect(cells.at(-1)?.label).toBe('23:30');
  });

  it('makes hourly cells for professional sessions (fifty minutes plus a break)', () => {
    const cells = dayCells('2026-11-04', stepMinutes(true));

    expect(cells).toHaveLength(18);
    expect(cells[1]?.label).toBe('07:00');
  });
});

describe('sameInstant', () => {
  it('matches the same moment written with or without milliseconds', () => {
    expect(sameInstant('2026-11-03T21:00:00Z', '2026-11-03T21:00:00.000Z')).toBe(true);
    expect(sameInstant('2026-11-03T21:30:00Z', '2026-11-03T21:00:00.000Z')).toBe(false);
    expect(sameInstant(undefined, '2026-11-03T21:00:00.000Z')).toBe(false);
  });
});
