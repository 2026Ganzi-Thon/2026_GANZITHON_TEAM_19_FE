import type { ComponentType } from 'react';
import { createBrowserRouter } from 'react-router';

import { AppShell } from './AppShell';
import { NotFoundPage, RouteErrorPage } from './ErrorPages';
import { RequireAuth, RequireRole, RequireStatus, type RouteHandle } from './guards';
import { ClientLayout } from './layouts/ClientLayout';
import { PublicLayout } from './layouts/PublicLayout';

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
            element: <RequireRole role="client" />,
            children: [
              {
                element: <RequireStatus />,
                children: [
                  {
                    element: <ClientLayout />,
                    children: [
                      {
                        path: '/c',
                        lazy: page(() => import('@/features/client/C01HomePage'), 'C01HomePage'),
                        handle: handle({ tabs: true }),
                      },
                    ],
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
