import type { Message } from '@/api/endpoints/messages';
import type { Role } from '@/api/types';
import type { RealtimeMessage } from '@/lib/realtime';

export type MessageStatus = 'sent' | 'sending' | 'failed';

/** 화면에 그리는 메시지. REST(MSG-01)와 실시간(message:new) 두 모양을 하나로 맞춘 것이다. */
export interface ChatMessage {
  /** 서버 ID. 전송 중에는 임시 ID(client_msg_id) */
  id: string;
  clientMsgId?: string;
  body: string;
  mine: boolean;
  createdAt: string;
  /** text 가 아니면 시스템 메시지 (예: crisis_resources) */
  kind: string;
  status: MessageStatus;
}

interface Viewer {
  id?: string;
  role?: Role;
}

const TEXT_KIND = 'text';
const CLIENT_ROLE = 'client';

export function isSystemMessage(message: ChatMessage): boolean {
  return message.kind !== TEXT_KIND;
}

export function fromRest(message: Message, myId: string | undefined): ChatMessage | null {
  if (!message.id) return null;
  return {
    id: message.id,
    body: message.body ?? '',
    mine: message.sender_id !== undefined && message.sender_id === myId,
    createdAt: message.created_at ?? '',
    kind: TEXT_KIND,
    status: 'sent',
  };
}

export function fromRealtime(message: RealtimeMessage, viewer: Viewer): ChatMessage {
  // 보낸 사람 ID가 오면 그것으로, 없으면 역할(내담자인지 상담사인지)로 내 메시지인지 가린다
  const mine =
    message.sender_id !== undefined
      ? message.sender_id === viewer.id
      : (message.sender_role === CLIENT_ROLE) === (viewer.role === CLIENT_ROLE);
  return {
    id: message.id,
    clientMsgId: message.client_msg_id,
    body: message.body,
    mine,
    createdAt: message.created_at,
    kind: message.kind ?? TEXT_KIND,
    status: 'sent',
  };
}

/** 낙관적으로 먼저 보여 줄 전송 중 메시지 */
export function createPending(body: string, clientMsgId: string, now: number): ChatMessage {
  return {
    id: clientMsgId,
    clientMsgId,
    body,
    mine: true,
    createdAt: new Date(now).toISOString(),
    kind: TEXT_KIND,
    status: 'sending',
  };
}

function compareText(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

// 확정된 메시지는 서버 ID(UUIDv7, 시간 순) 오름차순, 아직 확정되지 않은 내 메시지는 그 뒤에 보낸 순서로 둔다.
// 클라이언트 시각으로 확정 메시지의 순서를 정하지 않는다 (백엔드 14-5).
function compareMessages(a: ChatMessage, b: ChatMessage): number {
  const aSent = a.status === 'sent';
  const bSent = b.status === 'sent';
  if (aSent !== bSent) return aSent ? -1 : 1;
  return aSent ? compareText(a.id, b.id) : compareText(a.createdAt, b.createdAt);
}

function sameMessage(a: ChatMessage, b: ChatMessage): boolean {
  return a.id === b.id || (a.clientMsgId !== undefined && a.clientMsgId === b.clientMsgId);
}

/** 새로 받은 메시지를 합친다. 같은 ID나 같은 client_msg_id 는 한 건으로 본다. */
export function mergeMessages(
  current: readonly ChatMessage[],
  incoming: readonly ChatMessage[],
): ChatMessage[] {
  const merged = incoming.reduce<ChatMessage[]>(
    (list, message) => {
      const existing = list.find((item) => sameMessage(item, message));
      if (!existing) return [...list, message];
      // 이미 확정된 메시지를 전송 중 상태로 되돌리지 않는다
      if (existing.status === 'sent' && message.status !== 'sent') return list;
      const next: ChatMessage = {
        ...message,
        // 내가 보낸 메시지가 되돌아온 것이면 내 메시지로 둔다
        mine: message.mine || existing.mine,
        clientMsgId: message.clientMsgId ?? existing.clientMsgId,
      };
      return list.map((item) => (item === existing ? next : item));
    },
    [...current],
  );
  return merged.sort(compareMessages);
}

export function markStatus(
  list: readonly ChatMessage[],
  clientMsgId: string,
  status: MessageStatus,
): ChatMessage[] {
  return list.map((item) =>
    item.clientMsgId === clientMsgId && item.status !== 'sent' ? { ...item, status } : item,
  );
}

/** 전송 응답(ack)을 받아 임시 메시지를 서버 메시지로 바꾼다. */
export function confirmMessage(
  list: readonly ChatMessage[],
  clientMsgId: string,
  saved: { id: string; created_at: string } | undefined,
): ChatMessage[] {
  if (!saved) return markStatus(list, clientMsgId, 'sent');
  // message:new 가 응답보다 먼저 와서 이미 확정됐으면 임시 메시지만 지운다
  if (list.some((item) => item.id === saved.id)) {
    return list.filter((item) => item.clientMsgId !== clientMsgId || item.id === saved.id);
  }
  return list
    .map((item) =>
      item.clientMsgId === clientMsgId
        ? { ...item, id: saved.id, createdAt: saved.created_at, status: 'sent' as const }
        : item,
    )
    .sort(compareMessages);
}

/** 재연결 때 after_id 로 보낼, 마지막으로 확정된 메시지 ID */
export function lastConfirmedId(list: readonly ChatMessage[]): string | undefined {
  return list
    .filter((item) => item.status === 'sent' && item.id !== item.clientMsgId)
    .map((item) => item.id)
    .sort(compareText)
    .at(-1);
}
