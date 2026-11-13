import { describe, expect, it } from 'vitest';

import { formatKST, formatKSTDate, kstToUtcIso, minutesUntil } from './date';

describe('date helpers', () => {
  it('shows a UTC instant in Korean time regardless of the device time zone', () => {
    expect(formatKST('2026-11-03T10:00:00Z')).toBe('11월 3일 19:00');
    expect(formatKSTDate('2026-11-03T16:30:00Z')).toBe('11월 4일 (수)');
  });

  it('sends a Korean wall-clock time to the server as UTC', () => {
    expect(kstToUtcIso('2026-11-03', '19:00')).toBe('2026-11-03T10:00:00.000Z');
  });

  it('measures the minutes left until a start time', () => {
    expect(minutesUntil('2026-11-03T10:00:00Z', '2026-11-03T09:50:00Z')).toBe(10);
  });
});
