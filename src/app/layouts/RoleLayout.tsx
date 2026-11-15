import { Navigate, Outlet, useMatches } from 'react-router';

import type { RouteHandle } from '@/app/guards';
import { TabBar } from '@/components/layout/NavItems';
import { SERVICE } from '@/copy/fixed';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { useAuthStore } from '@/stores/authStore';

import { navItems } from './nav';

const BLOCKED_STATUSES = ['banned', 'withdrawn'];

/**
 * 내담자·수련생·전문가 화면의 틀. 웹앱 틀(AppFrame) 안에서 화면과 역할별 하단 탭을 쌓는다.
 * 설정·알림함처럼 모든 역할이 쓰는 화면도 이 틀을 쓴다.
 */
export function RoleLayout() {
  const role = useAuthStore((state) => state.me?.role);
  const status = useAuthStore((state) => state.me?.status);
  const unreadCount = useUnreadCount();
  const matches = useMatches();
  const showTabs = matches.some((match) => (match.handle as RouteHandle | undefined)?.tabs);
  const items = navItems(role, unreadCount);

  // 퇴출·탈퇴 계정은 상태 안내만 볼 수 있다 (TRD 11-1)
  if (status && BLOCKED_STATUSES.includes(status)) return <Navigate to="/status" replace />;

  return (
    <div className="flex min-w-0 grow flex-col">
      <Outlet />
      {showTabs && items.length > 0 && <TabBar items={items} label={SERVICE.name} />}
    </div>
  );
}
