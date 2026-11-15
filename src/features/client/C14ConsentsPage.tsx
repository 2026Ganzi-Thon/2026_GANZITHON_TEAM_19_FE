import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { listConsents, revokeConsent } from '@/api/endpoints/consents';
import { isApiError } from '@/api/errors';
import type { Consent, ConsentType } from '@/api/pending';
import { queryKeys } from '@/api/queryKeys';
import { Screen } from '@/app/layouts/Screen';
import { CrisisButton } from '@/components/crisis/CrisisButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { errorCopy } from '@/copy/errorMessages';
import { COMMON } from '@/copy/fixed';
import { CONSENTS } from '@/copy/referral';
import { formatKST } from '@/lib/date';
import { showToast } from '@/stores/uiStore';

const CONSENTS_STALE_MS = 30_000;
/** 내담자가 직접 철회할 수 있는 동의. 필수 약관은 탈퇴로만 철회된다 */
const REVOCABLE: readonly ConsentType[] = ['report_transfer', 'transcript_transfer'];

interface ConsentItemProps {
  consent: Consent;
  onRevoke: (consent: Consent) => void;
}

function ConsentItem({ consent, onRevoke }: ConsentItemProps) {
  const revoked = Boolean(consent.revoked_at);
  const title =
    consent.type === 'report_transfer' && consent.session_count
      ? CONSENTS.referralReport(consent.session_count)
      : CONSENTS.types[consent.type];
  const facts = [
    consent.target_expert_display && CONSENTS.target(consent.target_expert_display),
    CONSENTS.grantedAt(formatKST(consent.granted_at)),
    revoked ? CONSENTS.revoked : CONSENTS.active,
  ].filter(Boolean);
  const dates = consent.session_dates ?? [];

  return (
    <li className="border-b border-line pb-3 pt-2.5 text-body-sm">
      <p className="font-bold text-fg">{title}</p>
      <p className="pt-1 text-fg-muted">{facts.join(' · ')}</p>
      {dates.length > 0 && (
        <details className="text-fg-muted">
          <summary className="flex min-h-(--size-touch) cursor-pointer items-center text-caption underline">
            {CONSENTS.includedSessions}
          </summary>
          <ul className="pb-1">
            {dates.map((date) => (
              <li key={date}>{formatKST(date, 'M월 D일')}</li>
            ))}
          </ul>
        </details>
      )}
      {REVOCABLE.includes(consent.type) && !revoked && (
        <button
          type="button"
          onClick={() => onRevoke(consent)}
          className="flex min-h-(--size-touch) items-center text-caption font-bold text-fg underline"
        >
          {CONSENTS.revoke}
        </button>
      )}
    </li>
  );
}

/** C-14 동의 관리 */
export function C14ConsentsPage() {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<Consent | null>(null);
  const consents = useQuery({
    queryKey: queryKeys.consents,
    queryFn: listConsents,
    staleTime: CONSENTS_STALE_MS,
  });

  const revocation = useMutation({
    mutationFn: (consent: Consent) => revokeConsent(consent.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.consents });
      showToast(CONSENTS.revokeDone, 'success');
      setTarget(null);
    },
    onError: (error) => {
      showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
      setTarget(null);
    },
  });

  return (
    <Screen>
      <ScreenHeader right={<CrisisButton />} />
      <h1 className="pt-6.5 text-title-sm font-bold text-fg">{CONSENTS.title}</h1>
      <p className="pt-4 text-body-sm text-fg-muted">{CONSENTS.description}</p>

      {consents.isPending && <Skeleton lines={5} className="pt-6" />}
      {consents.isError && (
        <ErrorState
          title={COMMON.serverErrorTitle}
          description={errorCopy(isApiError(consents.error) ? consents.error.code : '').message}
          requestId={isApiError(consents.error) ? consents.error.requestId : undefined}
          onRetry={() => void consents.refetch()}
        />
      )}
      {consents.data?.length === 0 && (
        <p className="pt-8 text-body-sm text-fg-muted">{CONSENTS.empty}</p>
      )}
      {consents.data && consents.data.length > 0 && (
        <>
          <ul className="pt-2">
            {consents.data.map((consent) => (
              <ConsentItem key={consent.id} consent={consent} onRevoke={setTarget} />
            ))}
          </ul>
          <p className="pb-10 pt-4 text-micro text-fg-muted">{CONSENTS.requiredNotice}</p>
        </>
      )}

      <Modal
        open={target !== null}
        title={CONSENTS.revokeTitle}
        onClose={() => setTarget(null)}
        footer={
          <>
            <Button block size="md" variant="secondary" onClick={() => setTarget(null)}>
              {COMMON.cancel}
            </Button>
            <Button
              block
              size="md"
              variant="danger"
              loading={revocation.isPending}
              onClick={() => target && revocation.mutate(target)}
            >
              {CONSENTS.revokeConfirm}
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-fg-muted">{CONSENTS.revokeBody}</p>
      </Modal>
    </Screen>
  );
}
