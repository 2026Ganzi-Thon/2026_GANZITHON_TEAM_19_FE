import { useSyncExternalStore } from 'react';

import { isRealtimeConnected, subscribeConnection } from '@/lib/realtime';

/** 실시간 연결 상태. 연결 상태 점과 '연결이 불안정해요' 배너에 쓴다. */
export function useRealtimeConnected(): boolean {
  return useSyncExternalStore(subscribeConnection, isRealtimeConnected);
}
