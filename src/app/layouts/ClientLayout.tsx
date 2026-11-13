import { Outlet, useMatches } from 'react-router';

import type { RouteHandle } from '@/app/guards';
import { type NavItem, SideNav, TabBar } from '@/components/layout/NavItems';
import { NAV, SERVICE } from '@/copy/fixed';

const ITEMS: readonly NavItem[] = [
  { to: '/c', label: NAV.client.home, end: true },
  { to: '/c/sessions', label: NAV.client.sessions },
  { to: '/notifications', label: NAV.client.notifications },
  { to: '/settings', label: NAV.client.settings },
];

/** 내담자 화면의 틀: 모바일 하단 탭, 1024px 이상 좌측 사이드바 (TRD 11-1). */
export function ClientLayout() {
  const matches = useMatches();
  const showTabs = matches.some((match) => (match.handle as RouteHandle | undefined)?.tabs);

  return (
    <div className="flex min-h-dvh">
      <SideNav items={ITEMS} label={SERVICE.name} brand={SERVICE.name} />
      <div className="flex min-w-0 grow flex-col">
        <Outlet />
        {showTabs && <TabBar items={ITEMS} label={SERVICE.name} />}
      </div>
    </div>
  );
}
