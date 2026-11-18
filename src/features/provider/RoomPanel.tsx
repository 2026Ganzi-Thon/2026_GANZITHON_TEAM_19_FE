import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { getSessionHistory, suggestReferral } from '@/api/endpoints/expert';
import { saveSessionNote, type Session } from '@/api/endpoints/sessions';
import { isApiError } from '@/api/errors';
import type { ReferralReasonCode } from '@/api/pendingProvider';
import { queryKeys } from '@/api/queryKeys';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { errorCopy } from '@/copy/errorMessages';
import { PROVIDER_ROOM } from '@/copy/room';
import { formatKST } from '@/lib/date';
import { SERVER_HAS } from '@/lib/serverFeatures';
import { countChars } from '@/lib/text';
import { showToast } from '@/stores/uiStore';

import { categoryLabel } from './SessionRow';

type PanelTab = 'summary' | 'note' | 'history' | 'referral';

const HISTORY_STALE_MS = 5 * 60_000;
const NOTE_MAX_CHARS = 5000;
const REASON_MAX = 200;
const UNKNOWN = '-';

function toastError(error: unknown): void {
  showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
}

/** ① 인테이크 요약: 카테고리와 AI 태그만. 원문은 내담자가 공유했을 때만 보인다 */
function Summary({ session }: { session: Session }) {
  const summary = session.intake_summary;
  const emotions = summary?.ai_tags?.emotions ?? [];
  const distortions = summary?.ai_tags?.distortions ?? [];

  return (
    <dl className="text-body-sm">
      <dt className="font-bold text-fg">{PROVIDER_ROOM.summaryTitle}</dt>
      <dd className="pt-1 text-fg-muted">{categoryLabel(summary?.category ?? session.category)}</dd>
      {emotions.length > 0 && (
        <>
          <dt className="pt-3 font-bold text-fg">{PROVIDER_ROOM.emotions}</dt>
          <dd className="pt-1 text-fg-muted">{emotions.join(' · ')}</dd>
        </>
      )}
      {distortions.length > 0 && (
        <>
          <dt className="pt-3 font-bold text-fg">{PROVIDER_ROOM.distortions}</dt>
          <dd className="pt-1 text-fg-muted">{distortions.join(' · ')}</dd>
        </>
      )}
      <dt className="pt-3 font-bold text-fg">{PROVIDER_ROOM.rawText}</dt>
      <dd className="whitespace-pre-wrap pt-1 text-fg-muted">
        {summary?.raw_text ?? PROVIDER_ROOM.rawTextHidden}
      </dd>
    </dl>
  );
}

/** ② 상담 메모: 비공개, 세션에 저장 (SES-08) */
function Note({ sessionId }: { sessionId: string }) {
  const [note, setNote] = useState('');
  const save = useMutation({
    mutationFn: () => saveSessionNote(sessionId, { note }),
    onSuccess: () => showToast(PROVIDER_ROOM.noteSaved, 'success'),
    onError: toastError,
  });

  return (
    <div className="flex flex-col gap-3">
      <TextArea
        label={PROVIDER_ROOM.noteLabel}
        hint={PROVIDER_ROOM.noteHint}
        rows={5}
        maxLength={NOTE_MAX_CHARS}
        length={countChars(note)}
        showCount
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <Button
        size="md"
        variant="secondary"
        disabled={countChars(note) > NOTE_MAX_CHARS}
        loading={save.isPending}
        onClick={() => save.mutate()}
      >
        {PROVIDER_ROOM.noteSave}
      </Button>
    </div>
  );
}

