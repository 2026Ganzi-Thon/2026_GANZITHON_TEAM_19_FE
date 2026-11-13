import { getIdToken } from './auth';
import { env } from './env';

// KPI 이벤트 수집 (TRD 17-6). 민감정보(고민 내용, 닉네임)는 props 에 넣지 않는다.
export type EventName =
  | 'home_viewed'
  | 'intake_started'
  | 'intake_submitted'
  | 'match_viewed'
  | 'match_selected'
  | 'checkout_started'
  | 'payment_succeeded'
  | 'session_joined'
  | 'mood_before_submitted'
  | 'mood_after_submitted'
  | 'report_viewed'
  | 'referral_started'
  | 'consent_granted'
  | 'crisis_modal_opened'
  | 'certificate_issued'
  | 'rebook_started'
  | 'referral_sessions_changed'
  | 'referral_report_previewed'
  | 'web_vital'
  | 'realtime_reconnect';

type EventProps = Record<string, string | number | boolean>;

interface QueuedEvent {
  /** 서버가 중복 전송을 지우는 데 쓰는 ID (부록 B-7) */
  eid: string;
  name: EventName;
  props: EventProps;
  ts: string;
}

const BATCH_SIZE = 5;
const EVENTS_PATH = '/events';

let queue: QueuedEvent[] = [];

async function send(events: QueuedEvent[]): Promise<void> {
  if (events.length === 0 || !env.apiBaseUrl) return;
  try {
    const token = await getIdToken();
    await fetch(`${env.apiBaseUrl}${EVENTS_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ events }),
      keepalive: true,
    });
  } catch {
    // 지표 전송 실패는 화면에 영향을 주지 않는다
  }
}

export function track(name: EventName, props: EventProps = {}): void {
  queue.push({ eid: crypto.randomUUID(), name, props, ts: new Date().toISOString() });
  if (queue.length >= BATCH_SIZE) flushEvents();
}

export function flushEvents(): void {
  const events = queue;
  queue = [];
  void send(events);
}

/** 페이지를 떠날 때 남은 이벤트를 보낸다. */
export function flushEventsOnLeave(): void {
  if (queue.length === 0 || !env.apiBaseUrl) return;
  const events = queue;
  queue = [];
  const body = new Blob([JSON.stringify({ events })], { type: 'application/json' });
  navigator.sendBeacon(`${env.apiBaseUrl}${EVENTS_PATH}`, body);
}
