// 웹 푸시 서비스 워커 (TRD 19-3). 푸시 본문에는 민감정보가 오지 않는다.
const DEFAULT_TITLE = '마음 케어';
const DEFAULT_BODY = '새 알림이 있어요';

function readPayload(event) {
  try {
    return event.data ? event.data.json() : {};
  } catch {
    return {};
  }
}

self.addEventListener('push', (event) => {
  const payload = readPayload(event);
  const notification = payload.notification ?? {};
  const link = payload.data?.link ?? '/';
  event.waitUntil(
    self.registration.showNotification(notification.title ?? DEFAULT_TITLE, {
      body: notification.body ?? DEFAULT_BODY,
      data: { link },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link;
  // 앱 안의 경로만 연다 (TRD 11-3)
  const path =
    typeof link === 'string' && link.startsWith('/') && !link.startsWith('//') ? link : '/';
  event.waitUntil(self.clients.openWindow(path));
});