/** ⑤ 이전 회기: 이 내담자와 내가 진행한 회기의 날짜·마음 온도 변화·내 메모 (SES-09) */
function History({ sessionId }: { sessionId: string }) {
  const history = useQuery({
    queryKey: queryKeys.sessionHistory(sessionId),
    queryFn: () => getSessionHistory(sessionId),
    staleTime: HISTORY_STALE_MS,
  });

  if (history.isPending) return <Skeleton lines={3} />;
  if (!history.data || history.data.length === 0) {
    return <p className="text-body-sm text-fg-muted">{PROVIDER_ROOM.historyEmpty}</p>;
  }
  return (
    <ul className="text-body-sm">
      {history.data.map((item) => (
        <li key={item.session_id} className="border-b border-line pb-3 pt-2.5">
          <p className="font-bold text-fg">{formatKST(item.date, 'M월 D일')}</p>
          <p className="pt-1 text-fg-muted">
            {PROVIDER_ROOM.historyMood(item.mood_before ?? UNKNOWN, item.mood_after ?? UNKNOWN)}
          </p>
          {item.my_note && <p className="whitespace-pre-wrap pt-1 text-fg-muted">{item.my_note}</p>}
        </li>
      ))}
    </ul>
  );
}

/** ③ 전문 상담 권유: 사유 선택 + 한 줄 (REF-04, 수련생만) */
function ReferralSuggestion({ sessionId }: { sessionId: string }) {
  const [reason, setReason] = useState<ReferralReasonCode | null>(null);
  const [text, setText] = useState('');
  const suggestion = useMutation({
    mutationFn: (code: ReferralReasonCode) =>
      suggestReferral(sessionId, { reason_code: code, reason_text: text.trim() }),
    onSuccess: () => showToast(PROVIDER_ROOM.referralDone, 'success'),
    onError: toastError,
  });

  return (
    <div className="flex flex-col gap-3">
      <fieldset>
        <legend className="text-body-sm font-bold text-fg">{PROVIDER_ROOM.referralTitle}</legend>
        <div className="flex flex-wrap gap-1.5 pt-3">
          {PROVIDER_ROOM.referralReasons.map((option) => (
            <Chip
              key={option.value}
              selected={reason === option.value}
              onClick={() => setReason(option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </fieldset>
      <TextField
        label={PROVIDER_ROOM.referralText}
        maxLength={REASON_MAX}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <Button
        size="md"
        disabled={!reason || text.trim().length === 0 || suggestion.isSuccess}
        loading={suggestion.isPending}
        onClick={() => reason && suggestion.mutate(reason)}
      >
        {PROVIDER_ROOM.referralSubmit}
      </Button>
    </div>
  );
}

interface RoomPanelProps {
  session: Session;
  sessionId: string;
  trainee: boolean;
}

/** 상담방의 참고 패널 (TRD T-06, E-07). 휴대폰 폭이라 아래에서 올라오는 시트 안에 탭으로 둔다 */
export function RoomPanel({ session, sessionId, trainee }: RoomPanelProps) {
  // 재예약 회기면 이전 회기 탭을 먼저 연다
  const [tab, setTab] = useState<PanelTab>(session.rebook_of ? 'history' : 'summary');
  const tabs: ReadonlyArray<{ value: PanelTab; label: string }> = [
    { value: 'summary', label: PROVIDER_ROOM.tabSummary },
    { value: 'note', label: PROVIDER_ROOM.tabNote },
    { value: 'history', label: PROVIDER_ROOM.tabHistory },
    ...(trainee && SERVER_HAS.referralSuggestion
      ? [{ value: 'referral' as const, label: PROVIDER_ROOM.tabReferral }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label={PROVIDER_ROOM.tabsLabel} className="flex flex-wrap gap-1.5">
        {tabs.map((item) => (
          <Chip
            key={item.value}
            selected={tab === item.value}
            onClick={() => setTab(item.value)}
            className="min-w-0"
          >
            {item.label}
          </Chip>
        ))}
      </div>
      {tab === 'summary' && <Summary session={session} />}
      {tab === 'note' && <Note sessionId={sessionId} />}
      {tab === 'history' && <History sessionId={sessionId} />}
      {tab === 'referral' && <ReferralSuggestion sessionId={sessionId} />}
    </div>
  );
}
