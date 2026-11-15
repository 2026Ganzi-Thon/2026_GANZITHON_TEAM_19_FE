import { describe, expect, it } from 'vitest';

import { canToggleSession, sameSessions, toggleSession } from './selection';

describe('toggleSession', () => {
  it('adds and removes a session', () => {
    expect(toggleSession(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleSession(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('never removes the last session', () => {
    expect(canToggleSession(['a'], 'a')).toBe(false);
    expect(toggleSession(['a'], 'a')).toEqual(['a']);
  });

  it('does not go over the maximum', () => {
    expect(canToggleSession(['a', 'b'], 'c', 2)).toBe(false);
    expect(toggleSession(['a', 'b'], 'c', 2)).toEqual(['a', 'b']);
    expect(canToggleSession(['a', 'b'], 'a', 2)).toBe(true);
  });
});

describe('sameSessions', () => {
  it('ignores the order', () => {
    expect(sameSessions(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(sameSessions(['a', 'b'], ['a'])).toBe(false);
    expect(sameSessions(['a', 'b'], ['a', 'c'])).toBe(false);
  });
});
