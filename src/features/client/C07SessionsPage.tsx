import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { cancelSession, type Session } from '@/api/endpoints/sessions';
import { isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { Screen } from '@/app/layouts/Screen';
import { CrisisButton } from '@/components/crisis/CrisisButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { CHECKOUT, SESSIONS } from '@/copy/client';
import { EMPTY } from '@/copy/empty';
import { errorCopy } from '@/copy/errorMessages';
import { COMMON } from '@/copy/fixed';
import { COMPLAINT, REPORT } from '@/copy/referral';
import { SESSION_STATUS_LABEL } from '@/copy/screens';
import { useFeatureFlag } from '@/hooks/useAppConfig';
import { useNow } from '@/hooks/useNow';
import { track } from '@/lib/analytics';
import { formatKST } from '@/lib/date';
import { showToast } from '@/stores/uiStore';

import { useProviderName, useSessions } from './queries';
import {
  canEnter,
  isCoaching,
  isComplaintOpen,
  isRefundable,
  pickUpcoming,
  splitSessions,
  trackLabel,
} from './sessions';

type Tab = 'upcoming' | 'past';

const TAB_PARAM = 'tab';
const ACTION = 'flex min-h-(--size-touch) items-center text-caption font-bold text-fg underline';

interface SessionItemProps {
  session: Session;
  now: number;
  onCancel: (session: Session) => void;
}

function SessionItem({ session, now, onCancel }: SessionItemProps) {
  const providerName = useProviderName(session.provider_id);
  const complaintsEnabled = useFeatureFlag('p1_complaints');
  const { status, session_id: sessionId } = session;
  const facts = [
    session.scheduled_start && formatKST(session.scheduled_start),
    status && SESSION_STATUS_LABEL[status],
  ].filter(Boolean);

  return (
    <li className="border-b border-line pb-1 pt-2.5">
      <p className="text-body-sm font-bold text-fg">
        {[providerName, trackLabel(session)].filter(Boolean).join(' · ')}
      </p>
      <p className="pt-1 text-body-sm text-fg-muted">{facts.join(' · ')}</p>
      <div className="flex flex-wrap gap-x-5">
        {status === 'PENDING_PAYMENT' && (
          <Link to={`/c/checkout/${sessionId}`} className={ACTION}>
            {SESSIONS.pay}
          </Link>
        )}
        {(status === 'CONFIRMED' || status === 'IN_PROGRESS') && (
          <Link to={`/c/sessions/${sessionId}/lobby`} className={ACTION}>
            {SESSIONS.enter}
          </Link>
        )}
        {(status === 'CONFIRMED' || status === 'PENDING_PAYMENT') && (
          <button type="button" onClick={() => onCancel(session)} className={ACTION}>
            {SESSIONS.cancel}
          </button>
        )}
        {session.report && (
          <Link to={`/c/reports/${session.report.id}`} className={ACTION}>
            {REPORT.view}
          </Link>
        )}
        {status === 'COMPLETED' && isCoaching(session) && session.provider_id && (
          <Link
            to={`/c/providers/${session.provider_id}?rebook_of=${sessionId}`}
            onClick={() => track('rebook_started')}
            className={ACTION}
          >
            {SESSIONS.rebook}
          </Link>
        )}
        {complaintsEnabled && isComplaintOpen(session, now) && (
          <Link to={`/c/sessions/${sessionId}/complaint`} className={ACTION}>
            {COMPLAINT.menu}
          </Link>
        )}
      </div>
    </li>
  );
}

/** C-07 내 상담 내역 */
export function C07SessionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // 탭은 쿼리스트링에 둬서 새로고침 뒤에도 유지한다 (TRD 11-3)
  const tab: Tab = searchParams.get(TAB_PARAM) === 'past' ? 'past' : 'upcoming';
  const now = useNow();
  const queryClient = useQueryClient();
  const sessions = useSessions();
  const [target, setTarget] = useState<Session | null>(null);

  const cancellation = useMutation({
    mutationFn: (session: Session) =>
      cancelSession(session.session_id ?? '', { reason: SESSIONS.cancelReason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.allSessions });
      showToast(SESSIONS.cancelled, 'success');
      setTarget(null);
    },
    onError: (error) => {
      showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
      setTarget(null);
    },
  });

  const { upcoming, past } = splitSessions(sessions.data ?? []);
  const list = tab === 'upcoming' ? upcoming : past;
  const next = pickUpcoming(sessions.data ?? [], now);
  const paidTarget = target?.status === 'CONFIRMED';

  return (
    <Screen>
      <ScreenHeader backTo="/c" right={<CrisisButton />} />
      <h1 className="pt-6.5 text-title-sm font-bold text-fg">{SESSIONS.title}</h1>
      <p className="pt-4 text-body-sm text-fg-muted">{SESSIONS.description}</p>

      <div role="group" aria-label={SESSIONS.tabsLabel} className="flex gap-1.5 pt-4">
        <Chip selected={tab === 'upcoming'} onClick={() => setSearchParams({}, { replace: true })}>
          {SESSIONS.tabUpcoming}
        </Chip>
        <Chip
          selected={tab === 'past'}
          onClick={() => setSearchParams({ [TAB_PARAM]: 'past' }, { replace: true })}
        >
          {SESSIONS.tabPast}
        </Chip>
      </div>

      {sessions.isPending && <Skeleton lines={5} className="pt-6" />}
      {sessions.isError && (
        <ErrorState
          title={COMMON.serverErrorTitle}
          description={errorCopy(isApiError(sessions.error) ? sessions.error.code : '').message}
          requestId={isApiError(sessions.error) ? sessions.error.requestId : undefined}
          onRetry={() => void sessions.refetch()}
        />
      )}

      {sessions.data && list.length === 0 && tab === 'upcoming' && (
        <EmptyState
          title={EMPTY.sessions.title}
          description={EMPTY.sessions.description}
          action={<ButtonLink to="/c/intake">{EMPTY.sessions.action}</ButtonLink>}
        />
      )}
      {sessions.data && list.length === 0 && tab === 'past' && (
        <p className="pt-8 text-body-sm text-fg-muted">{SESSIONS.emptyPast}</p>
      )}

      {list.length > 0 && (
        <ul className="pt-4">
          {list.map((session) => (
            <SessionItem
              key={session.session_id}
              session={session}
              now={now}
              onCancel={setTarget}
            />
          ))}
        </ul>
      )}

      {tab === 'upcoming' && next && (
        <div className="mt-auto pb-6 pt-8">
          <ButtonLink to={`/c/sessions/${next.session_id}/lobby`} disabled={!canEnter(next, now)}>
            {SESSIONS.enterLobby}
          </ButtonLink>
        </div>
      )}

      <Modal
        open={target !== null}
        title={SESSIONS.cancelTitle}
        onClose={() => setTarget(null)}
        footer={
          <>
            <Button block size="md" variant="secondary" onClick={() => setTarget(null)}>
              {SESSIONS.cancelKeep}
            </Button>
            <Button
              block
              size="md"
              variant="danger"
              loading={cancellation.isPending}
              onClick={() => target && cancellation.mutate(target)}
            >
              {SESSIONS.cancelConfirm}
            </Button>
          </>
        }
      >
        {/* 결제 전 예약은 환불할 금액이 없어 환불 안내를 빼고 묻는다 */}
        {target && paidTarget && (
          <>
            <p className="text-body-sm text-fg">
              {isRefundable(target, now) ? SESSIONS.cancelRefundFull : SESSIONS.cancelRefundNone}
            </p>
            <p className="text-micro text-fg-muted">{CHECKOUT.refundPolicy}</p>
          </>
        )}
      </Modal>
    </Screen>
  );
}
