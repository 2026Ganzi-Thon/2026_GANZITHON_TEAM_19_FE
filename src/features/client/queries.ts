import { useQuery } from '@tanstack/react-query';

import { getProvider } from '@/api/endpoints/providers';
import { getSession, listSessions } from '@/api/endpoints/sessions';
import { queryKeys } from '@/api/queryKeys';

// TRD 17-3 캐시 정책
const SESSIONS_STALE_MS = 30_000;
const PROVIDER_STALE_MS = 5 * 60_000;

/** SES-02 내 상담 목록 */
export function useSessions() {
  return useQuery({
    queryKey: queryKeys.sessions('client', 'all'),
    queryFn: listSessions,
    staleTime: SESSIONS_STALE_MS,
  });
}

/** SES-03 상담 한 건 */
export function useSession(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.session(sessionId),
    queryFn: () => getSession(sessionId),
    staleTime: SESSIONS_STALE_MS,
  });
}

/** USR-05 상담사 공개 프로필 */
export function useProvider(providerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.provider(providerId ?? ''),
    queryFn: () => getProvider(providerId ?? ''),
    enabled: Boolean(providerId),
    staleTime: PROVIDER_STALE_MS,
  });
}

/** 상담사 활동명. 아직 못 받았으면 빈 문자열 */
export function useProviderName(providerId: string | undefined): string {
  return useProvider(providerId).data?.display_name ?? '';
}
