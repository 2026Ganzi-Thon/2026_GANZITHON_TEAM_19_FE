import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { isApiError } from '@/api/errors';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { CrisisButton } from '@/components/crisis/CrisisButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { LOBBY, ROOM } from '@/copy/client';
import { errorCopy } from '@/copy/errorMessages';
import { COMMON } from '@/copy/fixed';
import { useVisualViewportHeight } from '@/hooks/useVisualViewportHeight';
import { showToast } from '@/stores/uiStore';

import { useProviderName, useSession } from './queries';
import { trackLabel } from './sessions';

/** C-09 상담방 (내담자) */
export function C09RoomPage() {
  const { id: sessionId = '' } = useParams();
  const navigate = useNavigate();
  const session = useSession(sessionId);
  const providerName = useProviderName(session.data?.provider_id);
  const viewportHeight = useVisualViewportHeight();
  const [leaving, setLeaving] = useState(false);
  const [noShow, setNoShow] = useState(false);
  const status = session.data?.status;
  const donePath = `/c/sessions/${sessionId}/done`;

  useEffect(() => {
    if (status === undefined || status === 'confirmed' || status === 'in_progress') return;
    if (status === 'completed') {
      navigate(donePath, { replace: true });
      return;
    }
    showToast(LOBBY.notAvailable);
    navigate('/c/sessions', { replace: true });
  }, [status, donePath, navigate]);

  const data = session.data;
  const open = status === 'confirmed' || status === 'in_progress';

  return (
    // 키보드가 올라오면 보이는 영역 높이에 맞춰 입력창을 키보드 위에 둔다 (TRD 18-4)
    <main
      className="mx-auto flex h-dvh w-full max-w-(--size-content) flex-col px-6"
      style={viewportHeight ? { height: viewportHeight } : undefined}
    >
      <ScreenHeader name={providerName} onBack={() => setLeaving(true)} right={<CrisisButton />} />
      {session.isPending && <Skeleton lines={6} className="pt-8" />}
      {session.isError && (
        <ErrorState
          title={COMMON.serverErrorTitle}
          description={errorCopy(isApiError(session.error) ? session.error.code : '').message}
          requestId={isApiError(session.error) ? session.error.requestId : undefined}
          onRetry={() => void session.refetch()}
        />
      )}

      {data && open && (
        <ChatRoom
          sessionId={sessionId}
          role="client"
          peerName={providerName}
          serviceLabel={trackLabel(data)}
          endsAt={data.scheduled_end}
          onEnded={() => navigate(donePath, { replace: true })}
          onNoShow={() => setNoShow(true)}
          onJoinError={() => {
            showToast(ROOM.joinFailed, 'error');
            navigate(`/c/sessions/${sessionId}/lobby`, { replace: true });
          }}
          actions={
            <div className="shrink-0 border-t border-line">
              <button
                type="button"
                onClick={() => setLeaving(true)}
                className="min-h-(--size-touch) text-micro font-medium text-fg-muted"
              >
                {ROOM.leave}
              </button>
            </div>
          }
        />
      )}

      <Modal
        open={leaving}
        title={ROOM.leaveTitle}
        onClose={() => setLeaving(false)}
        footer={
          <>
            <Button block size="md" variant="secondary" onClick={() => setLeaving(false)}>
              {ROOM.stay}
            </Button>
            <Button block size="md" onClick={() => navigate('/c/sessions')}>
              {ROOM.leaveConfirm}
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-fg-muted">{ROOM.leaveDescription}</p>
      </Modal>

      <Modal
        open={noShow}
        title={ROOM.noShowTitle}
        onClose={() => navigate('/c/sessions', { replace: true })}
        dismissible={false}
        role="alertdialog"
        footer={
          <Button block size="md" onClick={() => navigate('/c/sessions', { replace: true })}>
            {COMMON.confirm}
          </Button>
        }
      >
        <p className="text-body-sm text-fg-muted">{ROOM.noShowBody}</p>
      </Modal>
    </main>
  );
}
