import { useQuery } from '@tanstack/react-query';

import { getAppConfig } from '@/api/endpoints/public';
import { queryKeys } from '@/api/queryKeys';

const STALE_MS = 60_000;
const REFETCH_MS = 5 * 60_000;

export type FeatureFlag =
  'p1_certificates' | 'p1_supervision_requests' | 'p1_complaints' | 'p1_credential_auto_verify';

/** 기능 플래그·점검 모드 (TRD 17-8). 앱 시작 시와 5분마다 받는다. */
export function useAppConfig() {
  return useQuery({
    queryKey: queryKeys.appConfig,
    queryFn: getAppConfig,
    staleTime: STALE_MS,
    refetchInterval: REFETCH_MS,
  });
}

/** 꺼진 기능은 메뉴와 라우트를 숨긴다. 권한 판단에는 쓰지 않는다 (TRD 7-8). */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  const { data } = useAppConfig();
  const flags = data?.feature_flags as Record<string, unknown> | undefined;
  return flags?.[flag] === true;
}

/** 'YYYY.MM.DD' 형식 버전을 비교한다. current 가 minimum 보다 낮으면 true. */
export function isOutdated(current: string, minimum: string | undefined): boolean {
  if (!minimum) return false;
  const parse = (value: string) => value.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const [a, b] = [parse(current), parse(minimum)];
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0);
    if (diff !== 0) return diff < 0;
  }
  return false;
}
