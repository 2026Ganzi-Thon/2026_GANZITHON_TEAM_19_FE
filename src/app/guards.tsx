import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useMatches } from 'react-router';

import type { Role } from '@/api/types';
import { ErrorState } from '@/components/ui/ErrorState';
import { errorCopy } from '@/copy/errorMessages';
import { COMMON } from '@/copy/fixed';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/stores/uiStore';

import { type AccessScope, canAccess, loginPath, roleHome } from './access';
import { PageLoader } from './PageLoader';

export interface RouteHandle {
  /** 계정 상태별 접근 범위. 기본은 full */
  scope?: AccessScope;
  /** 모바일 하단 탭을 보일지 */
  tabs?: boolean;
}

interface RequireAuthProps {
  /** 온보딩 화면처럼 가입 전 사용자가 들어오는 곳이면 true */
  onboarding?: boolean;
}

/** 라우트 가드 1단: 로그인 (TRD 11장). 막히면 로그인 화면으로 보내고 돌아올 경로를 남긴다. */
export function RequireAuth({ onboarding = false }: RequireAuthProps) {
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);
  const role = useAuthStore((state) => state.me?.role);
  const location = useLocation();

  if (status === 'loading') {
    if (!error) return <PageLoader />;
    return (
      <ErrorState
        title={COMMON.serverErrorTitle}
        description={errorCopy(error.code).message}
        requestId={error.requestId}
        onRetry={() => window.location.reload()}
      />
    );
  }
  if (status === 'signedOut') {
    return <Navigate to={loginPath(`${location.pathname}${location.search}`)} replace />;
  }
  if (status === 'unregistered') {
    return onboarding ? <Outlet /> : <Navigate to="/onboarding" replace />;
  }
  if (onboarding) return <Navigate to={roleHome(role)} replace />;
  return <Outlet />;
}

/** 라우트 가드 2단: 역할. 다른 역할의 경로는 역할 홈으로 보낸다. */
export function RequireRole({ role }: { role: Role }) {
  const currentRole = useAuthStore((state) => state.me?.role);
  const allowed = currentRole === role;

  useEffect(() => {
    if (!allowed) showToast(errorCopy('FORBIDDEN_ROLE').message, 'error');
  }, [allowed]);

  return allowed ? <Outlet /> : <Navigate to={roleHome(currentRole)} replace />;
}

/** 라우트 가드 3단: 계정 상태. 막히면 A-04 상태 안내로 보낸다. */
export function RequireStatus() {
  const status = useAuthStore((state) => state.me?.status);
  const matches = useMatches();
  const scope =
    matches
      .map((match) => (match.handle as RouteHandle | undefined)?.scope)
      .filter(Boolean)
      .pop() ?? 'full';

  return canAccess(status, scope) ? <Outlet /> : <Navigate to="/status" replace />;
}
