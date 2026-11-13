import { create } from 'zustand';

import type { Me } from '@/api/endpoints/me';
import type { ApiError } from '@/api/errors';
import type { AuthUser } from '@/lib/auth';

export type AuthStatus = 'loading' | 'signedOut' | 'unregistered' | 'ready';

// TRD 17-1
interface AuthState {
  /** Firebase Auth 사용자 */
  firebaseUser: AuthUser | null;
  /** GET /v1/me 결과 (role, status, nickname) */
  me: Me | null;
  status: AuthStatus;
  /** /me 조회가 네트워크·서버 오류로 실패했을 때만 채워진다 */
  error: ApiError | null;
  setSignedOut: () => void;
  setUnregistered: (user: AuthUser) => void;
  setReady: (user: AuthUser, me: Me) => void;
  setFailed: (user: AuthUser, error: ApiError) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  me: null,
  status: 'loading',
  error: null,
  setSignedOut: () => set({ firebaseUser: null, me: null, status: 'signedOut', error: null }),
  setUnregistered: (user) =>
    set({ firebaseUser: user, me: null, status: 'unregistered', error: null }),
  setReady: (user, me) => set({ firebaseUser: user, me, status: 'ready', error: null }),
  setFailed: (user, error) => set({ firebaseUser: user, error }),
}));
