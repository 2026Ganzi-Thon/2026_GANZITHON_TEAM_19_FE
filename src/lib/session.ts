import type { QueryClient } from '@tanstack/react-query';

import { getMe } from '@/api/endpoints/me';
import { toApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { useAuthStore } from '@/stores/authStore';

import { type AuthUser, initAuth } from './auth';

let latestSync = 0;

async function syncSession(queryClient: QueryClient, user: AuthUser | null): Promise<void> {
  const sync = ++latestSync;
  const store = useAuthStore.getState();

  if (!user) {
    queryClient.clear();
    store.setSignedOut();
    return;
  }

  try {
    const me = await queryClient.fetchQuery({
      queryKey: queryKeys.me,
      queryFn: getMe,
      staleTime: 0,
    });
    if (sync === latestSync) store.setReady(user, me);
  } catch (error) {
    if (sync !== latestSync) return;
    const apiError = toApiError(error);
    if (apiError.code === 'USER_NOT_REGISTERED') store.setUnregistered(user);
    else store.setFailed(user, apiError);
  }
}

/** 토큰이 바뀔 때마다 /me 를 다시 받아 인증 상태를 맞춘다 (TRD 17-1). 구독 해제 함수를 돌려준다. */
export async function startAuthSync(queryClient: QueryClient): Promise<() => void> {
  const client = await initAuth();
  return client.onIdTokenChanged((user) => {
    void syncSession(queryClient, user);
  });
}

/** 가입·닉네임 변경·상태 변경 알림 뒤에 내 정보를 다시 받는다. */
export async function refreshSession(queryClient: QueryClient): Promise<void> {
  const client = await initAuth();
  await syncSession(queryClient, client.getUser());
}
