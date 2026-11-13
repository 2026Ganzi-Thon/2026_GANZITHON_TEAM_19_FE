import { describe, expect, it } from 'vitest';

import { canAccess, loginPath, roleHome, safeNextPath } from './access';

describe('roleHome', () => {
  it('sends each role to its own home', () => {
    expect(roleHome('client')).toBe('/c');
    expect(roleHome('trainee')).toBe('/t');
    expect(roleHome('expert')).toBe('/e');
    expect(roleHome('admin')).toBe('/admin');
  });
});

describe('canAccess', () => {
  it('lets a provider under review reach only profile, credentials and the status page', () => {
    expect(canAccess('pending_review', 'profile')).toBe(true);
    expect(canAccess('pending_review', 'status')).toBe(true);
    expect(canAccess('pending_review', 'full')).toBe(false);
    expect(canAccess('pending_review', 'readonly')).toBe(false);
  });

  it('lets a suspended provider read dashboards and history but nothing else', () => {
    expect(canAccess('suspended', 'readonly')).toBe(true);
    expect(canAccess('suspended', 'full')).toBe(false);
    expect(canAccess('suspended', 'profile')).toBe(false);
  });

  it('sends a banned account to the status page only', () => {
    expect(canAccess('banned', 'status')).toBe(true);
    expect(canAccess('banned', 'readonly')).toBe(false);
  });

  it('keeps browsing open for a restricted client', () => {
    expect(canAccess('restricted', 'full')).toBe(true);
  });

  it('denies everything while the status is unknown', () => {
    expect(canAccess(undefined, 'status')).toBe(false);
  });
});

describe('safeNextPath', () => {
  it('accepts an internal path', () => {
    expect(safeNextPath('/c/sessions?tab=past')).toBe('/c/sessions?tab=past');
  });

  it.each([
    '//evil.example',
    'https://evil.example',
    'javascript:alert(1)',
    '/\\evil.example',
    '',
    null,
  ])('rejects %s', (next) => {
    expect(safeNextPath(next)).toBeNull();
  });
});

describe('loginPath', () => {
  it('remembers where the visitor was going', () => {
    expect(loginPath('/c/sessions')).toBe('/login?next=%2Fc%2Fsessions');
    expect(loginPath('/')).toBe('/login');
  });
});
