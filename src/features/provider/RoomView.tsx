import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { acknowledgeRisk, acknowledgeSessionRisks, callOncall } from '@/api/endpoints/expert';
import { endSession, getSession } from '@/api/endpoints/sessions';
import { isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { RiskCard, type RiskCardEvent } from '@/components/crisis/RiskCard';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROOM } from '@/copy/client';
import { errorCopy } from '@/copy/errorMessages';
import { COMMON } from '@/copy/fixed';
import { PROVIDER_ROOM } from '@/copy/room';
import { trackLabel } from '@/features/client/sessions';
import { useVisualViewportHeight } from '@/hooks/useVisualViewportHeight';
import { onEvent, request } from '@/lib/realtime';
import { SERVER_HAS } from '@/lib/serverFeatures';
import { showToast } from '@/stores/uiStore';

import { RoomPanel } from './RoomPanel';

const SESSION_STALE_MS = 30_000;

function toastError(error: unknown): void {
  showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
}

interface RoomViewProps {
  role: 'trainee' | 'expert';
}

/** T-06, E-07 상담방: 공용 ChatRoom + 참고 패널 + 위기 대응 카드 + 세션 종료 */
export function RoomView({ role }: RoomViewProps) {
  const { id: sessionId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const viewportHeight = useVisualViewportHeight();
  const trainee = role === 'trainee';
  const listPath = trainee ? '/t/sessions' : '/e';
  const [panelOpen, setPanelOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [sessionsNeeded, setSessionsNeeded] = useState<number | null>(null);
  const [risk, setRisk] = useState<RiskCardEvent | null>(null);
  const [prefill, setPrefill] = useState({ key: 0, text: '' });
  const [askSupervision, setAskSupervision] = useState(false);

  const session = useQuery({
    queryKey: queryKeys.session(sessionId),
    queryFn: () => getSession(sessionId),
    staleTime: SESSION_STALE_MS,
  });
  const data = session.data;

  // 상담사에게 오는 위기 경고에는 근거 문장과 대응 문장이 함께 온다 (백엔드 14-3)
  useEffect(
    () =>
      onEvent('risk:alert', (alert) => {
        if (alert.session_id !== sessionId) return;
        setRisk({
          riskEventId: alert.risk_event_id,
          evidence: alert.evidence,
          script: alert.script ?? [],
        });
      }),
    [sessionId],
  );

  const end = useMutation({
    mutationFn: () =>
      endSession(sessionId, { intake_sessions_needed: sessionsNeeded ?? undefined }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.allSessions });
      setEnding(false);
      showToast(PROVIDER_ROOM.ended, 'success');
      // 연계된 전문 상담이면 수련생 슈퍼비전 작성을 안내한다 (TRD E-07)
      if (!trainee && data?.referral_id && SERVER_HAS.expertInbox) setAskSupervision(true);
      else navigate(listPath, { replace: true });
    },
    onError: toastError,
  });

  const oncall = useMutation({
    mutationFn: async () => {
      if (!risk?.riskEventId) return;
      await acknowledgeRisk(risk.riskEventId);
      await callOncall(risk.riskEventId);
    },
    onSuccess: () => showToast(PROVIDER_ROOM.riskOncallCalled, 'success'),
    onError: toastError,
  });

  const share = useMutation({
    mutationFn: () => request('crisis.share', { session_id: sessionId }),
    onSuccess: () => showToast(PROVIDER_ROOM.riskShared, 'success'),
    onError: () => showToast(errorCopy('').message, 'error'),
  });

  function acknowledge() {
    // 확인 기록은 남기되, 실패해도 카드는 닫는다. 서버 경고에는 이벤트 ID가 없어 회기로 찾는다
    const recorded = risk?.riskEventId
      ? acknowledgeRisk(risk.riskEventId)
      : acknowledgeSessionRisks(sessionId);
    recorded.catch(() => undefined);
    setRisk(null);
  }

  const open = data?.status === 'confirmed' || data?.status === 'in_progress';

  return (
    <main
      className="mx-auto flex h-dvh w-full max-w-(--size-content) flex-col px-6"
      style={viewportHeight ? { height: viewportHeight } : undefined}
    >
      <ScreenHeader
        name={data?.client_nickname}
        backTo={listPath}
        right={
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className="min-h-(--size-touch) text-caption font-bold text-fg underline"
            >
              {PROVIDER_ROOM.panelOpen}
            </button>
            <Button size="sm" variant="danger" disabled={!open} onClick={() => setEnding(true)}>
              {PROVIDER_ROOM.end}
            </Button>
          </span>
        }
      />
      {session.isPending && <Skeleton lines={6} className="pt-8" />}
      {session.isError && (
        <ErrorState
          title={COMMON.serverErrorTitle}
          description={errorCopy(isApiError(session.error) ? session.error.code : '').message}
          onRetry={() => void session.refetch()}
        />
      )}

      {risk && (
        <div className="pt-2">
          <RiskCard
            event={risk}
            onPickScript={(text) => setPrefill((current) => ({ key: current.key + 1, text }))}
            onCallOncall={SERVER_HAS.oncall ? () => oncall.mutate() : undefined}
            onShareResources={() => share.mutate()}
            onAcknowledge={acknowledge}
            busy={oncall.isPending || share.isPending}
          />
        </div>
      )}

      {data && open && (
        <ChatRoom
          sessionId={sessionId}
          role={role}
          peerName={data.client_nickname ?? ''}
          serviceLabel={trackLabel(data)}
          endsAt={data.scheduled_end}
          prefill={prefill}
          contactWarning={PROVIDER_ROOM.contactWarning}
          onEnded={() => navigate(listPath, { replace: true })}
          onJoinError={(code) => {
            // 서버가 알려 준 이유가 있으면 그것을 보여 준다
            const reason = errorCopy(code);
            showToast(reason === errorCopy('') ? ROOM.joinFailed : reason.message, 'error');
            navigate(listPath, { replace: true });
          }}
        />
      )}

      <Modal open={panelOpen} title={PROVIDER_ROOM.panelOpen} onClose={() => setPanelOpen(false)}>
        {data && <RoomPanel session={data} sessionId={sessionId} trainee={trainee} />}
      </Modal>

      <Modal
        open={ending}
        title={PROVIDER_ROOM.endTitle}
        onClose={() => setEnding(false)}
        footer={
          <>
            <Button block size="md" variant="secondary" onClick={() => setEnding(false)}>
              {COMMON.cancel}
            </Button>
            <Button
              block
              size="md"
              variant="danger"
              loading={end.isPending}
              onClick={() => end.mutate()}
            >
              {PROVIDER_ROOM.endConfirm}
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-fg-muted">{PROVIDER_ROOM.endBody}</p>
        {!trainee && (
          <fieldset className="pt-2">
            <legend className="text-body-sm font-bold text-fg">
              {PROVIDER_ROOM.sessionsNeededLabel}
            </legend>
            <div className="flex flex-wrap gap-1.5 pt-3">
              {PROVIDER_ROOM.sessionsNeeded.map((option) => (
                <Chip
                  key={option.value}
                  selected={sessionsNeeded === option.value}
                  onClick={() => setSessionsNeeded(option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </fieldset>
        )}
      </Modal>

      <Modal
        open={askSupervision}
        title={PROVIDER_ROOM.supervisionTitle}
        onClose={() => navigate(listPath, { replace: true })}
        footer={
          <Button block size="md" onClick={() => navigate('/e/supervisions', { replace: true })}>
            {PROVIDER_ROOM.supervisionGo}
          </Button>
        }
      >
        <p className="text-body-sm text-fg-muted">{PROVIDER_ROOM.supervisionBody}</p>
      </Modal>
    </main>
  );
}
