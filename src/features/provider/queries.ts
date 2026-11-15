import { useQuery } from '@tanstack/react-query';

import { listExpertReferrals } from '@/api/endpoints/expert';
import { listSessions } from '@/api/endpoints/sessions';
import { getMySettlements, type Settlement } from '@/api/endpoints/settlements';
import {
  getCompetency,
  getMyStrikes,
  listExpertSupervisions,
  listSupervisionRequests,
  listTraineeSupervisions,
} from '@/api/endpoints/supervisions';
import { queryKeys } from '@/api/queryKeys';
import { toKST } from '@/lib/date';
import { useAuthStore } from '@/stores/authStore';

const STALE_MS = 30_000;
const SLOW_STALE_MS = 5 * 60_000;

/** 지금 한국 시간 기준 달 (YYYY-MM) */
export function currentMonth(now = Date.now()): string {
  return toKST(now).format('YYYY-MM');
}

/** 상태별 실수령액 합계 */
export function sumNet(items: readonly Settlement[], status: Settlement['status']): number {
  return items
    .filter((item) => item.status === status)
    .reduce((total, item) => total + (item.net ?? 0), 0);
}

/** SES-02. 상담사 시점의 내 세션 */
export function useProviderSessions() {
  const role = useAuthStore((state) => state.me?.role ?? 'provider');
  return useQuery({
    queryKey: queryKeys.sessions(role, 'all'),
    queryFn: listSessions,
    staleTime: STALE_MS,
  });
}

/** STL-01 */
export function useMySettlements(month: string) {
  return useQuery({
    queryKey: queryKeys.settlements(month),
    queryFn: () => getMySettlements(month),
    staleTime: STALE_MS,
  });
}

export function useTraineeSupervisions() {
  return useQuery({
    queryKey: ['supervisions', 'trainee'],
    queryFn: listTraineeSupervisions,
    staleTime: STALE_MS,
  });
}

export function useCompetency() {
  return useQuery({
    queryKey: ['competency'],
    queryFn: getCompetency,
    staleTime: SLOW_STALE_MS,
  });
}

export function useMyStrikes() {
  return useQuery({ queryKey: ['strikes', 'me'], queryFn: getMyStrikes, staleTime: SLOW_STALE_MS });
}

export function useExpertReferrals() {
  return useQuery({
    queryKey: ['expert-referrals'],
    queryFn: listExpertReferrals,
    staleTime: STALE_MS,
  });
}

export function useExpertSupervisions() {
  return useQuery({
    queryKey: ['supervisions', 'expert'],
    queryFn: listExpertSupervisions,
    staleTime: STALE_MS,
  });
}

export function useSupervisionRequests(enabled: boolean) {
  return useQuery({
    queryKey: ['supervision-requests', 'expert'],
    queryFn: listSupervisionRequests,
    enabled,
    staleTime: STALE_MS,
  });
}
