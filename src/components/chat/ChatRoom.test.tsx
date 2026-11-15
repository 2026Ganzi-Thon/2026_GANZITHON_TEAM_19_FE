import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { JoinResult, RealtimeEventMap, RealtimeEventType } from '@/lib/realtime';
import { useAuthStore } from '@/stores/authStore';
import { useCrisisStore } from '@/stores/crisisStore';

import { ChatRoom } from './ChatRoom';

const realtime = vi.hoisted(() => ({
  request: vi.fn(),
  publish: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  listeners: new Map<string, (data: unknown) => void>(),
}));

vi.mock('@/lib/realtime', () => ({
  REALTIME_OFFLINE: 'NETWORK_ERROR',
  REALTIME_TIMEOUT: 'TIMEOUT',
  request: realtime.request,
  publish: realtime.publish,
  joinRoom: realtime.joinRoom,
  leaveRoom: realtime.leaveRoom,
  onEvent: (type: string, handler: (data: unknown) => void) => {
    realtime.listeners.set(type, handler);
    return () => realtime.listeners.delete(type);
  },
  subscribeConnection: () => () => undefined,
  isRealtimeConnected: () => true,
}));
vi.mock('@/api/endpoints/messages', () => ({ listMessages: () => Promise.resolve([]) }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

const SESSION_ID = 's1';

function emit<Type extends RealtimeEventType>(type: Type, data: RealtimeEventMap[Type]) {
  act(() => realtime.listeners.get(type)?.(data));
}

async function renderRoom(callbacks: { onEnded?: () => void } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ChatRoom
        sessionId={SESSION_ID}
        role="client"
        peerName="하늘"
        serviceLabel="마음 코칭"
        {...callbacks}
      />
    </QueryClientProvider>,
  );
  await screen.findByRole('log');
  return screen.getByLabelText<HTMLTextAreaElement>('메시지');
}

function type(input: HTMLTextAreaElement, text: string) {
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

describe('ChatRoom', () => {
  beforeEach(() => {
    realtime.request.mockReset();
    realtime.listeners.clear();
    realtime.joinRoom.mockImplementation(
      (_sessionId: string, _afterId: unknown, onJoin: (result: JoinResult) => void) =>
        onJoin({ ok: true }),
    );
    useAuthStore.setState({ me: { id: 'me', role: 'client', status: 'active' } });
  });

  afterEach(() => {
    act(() => useCrisisStore.getState().dismissRisk());
  });

  it('shows my message at once and confirms it when the server acknowledges', async () => {
    let acknowledge: (reply: unknown) => void = () => undefined;
    realtime.request.mockReturnValue(new Promise((resolve) => (acknowledge = resolve)));
    const input = await renderRoom();

    type(input, '요즘 잠을 못 자요');

    // 목록은 Query 캐시 알림을 거쳐 그려지므로 한 박자 기다린다
    expect(await screen.findByText('요즘 잠을 못 자요')).toBeVisible();
    expect(screen.getByText('전송 중')).toBeVisible();
    expect(realtime.request).toHaveBeenCalledWith(
      'message.send',
      expect.objectContaining({ session_id: SESSION_ID, body: '요즘 잠을 못 자요' }),
    );

    await act(async () =>
      acknowledge({ message: { id: '0001', created_at: '2026-11-03T10:00:00Z' } }),
    );

    await waitFor(() => expect(screen.queryByText('전송 중')).not.toBeInTheDocument());
    expect(screen.getByText('19:00')).toBeVisible();
  });

  it('offers a resend with the same client message id when sending fails', async () => {
    realtime.request.mockRejectedValueOnce(new Error('TIMEOUT'));
    realtime.request.mockResolvedValueOnce({
      message: { id: '0001', created_at: '2026-11-03T10:00:00Z' },
    });
    const input = await renderRoom();

    type(input, '들리세요?');
    const resend = await screen.findByRole('button', { name: /재전송/ });
    expect(screen.getByText('전송하지 못했어요')).toBeVisible();

    fireEvent.click(resend);

    await waitFor(() => expect(screen.queryByText('전송하지 못했어요')).not.toBeInTheDocument());
    const [first, second] = realtime.request.mock.calls;
    expect(second?.[1]).toMatchObject({ client_msg_id: first?.[1].client_msg_id });
    expect(screen.getAllByText('들리세요?')).toHaveLength(1);
  });

  it('adds a message from the counselor and shows that they are typing', async () => {
    await renderRoom();

    emit('typing', { session_id: SESSION_ID, is_typing: true });
    expect(screen.getByText('하늘님이 입력 중 ···')).toBeVisible();

    emit('message:new', {
      id: '0002',
      session_id: SESSION_ID,
      sender_role: 'trainee',
      body: '천천히 이야기해 주세요.',
      created_at: '2026-11-03T10:01:00Z',
    });

    expect(screen.getByText('천천히 이야기해 주세요.')).toBeVisible();
    expect(screen.queryByText('하늘님이 입력 중 ···')).not.toBeInTheDocument();
  });

  it('ignores events that belong to another room', async () => {
    await renderRoom();

    emit('message:new', {
      id: '0003',
      session_id: 'other',
      sender_role: 'trainee',
      body: '다른 방 메시지',
      created_at: '2026-11-03T10:01:00Z',
    });

    expect(screen.queryByText('다른 방 메시지')).not.toBeInTheDocument();
  });

  it('shows the crisis banner with a call link and keeps the room open', async () => {
    const input = await renderRoom();

    act(() => useCrisisStore.getState().noteRisk(SESSION_ID, 'high'));

    expect(screen.getByRole('alert')).toHaveTextContent('지금 바로 도움을 받을 수 있어요');
    expect(screen.getByRole('link', { name: '109 전화' })).toHaveAttribute('href', 'tel:109');
    expect(input).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('tells the page when the session has ended', async () => {
    const onEnded = vi.fn();
    await renderRoom({ onEnded });

    emit('session:ended', { session_id: SESSION_ID, ended_by: 'provider' });

    expect(onEnded).toHaveBeenCalledOnce();
  });

  it('keeps the input closed until the server lets us into the room', async () => {
    realtime.joinRoom.mockImplementation(() => undefined);

    const input = await renderRoom();

    expect(input).toBeDisabled();
  });
});
