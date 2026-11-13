export interface AuthUser {
  uid: string;
  email: string | null;
}

/** 로그인 수단을 감싼 인터페이스. 실제 구현은 Firebase, 목 모드에서는 mocks/auth.ts 가 맡는다. */
export interface AuthClient {
  getUser(): AuthUser | null;
  getIdToken(forceRefresh?: boolean): Promise<string | null>;
  onIdTokenChanged(listener: (user: AuthUser | null) => void): () => void;
  signInWithGoogle(): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<void>;
  signUpWithEmail(email: string, password: string): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  signOut(): Promise<void>;
}

let client: AuthClient | null = null;
let pending: Promise<AuthClient> | null = null;

async function createClient(): Promise<AuthClient> {
  // 빌드 때 값이 정해지는 조건이라 운영 빌드에는 목 코드가 들어가지 않는다
  if (import.meta.env.VITE_API_MOCK === '1') {
    const { createMockAuthClient } = await import('@/mocks/auth');
    return createMockAuthClient();
  }
  const { createFirebaseAuthClient } = await import('./firebase');
  return createFirebaseAuthClient();
}

/** 앱 시작 때 한 번 부른다. Firebase 코드는 이때 따로 내려받는다 (TRD 10-3 firebase 청크). */
export function initAuth(): Promise<AuthClient> {
  pending ??= createClient().then((created) => {
    client = created;
    return created;
  });
  return pending;
}

export function authClient(): AuthClient {
  if (!client) throw new Error('initAuth() 가 끝나기 전에 authClient() 를 불렀다');
  return client;
}

export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const ready = client ?? (pending ? await pending : null);
  return ready ? ready.getIdToken(forceRefresh) : null;
}

/** Firebase·목 오류에서 'auth/...' 코드를 꺼낸다. */
export function authErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return 'auth/unknown';
}
