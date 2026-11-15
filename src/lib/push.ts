import { registerDeviceToken } from '@/api/endpoints/me';

import { env } from './env';

export type PushResult = 'enabled' | 'denied' | 'unsupported' | 'unavailable';

const SERVICE_WORKER_PATH = '/firebase-messaging-sw.js';
const MOCK_TOKEN = 'mock-device-token';

/**
 * 웹 푸시를 켠다 (TRD A-05, 19-3): 브라우저 권한 → FCM 토큰 → USR-04.
 * 푸시 본문에는 민감정보가 오지 않는다. 사용자가 버튼을 눌렀을 때만 부른다.
 */
export async function enablePush(): Promise<PushResult> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  // 빌드 때 값이 정해지는 조건이라 운영 빌드에는 목 분기가 들어가지 않는다
  if (import.meta.env.VITE_API_MOCK === '1') {
    await registerDeviceToken({ token: MOCK_TOKEN, platform: 'web' });
    return 'enabled';
  }
  if (!env.vapidKey) return 'unavailable';

  const [{ getMessaging, getToken, isSupported }, { firebaseApp }] = await Promise.all([
    import('firebase/messaging'),
    import('./firebase'),
  ]);
  if (!(await isSupported())) return 'unsupported';
  const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
  const token = await getToken(getMessaging(firebaseApp), {
    vapidKey: env.vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!token) return 'unavailable';
  await registerDeviceToken({ token, platform: 'web' });
  return 'enabled';
}
