import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { listMessages } from '@/api/endpoints/messages';
import { queryKeys } from '@/api/queryKeys';
import { ROOM } from '@/copy/client';
import { useRealtimeConnected } from '@/hooks/useRealtime';
import { track } from '@/lib/analytics';
import {
  joinRoom,
  leaveRoom,
  onEvent,
  publish,
  REALTIME_OFFLINE,
  REALTIME_TIMEOUT,
  request,
  type SendReply,
} from '@/lib/realtime';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/stores/uiStore';

import {
  type ChatMessage,
  confirmMessage,
  createPending,
  fromRealtime,
  fromRest,
  lastConfirmedId,
  markStatus,
  mergeMessages,
} from './messages';

const TYPING_THROTTLE_MS = 3000;
const TYPING_CLEAR_MS = 5000;
// 연결 문제로 입장이 늦어진 것은 재연결 때 다시 시도하므로 화면을 떠나지 않는다
const TRANSIENT_JOIN_ERRORS = [REALTIME_OFFLINE, REALTIME_TIMEOUT];

export interface ChatRoomCallbacks {
  /** 상담이 끝났다 (session:ended) */
  onEnded?: () => void;
  /** 상담사가 15분 동안 들어오지 않았다 (session:no_show) */
  onNoShow?: () => void;
  /** 서버가 입장을 거절했다 (당사자가 아님, 입장 가능 시각이 아님) */
  onJoinError?: (code: string) => void;
}

/**
 * 상담방 한 곳의 메시지와 실시간 동작 (TRD C-09, 17-4).
 * 기존 메시지는 MSG-01 로 받고, 그 뒤는 실시간 이벤트로 Query 캐시에 바로 더한다.
 */
export function useChatRoom(sessionId: string, callbacks: ChatRoomCallbacks = {}) {
  const queryClient = useQueryClient();
  const myId = useAuthStore((state) => state.me?.id);
  const myRole = useAuthStore((state) => state.me?.role);
  const connected = useRealtimeConnected();
  const [joined, setJoined] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const latestCallbacks = useRef(callbacks);
  const lastTypingAt = useRef(0);
  const joinTracked = useRef(false);

  useEffect(() => {
    latestCallbacks.current = callbacks;
  });

  const query = useQuery({
    queryKey: queryKeys.messages(sessionId),
    queryFn: async () => {
      const fetched = (await listMessages(sessionId))
        .map((message) => fromRest(message, myId))
        .filter((message): message is ChatMessage => message !== null);
      // 불러오는 사이 실시간으로 먼저 온 메시지와 전송 중인 메시지를 잃지 않게 합친다
      const cached = queryClient.getQueryData<ChatMessage[]>(queryKeys.messages(sessionId)) ?? [];
      return mergeMessages(fetched, cached);
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    const key = queryKeys.messages(sessionId);
    const viewer = { id: myId, role: myRole };
    const add = (incoming: ChatMessage[]) =>
      queryClient.setQueryData<ChatMessage[]>(key, (current) =>
        mergeMessages(current ?? [], incoming),
      );

    const unsubscribes = [
      onEvent('message:new', (message) => {
        if (message.session_id !== sessionId) return;
        const chatMessage = fromRealtime(message, viewer);
        add([chatMessage]);
        if (!chatMessage.mine) setPeerTyping(false);
      }),
      onEvent('message:backfill', (data) => {
        if (data.session_id !== sessionId) return;
        add(data.messages.map((message) => fromRealtime(message, viewer)));
      }),
      onEvent('typing', (data) => {
        if (data.session_id === sessionId) setPeerTyping(data.is_typing);
      }),
      onEvent('contact:warning', (data) => {
        if (data.session_id === sessionId) showToast(ROOM.contactWarned, 'error');
      }),
      onEvent('session:ending_soon', (data) => {
        if (data.session_id === sessionId) showToast(ROOM.endingSoon(data.minutes_left));
      }),
      onEvent('session:ended', (data) => {
        if (data.session_id === sessionId) latestCallbacks.current.onEnded?.();
      }),
      onEvent('session:no_show', (data) => {
        if (data.session_id === sessionId) latestCallbacks.current.onNoShow?.();
      }),
    ];

    joinRoom(
      sessionId,
      () => lastConfirmedId(queryClient.getQueryData<ChatMessage[]>(key) ?? []),
      (result) => {
        setJoined(result.ok);
        if (!result.ok) {
          if (!TRANSIENT_JOIN_ERRORS.includes(result.code)) {
            latestCallbacks.current.onJoinError?.(result.code);
          }
          return;
        }
        if (!joinTracked.current) {
          joinTracked.current = true;
          track('session_joined');
        }
      },
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      leaveRoom(sessionId);
    };
  }, [sessionId, myId, myRole, queryClient]);

  useEffect(() => {
    if (!peerTyping) return;
    // 입력 중 해제 이벤트를 놓쳐도 표시가 남지 않게 한다
    const timer = window.setTimeout(() => setPeerTyping(false), TYPING_CLEAR_MS);
    return () => window.clearTimeout(timer);
  }, [peerTyping]);

  const deliver = useCallback(
    async (clientMsgId: string, body: string) => {
      const key = queryKeys.messages(sessionId);
      try {
        const reply = await request<SendReply>('message.send', {
          session_id: sessionId,
          client_msg_id: clientMsgId,
          body,
        });
        queryClient.setQueryData<ChatMessage[]>(key, (current) =>
          confirmMessage(current ?? [], clientMsgId, reply.message),
        );
      } catch {
        // 5초 안에 응답이 없거나 서버가 거절하면 실패로 표시하고 재전송 버튼을 보인다
        queryClient.setQueryData<ChatMessage[]>(key, (current) =>
          markStatus(current ?? [], clientMsgId, 'failed'),
        );
      }
    },
    [queryClient, sessionId],
  );

  /** 임시 ID로 먼저 목록에 더하고, 응답(ack)으로 확정한다 */
  const send = useCallback(
    (body: string) => {
      const clientMsgId = crypto.randomUUID();
      queryClient.setQueryData<ChatMessage[]>(queryKeys.messages(sessionId), (current) => [
        ...(current ?? []),
        createPending(body, clientMsgId, Date.now()),
      ]);
      void deliver(clientMsgId, body);
    },
    [deliver, queryClient, sessionId],
  );

  /** 같은 client_msg_id 로 다시 보낸다. 서버는 한 건만 저장한다 */
  const retry = useCallback(
    (clientMsgId: string) => {
      const key = queryKeys.messages(sessionId);
      const failed = queryClient
        .getQueryData<ChatMessage[]>(key)
        ?.find((message) => message.clientMsgId === clientMsgId);
      if (!failed) return;
      queryClient.setQueryData<ChatMessage[]>(key, (current) =>
        markStatus(current ?? [], clientMsgId, 'sending'),
      );
      void deliver(clientMsgId, failed.body);
    },
    [deliver, queryClient, sessionId],
  );

  /** 입력 중 표시. 3초에 한 번만 보낸다 */
  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingAt.current < TYPING_THROTTLE_MS) return;
    lastTypingAt.current = now;
    publish('typing', { session_id: sessionId, is_typing: true });
  }, [sessionId]);

  return {
    messages: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
    connected,
    joined,
    peerTyping,
    send,
    retry,
    notifyTyping,
  };
}
