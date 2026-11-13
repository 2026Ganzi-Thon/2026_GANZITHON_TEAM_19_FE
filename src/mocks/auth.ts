import type { AuthClient, AuthUser } from '@/lib/auth';

const STORAGE_KEY = 'mindcare-mock-uid';
const TOKEN_PREFIX = 'mock:';

class MockAuthError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function userFromEmail(email: string): AuthUser {
  const uid = email.split('@')[0] || 'guest';
  return { uid, email };
}

/** 목 토큰에서 사용자 ID를 꺼낸다. MSW 핸들러가 쓴다. */
export function uidFromAuthorization(header: string | null): string | null {
  const token = header?.replace(/^Bearer /u, '') ?? '';
  return token.startsWith(TOKEN_PREFIX) ? token.slice(TOKEN_PREFIX.length) : null;
}

/**
 * VITE_API_MOCK=1 에서 Firebase 대신 쓰는 로그인. 아무 비밀번호나 받고,
 * 이메일의 @ 앞부분이 시드 계정 이름(client1, trainee1, expert1, admin1)이면 그 계정이 된다.
 * 새로고침 뒤에도 개발을 이어 가도록 계정 이름만 sessionStorage 에 둔다.
 */
export function createMockAuthClient(): AuthClient {
  const listeners = new Set<(user: AuthUser | null) => void>();
  const storedUid = window.sessionStorage.getItem(STORAGE_KEY);
  let current: AuthUser | null = storedUid
    ? { uid: storedUid, email: `${storedUid}@mock.test` }
    : null;

  function setUser(user: AuthUser | null) {
    current = user;
    if (user) window.sessionStorage.setItem(STORAGE_KEY, user.uid);
    else window.sessionStorage.removeItem(STORAGE_KEY);
    listeners.forEach((listener) => listener(user));
  }

  async function signIn(email: string, password: string) {
    if (password === 'wrong-password') throw new MockAuthError('auth/invalid-credential');
    setUser(userFromEmail(email));
  }

  return {
    getUser: () => current,
    getIdToken: async () => (current ? `${TOKEN_PREFIX}${current.uid}` : null),
    onIdTokenChanged: (listener) => {
      listeners.add(listener);
      queueMicrotask(() => listener(current));
      return () => {
        listeners.delete(listener);
      };
    },
    signInWithGoogle: () => signIn('client1@mock.test', 'google'),
    signInWithEmail: signIn,
    signUpWithEmail: async (email, password) => {
      if (email.startsWith('taken')) throw new MockAuthError('auth/email-already-in-use');
      await signIn(email, password);
    },
    sendPasswordReset: async () => undefined,
    signOut: async () => setUser(null),
  };
}
