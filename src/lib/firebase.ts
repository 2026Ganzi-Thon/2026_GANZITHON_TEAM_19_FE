import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';

import { authErrorCode, type AuthClient, type AuthUser } from './auth';
import { env } from './env';

const POPUP_BLOCKED_CODES = [
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
];

export const firebaseApp = initializeApp(env.firebase);

function toAuthUser(user: User | null): AuthUser | null {
  return user ? { uid: user.uid, email: user.email } : null;
}

/** Firebase Authentication 으로 로그인한다 (TRD 6-1, A-02). 토큰은 SDK 기본 저장소에만 둔다. */
export function createFirebaseAuthClient(): AuthClient {
  const auth = getAuth(firebaseApp);
  auth.languageCode = 'ko';

  return {
    getUser: () => toAuthUser(auth.currentUser),
    getIdToken: async (forceRefresh = false) =>
      auth.currentUser ? auth.currentUser.getIdToken(forceRefresh) : null,
    onIdTokenChanged: (listener) => onIdTokenChanged(auth, (user) => listener(toAuthUser(user))),
    signInWithGoogle: async () => {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        // 팝업이 막히면 리다이렉트로 다시 시도한다 (TRD A-02)
        if (!POPUP_BLOCKED_CODES.includes(authErrorCode(error))) throw error;
        await signInWithRedirect(auth, provider);
      }
    },
    signInWithEmail: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
    },
    signUpWithEmail: async (email, password) => {
      await createUserWithEmailAndPassword(auth, email, password);
    },
    sendPasswordReset: (email) => sendPasswordResetEmail(auth, email),
    signOut: () => signOut(auth),
  };
}
