import { describe, expect, it } from 'vitest';

import { authErrorMessage, errorCopy } from './errorMessages';

describe('errorCopy', () => {
  it('maps a known backend code to its copy and display mode', () => {
    expect(errorCopy('FORBIDDEN_ROLE')).toEqual({
      message: '접근 권한이 없어요',
      display: 'toast',
    });
    expect(errorCopy('NICKNAME_TAKEN').display).toBe('field');
    expect(errorCopy('HOLD_EXPIRED').display).toBe('redirect');
  });

  it('never shows a raw code for an unknown error', () => {
    const copy = errorCopy('SOMETHING_NEW');

    expect(copy.display).toBe('toast');
    expect(copy.message).not.toContain('SOMETHING_NEW');
  });
});

describe('authErrorMessage', () => {
  it('uses the wording of the login screen spec', () => {
    expect(authErrorMessage('auth/email-already-in-use')).toBe(
      '이미 가입된 이메일입니다. 로그인해 주세요',
    );
    expect(authErrorMessage('auth/wrong-password')).toBe(
      authErrorMessage('auth/invalid-credential'),
    );
  });

  it('stays quiet when the user closed the popup', () => {
    expect(authErrorMessage('auth/popup-closed-by-user')).toBeNull();
  });
});
