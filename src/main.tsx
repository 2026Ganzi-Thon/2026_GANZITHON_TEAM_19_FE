import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import { router } from '@/app/router';
import { flushEventsOnLeave } from '@/lib/analytics';
import { createQueryClient } from '@/lib/queryClient';
import { startAuthSync } from '@/lib/session';
import '@/styles/index.css';

async function enableMocking(): Promise<void> {
  // 빌드 때 값이 정해지는 조건이라 운영 빌드에는 목 코드가 들어가지 않는다
  if (import.meta.env.VITE_API_MOCK !== '1') return;
  const { worker } = await import('@/mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
}

const queryClient = createQueryClient();
const container = document.getElementById('root');

async function start(): Promise<void> {
  if (!container) return;
  await enableMocking();
  void startAuthSync(queryClient);
  window.addEventListener('pagehide', flushEventsOnLeave);

  createRoot(container).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}

void start();
