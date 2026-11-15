import { type ReactNode, useState } from 'react';

import type { Role } from '@/api/types';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROOM } from '@/copy/client';
import { COMMON } from '@/copy/fixed';
import { cx } from '@/lib/cx';

import { Composer } from './Composer';
import { MessageList } from './MessageList';
import { RiskBanner } from './RiskBanner';
import { type ChatRoomCallbacks, useChatRoom } from './useChatRoom';

interface ChatRoomProps extends ChatRoomCallbacks {
  sessionId: string;
  /** 보는 사람의 역할. 내담자에게만 위기 배너를 보여 준다 */
  role: Role;
  /** 지난 대화를 읽기만 할 때 */
  readOnly?: boolean;
  peerName: string;
  /** 상태 줄에 보일 서비스 이름 (마음 코칭, 전문 심리상담) */
  serviceLabel: string;
  /** 상담이 끝나는 예정 시각 */
  endsAt?: string;
  /** 입력창 위에 놓는 보조 동작 (예: 상담 나가기) */
  actions?: ReactNode;
  /** key 가 바뀌면 입력창을 text 로 다시 채운다 (위기 대응 문장을 눌렀을 때) */
  prefill?: { key: number; text: string };
  contactWarning?: string;
}

/** 내담자·수련생·전문가가 함께 쓰는 상담방 (TRD C-09). */
export function ChatRoom({
  sessionId,
  role,
  readOnly = false,
  peerName,
  serviceLabel,
  endsAt,
  actions,
  prefill,
  contactWarning,
  onEnded,
  onNoShow,
  onJoinError,
}: ChatRoomProps) {
  const room = useChatRoom(sessionId, { onEnded, onNoShow, onJoinError });
  const online = room.connected;
  // 처음 연결되기 전에는 '불안정' 안내를 띄우지 않는다
  const [wasOnline, setWasOnline] = useState(false);
  if (online && !wasOnline) setWasOnline(true);

  return (
    <section aria-label={ROOM.listLabel} className="flex min-h-0 grow flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line py-3.5">
        <p className="flex items-center gap-2 text-micro text-fg-muted">
          <span
            aria-hidden="true"
            className={cx('size-2 rounded-full', online ? 'bg-brand-green' : 'bg-border')}
          />
          {serviceLabel}
          {'  ·  '}
          {online ? ROOM.connected : ROOM.connecting}
        </p>
        {endsAt && (
          <p className="text-body-sm font-bold text-fg">
            <span className="sr-only">{ROOM.remaining}</span>
            <CountdownTimer until={endsAt} emphasize />
          </p>
        )}
      </div>

      {!online && wasOnline && (
        <p role="status" className="shrink-0 bg-highlight px-4 py-2 text-caption text-fg">
          {ROOM.unstable}
        </p>
      )}
      {role === 'client' && <RiskBanner sessionId={sessionId} />}

      {room.isPending && <Skeleton lines={4} className="grow pt-6" />}
      {room.isError && (
        <div className="grow">
          <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void room.refetch()} />
        </div>
      )}
      {!room.isPending && !room.isError && (
        <MessageList messages={room.messages} peerName={peerName} onRetry={room.retry} />
      )}

      <p aria-live="polite" className="min-h-6 shrink-0 text-micro text-fg-muted">
        {room.peerTyping ? ROOM.typing(peerName) : ''}
      </p>
      {actions}
      {!readOnly && (
        <Composer
          key={prefill?.key ?? 0}
          initialValue={prefill?.text}
          contactWarning={contactWarning}
          onSend={room.send}
          onTyping={room.notifyTyping}
          disabled={!online || !room.joined}
        />
      )}
    </section>
  );
}
