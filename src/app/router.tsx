import type { ComponentType } from 'react';
import { createBrowserRouter } from 'react-router';

import { AppShell } from './AppShell';
import { NotFoundPage, RouteErrorPage } from './ErrorPages';
import { RequireAuth, RequireRole, RequireStatus, type RouteHandle } from './guards';
import { AdminLayout } from './layouts/AdminLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { RoleLayout } from './layouts/RoleLayout';

/** 화면을 라우트 단위로 나눠 받는다 (TRD 10-3 코드 분할). */
function page<Module extends Record<Name, ComponentType>, Name extends string>(
  load: () => Promise<Module>,
  name: Name,
) {
  return async () => ({ Component: (await load())[name] });
}

const handle = (value: RouteHandle) => value;

// 화면 목록은 TRD 11-2 를 따른다. 아직 구현하지 않은 화면은 404 로 떨어진다.
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          {
            path: '/',
            lazy: page(() => import('@/features/auth/A01LandingPage'), 'A01LandingPage'),
          },
          {
            path: '/login',
            lazy: page(() => import('@/features/auth/A02LoginPage'), 'A02LoginPage'),
          },
          {
            path: '/verify/:code',
            lazy: page(() => import('@/features/auth/A06VerifyPage'), 'A06VerifyPage'),
          },
          {
            element: <RequireAuth onboarding />,
            children: [
              {
                path: '/onboarding',
                lazy: page(() => import('@/features/auth/A03OnboardingPage'), 'A03OnboardingPage'),
              },
            ],
          },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: '/status',
            lazy: page(() => import('@/features/auth/A04StatusPage'), 'A04StatusPage'),
            handle: handle({ scope: 'status' }),
          },
          {
            element: <RoleLayout />,
            children: [
              {
                path: '/settings',
                lazy: page(() => import('@/features/auth/A05SettingsPage'), 'A05SettingsPage'),
                handle: handle({ tabs: true }),
              },
              {
                path: '/notifications',
                lazy: page(
                  () => import('@/features/auth/A05NotificationsPage'),
                  'A05NotificationsPage',
                ),
                handle: handle({ tabs: true }),
              },
            ],
          },
          {
            element: <RequireRole role="client" />,
            children: [
              {
                element: <RequireStatus />,
                children: [
                  {
                    element: <RoleLayout />,
                    children: [
                      {
                        path: '/c',
                        lazy: page(() => import('@/features/client/C01HomePage'), 'C01HomePage'),
                        handle: handle({ tabs: true }),
                      },
                      {
                        path: '/c/intake',
                        lazy: page(
                          () => import('@/features/client/C02IntakeCategoryPage'),
                          'C02IntakeCategoryPage',
                        ),
                      },
                      {
                        path: '/c/intake/write',
                        lazy: page(
                          () => import('@/features/client/C03IntakeWritePage'),
                          'C03IntakeWritePage',
                        ),
                      },
                      {
                        path: '/c/intake/:intakeId/matches',
                        lazy: page(
                          () => import('@/features/client/C04MatchesPage'),
                          'C04MatchesPage',
                        ),
                      },
                      {
                        path: '/c/providers/:providerId',
                        lazy: page(
                          () => import('@/features/client/C05ProviderPage'),
                          'C05ProviderPage',
                        ),
                      },
                      {
                        path: '/c/checkout/:sessionId',
                        lazy: page(
                          () => import('@/features/client/C06CheckoutPage'),
                          'C06CheckoutPage',
                        ),
                      },
                      {
                        path: '/c/sessions',
                        lazy: page(
                          () => import('@/features/client/C07SessionsPage'),
                          'C07SessionsPage',
                        ),
                        handle: handle({ tabs: true }),
                      },
                      {
                        path: '/c/sessions/:id/lobby',
                        lazy: page(() => import('@/features/client/C08LobbyPage'), 'C08LobbyPage'),
                      },
                      {
                        path: '/c/sessions/:id/room',
                        lazy: page(() => import('@/features/client/C09RoomPage'), 'C09RoomPage'),
                      },
                      {
                        path: '/c/sessions/:id/done',
                        lazy: page(() => import('@/features/client/C10DonePage'), 'C10DonePage'),
                      },
                      {
                        path: '/c/sessions/:id/complaint',
                        lazy: page(
                          () => import('@/features/client/C13ComplaintPage'),
                          'C13ComplaintPage',
                        ),
                      },
                      {
                        path: '/c/reports/:reportId',
                        lazy: page(
                          () => import('@/features/client/C11ReportPage'),
                          'C11ReportPage',
                        ),
                      },
                      {
                        path: '/c/referrals/:referralId',
                        lazy: page(
                          () => import('@/features/client/C12ReferralPage'),
                          'C12ReferralPage',
                        ),
                      },
                      {
                        path: '/c/consents',
                        lazy: page(
                          () => import('@/features/client/C14ConsentsPage'),
                          'C14ConsentsPage',
                        ),
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <RequireRole role="trainee" />,
            children: [
              {
                element: <RequireStatus />,
                children: [
                  {
                    element: <RoleLayout />,
                    children: [
                      {
                        path: '/t/profile',
                        lazy: page(
                          () => import('@/features/trainee/T01ProfilePage'),
                          'T01ProfilePage',
                        ),
                        handle: handle({ scope: 'profile' }),
                      },
                      {
                        path: '/t/credentials',
                        lazy: page(
                          () => import('@/features/trainee/T02CredentialsPage'),
                          'T02CredentialsPage',
                        ),
                        handle: handle({ scope: 'profile' }),
                      },
                      {
                        path: '/t',
                        lazy: page(
                          () => import('@/features/trainee/T03DashboardPage'),
                          'T03DashboardPage',
                        ),
                        handle: handle({ scope: 'readonly', tabs: true }),
                      },
                      {
                        path: '/t/availability',
                        lazy: page(
                          () => import('@/features/trainee/T04AvailabilityPage'),
                          'T04AvailabilityPage',
                        ),
                      },
                      {
                        path: '/t/sessions',
                        lazy: page(
                          () => import('@/features/trainee/T05SessionsPage'),
                          'T05SessionsPage',
                        ),
                        handle: handle({ scope: 'readonly', tabs: true }),
                      },
                      {
                        path: '/t/sessions/:id/room',
                        lazy: page(() => import('@/features/trainee/T06RoomPage'), 'T06RoomPage'),
                      },
                      {
                        path: '/t/supervisions',
                        lazy: page(
                          () => import('@/features/trainee/T07SupervisionsPage'),
                          'T07SupervisionsPage',
                        ),
                        handle: handle({ scope: 'readonly', tabs: true }),
                      },
                      {
                        path: '/t/supervisions/:id',
                        lazy: page(
                          () => import('@/features/trainee/T07SupervisionDetailPage'),
                          'T07SupervisionDetailPage',
                        ),
                        handle: handle({ scope: 'readonly' }),
                      },
                      {
                        path: '/t/growth',
                        lazy: page(
                          () => import('@/features/trainee/T08GrowthPage'),
                          'T08GrowthPage',
                        ),
                        handle: handle({ scope: 'readonly' }),
                      },
                      {
                        path: '/t/supervision-requests',
                        lazy: page(
                          () => import('@/features/trainee/T09SupervisionRequestsPage'),
                          'T09SupervisionRequestsPage',
                        ),
                      },
                      {
                        path: '/t/settlements',
                        lazy: page(
                          () => import('@/features/trainee/T10SettlementsPage'),
                          'T10SettlementsPage',
                        ),
                        handle: handle({ scope: 'readonly' }),
                      },
                      // TRAINEE_ROUTES
                    ],
                  },
                ],
              },
            ],
          },
          {
            element: <RequireRole role="expert" />,
            children: [
              {
                element: <RequireStatus />,
                children: [
                  {
                    element: <RoleLayout />,
                    children: [
                      {
                        path: '/e/profile',
                        lazy: page(
                          () => import('@/features/expert/E01ProfilePage'),
                          'E01ProfilePage',
                        ),
                        handle: handle({ scope: 'profile' }),
                      },
                      {
                        path: '/e/credentials',
                        lazy: page(
                          () => import('@/features/expert/E02CredentialsPage'),
                          'E02CredentialsPage',
                        ),
                        handle: handle({ scope: 'profile' }),
                      },
                      {
                        path: '/e',
                        lazy: page(
                          () => import('@/features/expert/E03DashboardPage'),
                          'E03DashboardPage',
                        ),
                        handle: handle({ scope: 'readonly', tabs: true }),
                      },
                      {
                        path: '/e/availability',
                        lazy: page(
                          () => import('@/features/expert/E04AvailabilityPage'),
                          'E04AvailabilityPage',
                        ),
                      },
                      {
                        path: '/e/sessions/:id/room',
                        lazy: page(() => import('@/features/expert/E07RoomPage'), 'E07RoomPage'),
                      },
                      {
                        path: '/e/settlements',
                        lazy: page(
                          () => import('@/features/expert/E09SettlementsPage'),
                          'E09SettlementsPage',
                        ),
                        handle: handle({ scope: 'readonly' }),
                      },
                      {
                        path: '/e/supervisions',
                        lazy: page(
                          () => import('@/features/expert/E08SupervisionsPage'),
                          'E08SupervisionsPage',
                        ),
                        handle: handle({ scope: 'readonly', tabs: true }),
                      },
                      {
                        path: '/e/supervisions/:id/write',
                        lazy: page(
                          () => import('@/features/expert/E08SupervisionWritePage'),
                          'E08SupervisionWritePage',
                        ),
                      },
                      {
                        path: '/e/supervision-requests',
                        lazy: page(
                          () => import('@/features/expert/E08SupervisionRequestsPage'),
                          'E08SupervisionRequestsPage',
                        ),
                      },
                      {
                        path: '/e/referrals',
                        lazy: page(
                          () => import('@/features/expert/E05ReferralsPage'),
                          'E05ReferralsPage',
                        ),
                        handle: handle({ tabs: true }),
                      },
                      {
                        path: '/e/reports/:reportId',
                        lazy: page(
                          () => import('@/features/expert/E06ReportPage'),
                          'E06ReportPage',
                        ),
                      },
                      // EXPERT_ROUTES
                    ],
                  },
                ],
              },
            ],
          },
          {
            element: <RequireRole role="admin" />,
            children: [
              {
                element: <AdminLayout />,
                children: [
                  {
                    path: '/admin',
                    lazy: page(() => import('@/features/admin/M01KpiPage'), 'M01KpiPage'),
                  },
                  {
                    path: '/admin/credentials',
                    lazy: page(
                      () => import('@/features/admin/M02CredentialQueuePage'),
                      'M02CredentialQueuePage',
                    ),
                  },
                  {
                    path: '/admin/credentials/:id',
                    lazy: page(
                      () => import('@/features/admin/M03CredentialDetailPage'),
                      'M03CredentialDetailPage',
                    ),
                  },
                  {
                    path: '/admin/risks',
                    lazy: page(() => import('@/features/admin/M04RisksPage'), 'M04RisksPage'),
                  },
                  {
                    path: '/admin/complaints',
                    lazy: page(
                      () => import('@/features/admin/M05ComplaintsPage'),
                      'M05ComplaintsPage',
                    ),
                  },
                  {
                    path: '/admin/complaints/:id',
                    lazy: page(
                      () => import('@/features/admin/M06ComplaintDetailPage'),
                      'M06ComplaintDetailPage',
                    ),
                  },
                  {
                    path: '/admin/strikes',
                    lazy: page(() => import('@/features/admin/M07StrikesPage'), 'M07StrikesPage'),
                  },
                  {
                    path: '/admin/users',
                    lazy: page(() => import('@/features/admin/M08UsersPage'), 'M08UsersPage'),
                  },
                  {
                    path: '/admin/settlements',
                    lazy: page(
                      () => import('@/features/admin/M09SettlementsPage'),
                      'M09SettlementsPage',
                    ),
                  },
                  {
                    path: '/admin/settings',
                    lazy: page(() => import('@/features/admin/M10SettingsPage'), 'M10SettingsPage'),
                  },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
