import { describe, expect, it } from 'vitest';

import type { Session } from '@/api/endpoints/sessions';

import {
  canEnter,
  isComplaintOpen,
  isRefundable,
  pickRecent,
  pickUpcoming,
  serviceLabel,
  sessionMinutes,
  splitSessions,
  trackLabel,
} from './sessions';

const NOW = Date.parse('2026-11-03T09:00:00Z');

function session(overrides: Partial<Session>): Session {
  return {
    session_id: 's',
    track: 'coaching',
    status: 'CONFIRMED',
    scheduled_start: '2026-11-03T10:00:00Z',
    scheduled_end: '2026-11-03T10:30:00Z',
    ...overrides,
  };
}

describe('pickUpcoming', () => {
  it('picks the nearest confirmed session that has not ended', () => {
    const sessions = [
      session({
        session_id: 'later',
        scheduled_start: '2026-11-05T10:00:00Z',
        scheduled_end: '2026-11-05T10:30:00Z',
      }),
      session({ session_id: 'next' }),
      session({ session_id: 'done', status: 'COMPLETED' }),
      session({
        session_id: 'past',
        scheduled_start: '2026-11-01T10:00:00Z',
        scheduled_end: '2026-11-01T10:30:00Z',
      }),
    ];

    expect(pickUpcoming(sessions, NOW)?.session_id).toBe('next');
  });

  it('returns nothing when there is no session to come', () => {
    expect(pickUpcoming([session({ status: 'CANCELLED' })], NOW)).toBeNull();
  });
});

describe('pickRecent', () => {
  it('lists the three latest completed sessions, newest first', () => {
    const sessions = ['01', '02', '03', '04'].map((day) =>
      session({
        session_id: day,
        status: 'COMPLETED',
        scheduled_start: `2026-10-${day}T10:00:00Z`,
      }),
    );

    expect(pickRecent(sessions).map((item) => item.session_id)).toEqual(['04', '03', '02']);
  });
});

describe('splitSessions', () => {
  it('puts unpaid, confirmed and running sessions under upcoming, nearest first', () => {
    const { upcoming, past } = splitSessions([
      session({ session_id: 'confirmed', scheduled_start: '2026-11-05T10:00:00Z' }),
      session({ session_id: 'unpaid', status: 'PENDING_PAYMENT' }),
      session({
        session_id: 'running',
        status: 'IN_PROGRESS',
        scheduled_start: '2026-11-03T08:50:00Z',
      }),
      session({ session_id: 'done', status: 'COMPLETED' }),
    ]);

    expect(upcoming.map((item) => item.session_id)).toEqual(['running', 'unpaid', 'confirmed']);
    expect(past.map((item) => item.session_id)).toEqual(['done']);
  });

  it('lists finished, cancelled and missed sessions under past, newest first', () => {
    const { past } = splitSessions([
      session({ session_id: 'old', status: 'COMPLETED', scheduled_start: '2026-10-01T10:00:00Z' }),
      session({ session_id: 'missed', status: 'NO_SHOW', scheduled_start: '2026-10-20T10:00:00Z' }),
      session({
        session_id: 'cancelled',
        status: 'CANCELLED',
        scheduled_start: '2026-10-10T10:00:00Z',
      }),
    ]);

    expect(past.map((item) => item.session_id)).toEqual(['missed', 'cancelled', 'old']);
  });
});

describe('canEnter', () => {
  it('opens the lobby from ten minutes before the start', () => {
    const start = '2026-11-03T10:00:00Z';

    expect(canEnter(session({ scheduled_start: start }), Date.parse('2026-11-03T09:49:00Z'))).toBe(
      false,
    );
    expect(canEnter(session({ scheduled_start: start }), Date.parse('2026-11-03T09:50:00Z'))).toBe(
      true,
    );
  });

  it('always lets the client into a session in progress', () => {
    expect(
      canEnter(session({ status: 'IN_PROGRESS', scheduled_start: '2026-11-04T10:00:00Z' }), NOW),
    ).toBe(true);
  });

  it('keeps unpaid and finished sessions closed even at the start time', () => {
    const atStart = Date.parse('2026-11-03T10:00:00Z');

    expect(canEnter(session({ status: 'PENDING_PAYMENT' }), atStart)).toBe(false);
    expect(canEnter(session({ status: 'COMPLETED' }), atStart)).toBe(false);
  });
});

describe('isRefundable', () => {
  it('refunds in full until twenty-four hours before the start', () => {
    const target = session({ scheduled_start: '2026-11-05T10:00:00Z' });

    expect(isRefundable(target, Date.parse('2026-11-04T10:00:00Z'))).toBe(true);
    expect(isRefundable(target, Date.parse('2026-11-04T10:00:01Z'))).toBe(false);
  });
});

describe('sessionMinutes', () => {
  it('measures the session length', () => {
    expect(sessionMinutes(session({}))).toBe(30);
    expect(sessionMinutes(session({ scheduled_end: undefined }))).toBeNull();
  });
});

describe('trackLabel', () => {
  it('names the two tracks', () => {
    expect(trackLabel(session({ track: 'coaching' }))).toBe('마음 코칭');
    expect(trackLabel(session({ track: 'professional' }))).toBe('전문 심리상담');
  });

  it('reads the provider profile track the same way', () => {
    expect(serviceLabel('trainee')).toBe('마음 코칭');
    expect(serviceLabel('expert')).toBe('전문 심리상담');
    expect(serviceLabel(undefined)).toBe('마음 코칭');
  });
});

describe('isComplaintOpen', () => {
  const ended = session({ status: 'COMPLETED', scheduled_end: '2026-11-03T10:30:00Z' });

  it('accepts a complaint until seven days after the session ended', () => {
    expect(isComplaintOpen(ended, Date.parse('2026-11-10T10:30:00Z'))).toBe(true);
    expect(isComplaintOpen(ended, Date.parse('2026-11-10T10:30:01Z'))).toBe(false);
  });

  it('covers a missed session but not one that has not finished', () => {
    const now = Date.parse('2026-11-04T00:00:00Z');

    expect(isComplaintOpen({ ...ended, status: 'NO_SHOW' }, now)).toBe(true);
    expect(isComplaintOpen({ ...ended, status: 'CONFIRMED' }, now)).toBe(false);
    expect(isComplaintOpen({ ...ended, status: 'CANCELLED' }, now)).toBe(false);
  });
});
