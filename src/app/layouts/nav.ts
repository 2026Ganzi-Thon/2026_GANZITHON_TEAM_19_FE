import type { Role } from '@/api/types';
import type { NavItem } from '@/components/layout/NavItems';
import { NAV } from '@/copy/fixed';

const ACCOUNT_ITEMS: readonly NavItem[] = [
  { to: '/notifications', label: NAV.notifications },
  { to: '/settings', label: NAV.settings },
];

const ROLE_ITEMS: Record<Role, readonly NavItem[]> = {
  client: [
    { to: '/c', label: NAV.home, end: true },
    { to: '/c/sessions', label: NAV.client.sessions },
  ],
  trainee: [
    { to: '/t', label: NAV.home, end: true },
    { to: '/t/sessions', label: NAV.trainee.sessions },
    { to: '/t/supervisions', label: NAV.trainee.supervisions },
  ],
  expert: [
    { to: '/e', label: NAV.home, end: true },
    { to: '/e/referrals', label: NAV.expert.referrals },
    { to: '/e/supervisions', label: NAV.expert.supervisions },
  ],
  // 어드민은 하단 탭 대신 자체 메뉴를 쓴다
  admin: [],
};

/** 역할별 하단 탭 항목. 알림과 내 정보는 모든 역할이 같이 쓴다 */
export function navItems(role: Role | undefined, unreadCount = 0): NavItem[] {
  if (!role || role === 'admin') return [];
  return [
    ...ROLE_ITEMS[role],
    ...ACCOUNT_ITEMS.map((item) =>
      item.to === '/notifications' ? { ...item, badge: unreadCount } : item,
    ),
  ];
}
