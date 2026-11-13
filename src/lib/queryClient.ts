import { QueryClient } from '@tanstack/react-query';

import { isApiError, NETWORK_ERROR } from '@/api/errors';

const MAX_GET_RETRIES = 2;
const DEFAULT_STALE_MS = 30_000;

/** GET은 네트워크 오류·5xx에 한해 최대 2회 다시 시도한다. POST는 다시 시도하지 않는다 (TRD 17-2). */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_GET_RETRIES) return false;
  if (!isApiError(error)) return false;
  return error.code === NETWORK_ERROR || error.status >= 500;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: DEFAULT_STALE_MS, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}
