import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { submitMood } from '@/api/endpoints/sessions';
import { isApiError } from '@/api/errors';
import { Screen } from '@/app/layouts/Screen';
import { CrisisButton } from '@/components/crisis/CrisisButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Mascot } from '@/components/mascot/Mascot';
import { Button } from '@/components/ui/Button';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { ErrorState } from '@/components/ui/ErrorState';
import { MOOD_DEFAULT, MoodSlider } from '@/components/ui/MoodSlider';
import { Skeleton } from '@/components/ui/Skeleton';
import { LOBBY } from '@/copy/client';
import { errorCopy } from '@/copy/errorMessages';
import { COMMON } from '@/copy/fixed';
import { useNow } from '@/hooks/useNow';
import { track } from '@/lib/analytics';
import { formatKSTTime } from '@/lib/date';
import { useSessionFlowStore } from '@/stores/sessionFlowStore';
import { showToast } from '@/stores/uiStore';

import { useProviderName, useSession } from './queries';
import { canEnter, trackLabel } from './sessions';

const ENTER_CHECK_MS = 5000;
const SEPARATOR = '  ·  ';

/** C-08 상담 대기실 */
export function C08LobbyPage() {
  const { id: sessionId = '' } = useParams();
  const navigate = useNavigate();
  const now = useNow(ENTER_CHECK_MS);
  const session = useSession(sessionId);
  const providerName = useProviderName(session.data?.provider_id);
  const setMoodBefore = useSessionFlowStore((state) => state.setMoodBefore);
  const [score, setScore] = useState(MOOD_DEFAULT);
  const status = session.data?.status;

  function enter() {
    navigate(`/c/sessions/${sessionId}/room`);
  }

  const mood = useMutation({
    mutationFn: () => submitMood(sessionId, { phase: 'before', score }),
    onSuccess: () => {
      setMoodBefore(sessionId, score);
      track('mood_before_submitted');
      enter();
    },
    onError: (error) => {
      // 이미 기록했으면 그대로 들어간다
      if (isApiError(error, 'ALREADY_SUBMITTED')) enter();
      else showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
    },
  });

  useEffect(() => {
    if (status === undefined || status === 'confirmed' || status === 'in_progress') return;
    if (status === 'completed') {
      navigate(`/c/sessions/${sessionId}/done`, { replace: true });
      return;
    }
    showToast(LOBBY.notAvailable);
    navigate('/c/sessions', { replace: true });
  }, [status, sessionId, navigate]);

  const data = session.data;
  const enterable = data !== undefined && canEnter(data, now);

  return (
    <Screen>
      <ScreenHeader backTo="/c/sessions" right={<CrisisButton />} />
      {session.isPending && <Skeleton lines={6} className="pt-8" />}
      {session.isError && (
        <ErrorState
          title={COMMON.serverErrorTitle}
          description={errorCopy(isApiError(session.error) ? session.error.code : '').message}
          requestId={isApiError(session.error) ? session.error.requestId : undefined}
          onRetry={() => void session.refetch()}
        />
      )}

      {data && (
        <>
          <p className="pt-7 text-caption font-medium text-fg-muted">{LOBBY.label}</p>
          <h1 className="whitespace-pre-line pt-4 text-title font-bold text-fg">{LOBBY.title}</h1>
          <p className="pt-5 text-body-sm text-fg-muted">
            {[
              providerName,
              trackLabel(data),
              data.scheduled_start && formatKSTTime(data.scheduled_start),
            ]
              .filter(Boolean)
              .join(SEPARATOR)}
          </p>

          <section className="mt-7 flex items-center justify-between gap-4 border-y border-line py-6">
            <div>
              <p className="text-caption text-fg-muted">{LOBBY.untilStart}</p>
              {data.scheduled_start && (
                <p className="text-timer font-bold text-fg">
                  <CountdownTimer until={data.scheduled_start} />
                </p>
              )}
              <p className="pt-2 text-caption text-fg-muted">{LOBBY.enterHint}</p>
            </div>
            <Mascot pose="rest" />
          </section>

          <section className="pt-7">
            <h2 className="pb-5 text-subheading font-bold text-fg">{LOBBY.moodTitle}</h2>
            <MoodSlider label={LOBBY.moodTitle} value={score} onChange={setScore} />
          </section>

          <p className="whitespace-pre-line pt-7 text-micro text-fg-muted">{LOBBY.etiquette}</p>

          <div className="mt-auto flex flex-col gap-2 pb-10 pt-6">
            <Button
              block
              disabled={!enterable}
              loading={mood.isPending}
              onClick={() => mood.mutate()}
            >
              {LOBBY.enter}
            </Button>
            <Button
              block
              variant="secondary"
              disabled={!enterable || mood.isPending}
              onClick={enter}
            >
              {LOBBY.later}
            </Button>
          </div>
        </>
      )}
    </Screen>
  );
}
