import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';

import { listComplaints, listCredentialQueue, listRiskEvents } from '@/api/endpoints/admin';
import { queryKeys } from '@/api/queryKeys';
import { ADMIN } from '@/copy/admin';
import { EXPERT_REFERRAL } from '@/copy/expertReferral';
import { COMMON } from '@/copy/fixed';
import { useFeatureFlag } from '@/hooks/useAppConfig';
import { authClient } from '@/lib/auth';
import { beep, unlockBeep } from '@/lib/beep';
import { cx } from '@/lib/cx';
import { onEvent } from '@/lib/realtime';

const BADGE_STALE_MS = 15_000;

interface MenuItem {
  to: string;
  label: string;
  end?: boolean;
  badge?: number;
}

interface RiskAlert {
  id: string;
  level: 'high' | 'critical';
}

/**
 * 어드민 화면의 틀 (TRD 16장): 좌측 사이드바 + 본문. 1024px 미만에서는 안내만 보여 준다.
 * 어느 화면에 있든 높은 수준의 위기 경고(risk:new)를 우상단에 띄운다.
 */
export function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const complaintsEnabled = useFeatureFlag('p1_complaints');
  const [alert, setAlert] = useState<RiskAlert | null>(null);

  const risks = useQuery({
    queryKey: queryKeys.admin('risks', { status: 'open' }),
    queryFn: () => listRiskEvents({ status: 'open' }),
    staleTime: BADGE_STALE_MS,
  });
  const credentials = useQuery({
    queryKey: queryKeys.admin('credentials', {}),
    queryFn: () => listCredentialQueue({}),
    staleTime: BADGE_STALE_MS,
  });
  const complaints = useQuery({
    queryKey: queryKeys.admin('complaints', { status: 'received' }),
    queryFn: () => listComplaints({ status: 'received' }),
    enabled: complaintsEnabled,
    staleTime: BADGE_STALE_MS,
  });

  // 알림음은 사용자가 화면을 한 번 누른 뒤부터 낼 수 있다
  useEffect(() => {
    window.addEventListener('pointerdown', unlockBeep, { once: true });
    return () => window.removeEventListener('pointerdown', unlockBeep);
  }, []);

  useEffect(
    () =>
      onEvent('risk:new', (event) => {
        void queryClient.invalidateQueries({ queryKey: ['admin', 'risks'] });
        if (event.level !== 'high' && event.level !== 'critical') return;
        setAlert({ id: event.risk_event_id, level: event.level });
        beep();
      }),
    [queryClient],
  );

  // 사이드바 순서는 TRD 16장 공통 레이아웃을 따른다
  const menu: MenuItem[] = [
    { to: '/admin/risks', label: ADMIN.menu.risks, badge: risks.data?.length },
    {
      to: '/admin/credentials',
      label: ADMIN.menu.credentials,
      badge: credentials.data?.items?.length,
    },
    ...(complaintsEnabled
      ? [
          { to: '/admin/complaints', label: ADMIN.menu.complaints, badge: complaints.data?.length },
          { to: '/admin/strikes', label: ADMIN.menu.strikes },
        ]
      : []),
    { to: '/admin', label: ADMIN.menu.kpi, end: true },
    { to: '/admin/users', label: ADMIN.menu.users },
    { to: '/admin/settlements', label: ADMIN.menu.settlements },
    { to: '/admin/settings', label: ADMIN.menu.settings },
  ];

  return (
    <>
      <p className="flex min-h-dvh items-center justify-center px-6 text-center text-body font-bold text-fg lg:hidden">
        {COMMON.desktopOnly}
      </p>
      <div className="hidden min-h-dvh lg:flex">
        <nav
          aria-label={ADMIN.menuLabel}
          className="sticky top-0 flex h-dvh w-(--size-sidebar) shrink-0 flex-col gap-1 border-r border-line px-4 py-8"
        >
          <p className="px-3 pb-6 text-subheading font-bold text-fg">{ADMIN.brand}</p>
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'flex min-h-(--size-touch) items-center justify-between gap-2 rounded-sm px-3 text-body',
                  isActive ? 'bg-brand-yellow font-bold text-fg' : 'text-fg-muted hover:bg-field',
                )
              }
            >
              {item.label}
              {item.badge ? (
                <span className="rounded-full bg-danger px-2 text-micro font-bold text-fg-inverse">
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => void authClient().signOut()}
            className="mt-auto min-h-(--size-touch) px-3 text-left text-body-sm text-fg-muted underline"
          >
            {COMMON.logout}
          </button>
        </nav>
        <main className="min-w-0 grow px-10 py-8">
          <Outlet />
        </main>
      </div>

      {alert && (
        <div
          role="alert"
          className="fixed right-6 top-6 z-50 flex items-center gap-4 rounded-md border border-danger bg-danger-bg px-4 py-3 text-body-sm text-danger"
        >
          <span className="font-bold">
            {ADMIN.riskAlert(EXPERT_REFERRAL.riskLevel[alert.level])}
          </span>
          <button
            type="button"
            onClick={() => {
              navigate(`/admin/risks?id=${encodeURIComponent(alert.id)}`);
              setAlert(null);
            }}
            className="min-h-(--size-touch) font-bold underline"
          >
            {ADMIN.riskAlertOpen}
          </button>
          <button type="button" onClick={() => setAlert(null)} className="min-h-(--size-touch)">
            {ADMIN.close}
          </button>
        </div>
      )}
    </>
  );
}
