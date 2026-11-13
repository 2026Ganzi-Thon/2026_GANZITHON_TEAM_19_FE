import { describe, expect, it } from 'vitest';

import type { Session } from '@/api/endpoints/sessions';

import { canEnter, pickRecent, pickUpcoming, trackLabel } from './sessions';

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
});

describe('trackLabel', () => {
  it('names the two tracks', () => {
    expect(trackLabel(session({ track: 'coaching' }))).toBe('마음 코칭');
    expect(trackLabel(session({ track: 'professional' }))).toBe('전문 심리상담');
  });
});
