export type AppEnv = 'local' | 'preview' | 'staging' | 'prod';

const APP_ENVS: readonly AppEnv[] = ['local', 'preview', 'staging', 'prod'];

function readAppEnv(value: string | undefined): AppEnv {
  return APP_ENVS.find((candidate) => candidate === value) ?? 'local';
}

/** 빌드 때 주입되는 공개 설정값 (TRD 7-3). 비밀값은 여기에 오지 않는다. */
export const env = {
  appEnv: readAppEnv(import.meta.env.VITE_APP_ENV),
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  wsUrl: import.meta.env.VITE_WS_URL ?? '',
  apiMock: import.meta.env.VITE_API_MOCK === '1',
  version: __APP_VERSION__,
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  },
  vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '',
} as const;
