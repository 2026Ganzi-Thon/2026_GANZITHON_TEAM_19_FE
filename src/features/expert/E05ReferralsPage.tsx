import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { respondReferral } from '@/api/endpoints/expert';
import { isApiError } from '@/api/errors';
import type { ExpertReferralItem, ReferralDeclineReason } from '@/api/pendingProvider';
import { Screen } from '@/app/layouts/Screen';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { errorCopy } from '@/copy/errorMessages';
import { EXPERT_REFERRAL } from '@/copy/expertReferral';
import { COMMON } from '@/copy/fixed';
import { useExpertReferrals } from '@/features/provider/queries';
import { categoryLabel } from '@/features/provider/SessionRow';
import { useNow } from '@/hooks/useNow';
import { cx } from '@/lib/cx';
import { formatKST } from '@/lib/date';
import { showToast } from '@/stores/uiStore';

const REFERRALS_KEY = ['expert-referrals'];

function reportStatus(item: ExpertReferralItem): string {
  if (!item.has_report_consent) return EXPERT_REFERRAL.reportNoConsent;
  return item.report_ready
    ? EXPERT_REFERRAL.reportConsented(item.included_session_count)
    : EXPERT_REFERRAL.reportPreparing;
}

interface ReferralCardProps {
  item: ExpertReferralItem;
  now: number;
  busy: boolean;
  onAccept: (item: ExpertReferralItem) => void;
  onDecline: (item: ExpertReferralItem) => void;
}

function ReferralCard({ item, now, busy, onAccept, onDecline }: ReferralCardProps) {
  // 기한이 지나면 서버가 자동으로 거절 처리한다. 화면은 회색으로 보여 준다
  const expired =
    item.status === 'expired' || (item.status === 'booked' && Date.parse(item.respond_by) <= now);
  const waiting = item.status === 'booked' && !expired;
  const canOpenReport = item.status === 'accepted' && item.has_report_consent && item.report_id;

  return (
    <li className={cx('border-b border-line pb-4 pt-4 text-body-sm', expired && 'opacity-50')}>
      <p className="font-bold text-fg">
        {[item.client_nickname, categoryLabel(item.category)].filter(Boolean).join(' · ')}
      </p>
      <p className="pt-1 text-fg-muted">
        {[
          formatKST(item.scheduled_start),
          item.risk_level && EXPERT_REFERRAL.risk(EXPERT_REFERRAL.riskLevel[item.risk_level]),
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <p className="pt-1 text-fg-muted">{reportStatus(item)}</p>
      {item.trainee_reason && (
        <p className="pt-1 text-fg-muted">{EXPERT_REFERRAL.traineeReason(item.trainee_reason)}</p>
      )}

      {waiting && (
        <>
          <p className="pt-2 text-fg">
            {EXPERT_REFERRAL.deadline}{' '}
            <CountdownTimer until={item.respond_by} className="font-bold" />
          </p>
          <div className="flex gap-2 pt-3">
            <Button size="md" disabled={busy} onClick={() => onAccept(item)}>
              {EXPERT_REFERRAL.accept}
            </Button>
            <Button size="md" variant="secondary" disabled={busy} onClick={() => onDecline(item)}>
              {EXPERT_REFERRAL.decline}
            </Button>
          </div>
        </>
      )}
      {expired && <p className="pt-2 text-fg-muted">{EXPERT_REFERRAL.expired}</p>}
      {item.status === 'accepted' && <p className="pt-2 text-fg">{EXPERT_REFERRAL.accepted}</p>}
      {item.status === 'declined' && (
        <p className="pt-2 text-fg-muted">{EXPERT_REFERRAL.declined}</p>
      )}
      {canOpenReport && (
        <Link
          to={`/e/reports/${item.report_id}`}
          className="flex min-h-(--size-touch) items-center text-caption font-bold text-fg underline"
        >
          {EXPERT_REFERRAL.viewReport}
        </Link>
      )}
    </li>
  );
}

/** E-05 연계 요청함 */
export function E05ReferralsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const now = useNow();
  const referrals = useExpertReferrals();
  const [declining, setDeclining] = useState<ExpertReferralItem | null>(null);
  const [reason, setReason] = useState<ReferralDeclineReason | null>(null);
  const items = referrals.data ?? [];

  function toastError(error: unknown) {
    showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
  }

  const acceptance = useMutation({
    mutationFn: (item: ExpertReferralItem) => respondReferral(item.id, { action: 'accept' }),
    onSuccess: (_result, item) => {
      void queryClient.invalidateQueries({ queryKey: REFERRALS_KEY });
      showToast(EXPERT_REFERRAL.acceptedToast, 'success');
      // 수락하면 연계 리포트로 간다. 동의 전이면 잠금 화면이 보인다
      if (item.report_id) navigate(`/e/reports/${item.report_id}`);
    },
    onError: toastError,
  });

  const refusal = useMutation({
    mutationFn: (input: { item: ExpertReferralItem; reason: ReferralDeclineReason }) =>
      respondReferral(input.item.id, { action: 'decline', reason: input.reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: REFERRALS_KEY });
      showToast(EXPERT_REFERRAL.declinedToast);
      setDeclining(null);
      setReason(null);
    },
    onError: toastError,
  });

  return (
    <Screen>
      <h1 className="pt-10 text-title-sm font-bold text-fg">{EXPERT_REFERRAL.title}</h1>
      {referrals.isPending && <Skeleton lines={5} className="pt-6" />}
      {referrals.isError && (
        <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void referrals.refetch()} />
      )}
      {referrals.data && items.length === 0 && <EmptyState title={EXPERT_REFERRAL.empty} />}
      <ul className="pb-6 pt-2">
        {items.map((item) => (
          <ReferralCard
            key={item.id}
            item={item}
            now={now}
            busy={acceptance.isPending || refusal.isPending}
            onAccept={(target) => acceptance.mutate(target)}
            onDecline={setDeclining}
          />
        ))}
      </ul>

      <Modal
        open={declining !== null}
        title={EXPERT_REFERRAL.declineTitle}
        onClose={() => setDeclining(null)}
        footer={
          <>
            <Button block size="md" variant="secondary" onClick={() => setDeclining(null)}>
              {COMMON.cancel}
            </Button>
            <Button
              block
              size="md"
              variant="danger"
              disabled={!reason}
              loading={refusal.isPending}
              onClick={() => declining && reason && refusal.mutate({ item: declining, reason })}
            >
              {EXPERT_REFERRAL.declineConfirm}
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-fg-muted">{EXPERT_REFERRAL.declineBody}</p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {EXPERT_REFERRAL.declineReasons.map((option) => (
            <Chip
              key={option.value}
              selected={reason === option.value}
              onClick={() => setReason(option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </Modal>
    </Screen>
  );
}
