import { describe, expect, it } from 'vitest';

import {
  formatKST,
  formatKSTDate,
  formatKSTShortDate,
  formatRelativeKST,
  formatRemaining,
  kstDateKey,
  kstToUtcIso,
  minutesUntil,
} from './date';

describe('date helpers', () => {
  it('shows a UTC instant in Korean time regardless of the device time zone', () => {
    expect(formatKST('2026-11-03T10:00:00Z')).toBe('11월 3일 19:00');
    expect(formatKSTDate('2026-11-03T16:30:00Z')).toBe('11월 4일 (수)');
    expect(formatKSTShortDate('2026-11-03T03:00:00Z')).toBe('11/03 (화)');
  });

  it('sends a Korean wall-clock time to the server as UTC', () => {
    expect(kstToUtcIso('2026-11-03', '19:00')).toBe('2026-11-03T10:00:00.000Z');
  });

  it('measures the minutes left until a start time', () => {
    expect(minutesUntil('2026-11-03T10:00:00Z', '2026-11-03T09:50:00Z')).toBe(10);
  });

  it('keys an instant by its Korean calendar date', () => {
    expect(kstDateKey('2026-11-03T14:59:59Z')).toBe('2026-11-03');
    expect(kstDateKey('2026-11-03T15:00:00Z')).toBe('2026-11-04');
  });
});

describe('formatRelativeKST', () => {
  const now = '2026-11-03T03:00:00Z';

  it('names today, tomorrow and the day after', () => {
    expect(formatRelativeKST('2026-11-03T10:00:00Z', now)).toBe('오늘 19:00');
    expect(formatRelativeKST('2026-11-04T10:00:00Z', now)).toBe('내일 19:00');
    expect(formatRelativeKST('2026-11-05T09:00:00Z', now)).toBe('모레 18:00');
  });

  it('goes by the Korean calendar day, not by twenty-four hour blocks', () => {
    // 한국 시간 23:30 에 보면 30분 뒤(00:00)도 '내일'이다
    expect(formatRelativeKST('2026-11-03T15:00:00Z', '2026-11-03T14:30:00Z')).toBe('내일 00:00');
  });

  it('shows the date for anything further away or in the past', () => {
    expect(formatRelativeKST('2026-11-07T10:00:00Z', now)).toBe('11월 7일 19:00');
    expect(formatRelativeKST('2026-11-01T10:00:00Z', now)).toBe('11월 1일 19:00');
  });
});

describe('formatRemaining', () => {
  it('shows minutes and seconds within the hour', () => {
    expect(formatRemaining(5 * 60_000)).toBe('05:00');
    expect(formatRemaining(599_000)).toBe('09:59');
    expect(formatRemaining(500)).toBe('00:01');
  });

  it('never goes below zero', () => {
    expect(formatRemaining(-3000)).toBe('00:00');
  });

  it('switches to hours and days for long waits', () => {
    expect(formatRemaining(2 * 3_600_000 + 15 * 60_000)).toBe('2시간 15분');
    expect(formatRemaining(26 * 3_600_000)).toBe('1일 2시간');
  });
});
