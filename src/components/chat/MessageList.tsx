import { useEffect, useRef, useState } from 'react';

import { ROOM } from '@/copy/client';
import { cx } from '@/lib/cx';
import { formatKSTTime } from '@/lib/date';

import { type ChatMessage, isSystemMessage } from './messages';

// 긴 상담에서도 화면이 느려지지 않게 최근 메시지만 그리고, 이전 메시지는 눌러서 더 본다 (TRD 18-1)
const WINDOW_SIZE = 200;
const BOTTOM_THRESHOLD_PX = 48;

interface MessageListProps {
  messages: readonly ChatMessage[];
  peerName: string;
  onRetry: (clientMsgId: string) => void;
}

interface MessageItemProps {
  message: ChatMessage;
  /** 앞 메시지와 보낸 사람이 다르면 이름을 보여 준다 */
  showSender: boolean;
  peerName: string;
  onRetry: (clientMsgId: string) => void;
}

function MessageItem({ message, showSender, peerName, onRetry }: MessageItemProps) {
  if (isSystemMessage(message)) {
    return (
      <li className="whitespace-pre-wrap rounded-sm bg-highlight px-4 py-3 text-caption text-fg">
        {message.body}
      </li>
    );
  }

  const clientMsgId = message.clientMsgId;

  return (
    <li className={cx('flex flex-col gap-1.5', message.mine ? 'items-end' : 'items-start')}>
      {showSender && (
        <span className="pt-3 text-micro font-medium text-fg-muted">
          {message.mine ? ROOM.me : peerName}
        </span>
      )}
      {/* 사용자 입력은 평문으로만 그린다. 링크로 바꾸지 않는다 (TRD 18-5) */}
      <p className="max-w-4/5 whitespace-pre-wrap break-words rounded-sm bg-field px-4 py-3.5 text-body-sm text-fg">
        {message.body}
      </p>
      <span className="flex items-center gap-2 text-micro text-fg-muted">
        {message.status === 'sent' && message.createdAt && formatKSTTime(message.createdAt)}
        {message.status === 'sending' && ROOM.sending}
        {message.status === 'failed' && (
          <>
            <span className="text-danger">{ROOM.failed}</span>
            {clientMsgId && (
              <button
                type="button"
                onClick={() => onRetry(clientMsgId)}
                className="relative font-bold text-fg underline after:absolute after:-inset-3"
              >
                <span aria-hidden="true">↻ </span>
                {ROOM.retry}
              </button>
            )}
          </>
        )}
      </span>
    </li>
  );
}

/** 메시지 목록. 새 메시지가 오면 아래에 붙어 있고, 위로 올려 보는 중이면 '새 메시지' 버튼을 띄운다. */
export function MessageList({ messages, peerName, onRetry }: MessageListProps) {
  const container = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);
  const [seenId, setSeenId] = useState<string | undefined>(undefined);
  const [visibleCount, setVisibleCount] = useState(WINDOW_SIZE);

  const last = messages.at(-1);
  const lastId = last?.id;
  const lastIsMine = last?.mine ?? false;
  const visible = messages.slice(-visibleCount);
  const hasNew = !pinned && lastId !== undefined && lastId !== seenId;

  function scrollToBottom() {
    const element = container.current;
    if (element) element.scrollTop = element.scrollHeight;
  }

  function onScroll() {
    const element = container.current;
    if (!element) return;
    const nearBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight < BOTTOM_THRESHOLD_PX;
    if (nearBottom || pinned) setSeenId(lastId);
    setPinned(nearBottom);
  }

  useEffect(() => {
    // 맨 아래를 보고 있었거나 내가 보낸 메시지면 아래로 따라간다
    if (pinned || lastIsMine) scrollToBottom();
    // 새 메시지가 왔을 때만 따라간다. 위로 올려 보는 동작(pinned 변화)에는 반응하지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId, lastIsMine, messages.length]);

  useEffect(() => {
    // 모바일 키보드가 올라와 보이는 영역이 줄면 마지막 메시지가 가려지지 않게 한다 (TRD 18-4)
    const viewport = window.visualViewport;
    if (!viewport) return;
    const follow = () => {
      if (pinned) scrollToBottom();
    };
    viewport.addEventListener('resize', follow);
    return () => viewport.removeEventListener('resize', follow);
  }, [pinned]);

  return (
    <div className="relative flex min-h-0 grow flex-col">
      <div
        ref={container}
        role="log"
        aria-live="polite"
        aria-label={ROOM.listLabel}
        onScroll={onScroll}
        className="min-h-0 grow overflow-y-auto overscroll-contain py-4"
      >
        {messages.length > visible.length && (
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + WINDOW_SIZE)}
            className="mx-auto flex min-h-(--size-touch) items-center text-caption text-fg-muted underline"
          >
            {ROOM.olderMessages}
          </button>
        )}
        <ul className="flex flex-col gap-2">
          {visible.map((message, index) => (
            <MessageItem
              key={message.clientMsgId ?? message.id}
              message={message}
              showSender={visible[index - 1]?.mine !== message.mine}
              peerName={peerName}
              onRetry={onRetry}
            />
          ))}
        </ul>
      </div>
      {hasNew && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-3 left-1/2 min-h-(--size-touch) -translate-x-1/2 rounded-full bg-action px-4 text-caption font-bold text-fg-inverse"
        >
          {ROOM.newMessage}
        </button>
      )}
    </div>
  );
}
