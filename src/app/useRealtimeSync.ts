import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { queryKeys } from '@/api/queryKeys';
import { track } from '@/lib/analytics';
import { onEvent, startRealtime, stopRealtime } from '@/lib/realtime';
import { refreshSession } from '@/lib/session';
import { useAuthStore } from '@/stores/authStore';
import { useCrisisStore } from '@/stores/crisisStore';

/**
 * 로그인 중 실시간 연결을 유지하고, 서버 이벤트를 Query 캐시와 스토어에 반영한다 (TRD 17-3~17-5).
 * 상담방 메시지는 열려 있는 상담방(useChatRoom)이 직접 받는다.
 */
export function useRealtimeSync(): void {
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.me?.role);

  useEffect(() => {
    if (status !== 'ready') return;
    void startRealtime();
    return stopRealtime;
  }, [status]);

  useEffect(() => {
    function refreshSessions(data: { session_id: string }) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.allSessions });
      void queryClient.invalidateQueries({ queryKey: queryKeys.session(data.session_id) });
    }

    const unsubscribes = [
      onEvent('risk:alert', (data) => {
        // 상담사에게는 같은 이벤트가 대응 카드용으로 온다. 위기 안내는 내담자에게만 띄운다
        if (role !== 'client') return;
        const crisis = useCrisisStore.getState();
        if (data.level === 'high' || data.level === 'critical') {
          crisis.noteRisk(data.session_id, data.level);
        }
        if (data.level === 'critical') {
          crisis.show({ source: 'auto', level: data.level, sessionId: data.session_id });
          track('crisis_modal_opened', { source: 'auto' });
        }
      }),
      onEvent('session:updated', refreshSessions),
      onEvent('session:ended', refreshSessions),
      onEvent('session:no_show', refreshSessions),
      onEvent('notification:new', () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      }),
      onEvent('report:ready', (data) => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.report(data.report_id) });
      }),
      onEvent('account:status', () => {
        void refreshSession(queryClient);
      }),
    ];
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [queryClient, role]);
}
