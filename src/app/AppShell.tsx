import { useQueryClient } from '@tanstack/react-query';
import { Suspense, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';

import { onApiError } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { CrisisModal } from '@/components/crisis/CrisisModal';
import { EnvBadge } from '@/components/layout/EnvBadge';
import { MaintenanceScreen } from '@/components/layout/MaintenanceScreen';
import { StatusBanners } from '@/components/layout/StatusBanners';
import { Toaster } from '@/components/ui/Toaster';
import { useAppConfig } from '@/hooks/useAppConfig';
import { authClient } from '@/lib/auth';
import { refreshSession } from '@/lib/session';
import { useAuthStore } from '@/stores/authStore';

import { PageLoader } from './PageLoader';

const ACCOUNT_STATE_CODES = [
  'ACCOUNT_PENDING',
  'ACCOUNT_REJECTED',
  'ACCOUNT_SUSPENDED',
  'ACCOUNT_BANNED',
  'CLIENT_RESTRICTED',
];

/** 공통 예외 처리 (TRD 18-2): 점검 모드, 계정 상태 제한, 토큰 만료. */
function useGlobalApiErrors(): void {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(
    () =>
      onApiError((error) => {
        if (error.code === 'MAINTENANCE') {
          void queryClient.invalidateQueries({ queryKey: queryKeys.appConfig });
        } else if (ACCOUNT_STATE_CODES.includes(error.code)) {
          void refreshSession(queryClient).then(() => navigate('/status'));
        } else if (error.code === 'UNAUTHENTICATED' && useAuthStore.getState().status === 'ready') {
          // 토큰을 갱신하고 다시 불러도 401 이면 로그아웃시킨다
          void authClient().signOut();
        }
      }),
    [queryClient, navigate],
  );
}

/** 모든 화면을 감싸는 틀: 환경 배지, 상단 배너, 점검 화면, 토스트, 위기 안내. */
export function AppShell() {
  useGlobalApiErrors();
  const { data: config } = useAppConfig();
  const role = useAuthStore((state) => state.me?.role);
  const { pathname } = useLocation();

  // 어드민은 점검 중에도 접속할 수 있다. 로그인 화면은 어드민이 들어올 수 있게 열어 둔다 (TRD 17-8)
  const maintenance = config?.maintenance?.on === true && role !== 'admin' && pathname !== '/login';

  return (
    <>
      <EnvBadge />
      <StatusBanners />
      {maintenance ? (
        <MaintenanceScreen
          message={config?.maintenance?.message}
          until={config?.maintenance?.until}
        />
      ) : (
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      )}
      <Toaster />
      <CrisisModal />
    </>
  );
}
