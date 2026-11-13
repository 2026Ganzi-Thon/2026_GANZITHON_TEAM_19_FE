import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCrisisStore } from '@/stores/crisisStore';

import { AUTO_LOCK_MS, CrisisModal } from './CrisisModal';

vi.mock('@/api/endpoints/public', () => ({
  getCrisisContacts: () => Promise.reject(new Error('offline')),
}));

function renderModal() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CrisisModal />
    </QueryClientProvider>,
  );
}

describe('CrisisModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => useCrisisStore.getState().close());
    vi.useRealTimers();
  });

  it('shows the built-in contacts as phone links even when the server cannot be reached', () => {
    renderModal();

    act(() => useCrisisStore.getState().show({ source: 'manual' }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /109/ })).toHaveAttribute('href', 'tel:109');
    expect(screen.getAllByRole('link')).toHaveLength(4);
  });

  it('can be closed right away when the user opened it', () => {
    renderModal();
    act(() => useCrisisStore.getState().show({ source: 'manual' }));

    expect(screen.getByRole('button', { name: '닫기' })).toBeEnabled();
  });

  it('keeps the close button disabled for three seconds when it opened automatically', () => {
    renderModal();
    act(() =>
      useCrisisStore.getState().show({ source: 'auto', level: 'critical', sessionId: 's1' }),
    );

    const closeButton = screen.getByRole('button', { name: '상담 계속하기' });
    expect(closeButton).toBeDisabled();

    act(() => vi.advanceTimersByTime(AUTO_LOCK_MS - 500));
    expect(closeButton).toBeDisabled();

    act(() => vi.advanceTimersByTime(700));
    expect(closeButton).toBeEnabled();
  });
});
