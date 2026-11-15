import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';

import { getReferral, selectExpert, updateReferralSessions } from '@/api/endpoints/referrals';
import { isApiError } from '@/api/errors';
import type { ReferralDetail } from '@/api/pending';
import { queryKeys } from '@/api/queryKeys';
import { Screen } from '@/app/layouts/Screen';
import { CrisisButton } from '@/components/crisis/CrisisButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { sameSessions } from '@/components/report/selection';
import { SessionPicker } from '@/components/report/SessionPicker';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { MATCHES } from '@/copy/client';
import { errorCopy } from '@/copy/errorMessages';
import { COMMON } from '@/copy/fixed';
import { REFERRAL } from '@/copy/referral';
import { useNow } from '@/hooks/useNow';
import { track } from '@/lib/analytics';
import { formatRelativeKST } from '@/lib/date';
import { showToast } from '@/stores/uiStore';

import { ConsentStep } from './C12ConsentStep';
import { serviceLabel } from './sessions';

type Step = 1 | 2 | 3;

const REFERRAL_STALE_MS = 30_000;
const SAVE_DEBOUNCE_MS = 1000;
const SEPARATOR = ' · ';

function toastError(error: unknown): void {
  showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
}

interface StepProps {
  detail: ReferralDetail;
  referralId: string;
  onNext: () => void;
}

/** 단계 1: 포함할 상담 고르기. 바뀌면 1초 뒤에 저장하고 종합 리포트를 다시 만든다 (REF-07) */
function SessionsStep({ detail, referralId, onNext }: StepProps) {
  const queryClient = useQueryClient();
  const locked = Boolean(detail.referral.included_locked_at);
  const [selected, setSelected] = useState<string[]>(detail.included_session_ids);
  const saved = useRef<string[]>(detail.included_session_ids);

  const save = useMutation({
    mutationFn: (sessionIds: string[]) => updateReferralSessions(referralId, sessionIds),
    onSuccess: (_result, sessionIds) => {
      saved.current = sessionIds;
      track('referral_sessions_changed', { count: sessionIds.length });
      void queryClient.invalidateQueries({ queryKey: queryKeys.referral(referralId) });
      if (detail.report) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.report(detail.report.id) });
      }
    },
    onError: (error) => {
      // 동의 뒤에 바꾸려 한 경우(INCLUDED_LOCKED)를 포함해, 저장된 선택으로 되돌린다
      toastError(error);
      setSelected(saved.current);
      void queryClient.invalidateQueries({ queryKey: queryKeys.referral(referralId) });
    },
  });
  const { mutate, mutateAsync } = save;

  useEffect(() => {
    if (sameSessions(selected, saved.current)) return;
    const timer = window.setTimeout(() => mutate(selected), SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [selected, mutate]);

  async function next() {
    // 아직 저장하지 않은 변경이 있으면 저장부터 한다
    if (!sameSessions(selected, saved.current)) {
      try {
        await mutateAsync(selected);
      } catch {
        return;
      }
    }
    onNext();
  }

  return (
    <>
      <p className="pt-6.5 text-micro text-fg-muted">{REFERRAL.step1}</p>
      <h1 className="pt-4 text-title-sm font-bold text-fg">{REFERRAL.title1}</h1>
      <p className="pt-4 pb-2 text-body-sm text-fg-muted">{REFERRAL.guide1}</p>
      <SessionPicker
        sessions={detail.eligible_sessions}
        selected={selected}
        onChange={setSelected}
        locked={locked}
      />
      {locked && (
        <Link
          to="/c/consents"
          className="flex min-h-(--size-touch) items-center self-start text-caption font-bold text-fg underline"
        >
          {REFERRAL.manageConsents}
        </Link>
      )}
      <div className="mt-auto pb-10 pt-8">
        <Button block loading={save.isPending} onClick={() => void next()}>
          {REFERRAL.next1}
        </Button>
      </div>
    </>
  );
}

interface ExpertStepProps extends StepProps {
  expertId: string | null;
  onSelect: (expertId: string) => void;
}

/** 단계 2: 전문가 선택 (REF-03) */
function ExpertStep({ detail, referralId, expertId, onSelect, onNext }: ExpertStepProps) {
  const queryClient = useQueryClient();
  const now = useNow();

  const selection = useMutation({
    mutationFn: (id: string) => selectExpert(referralId, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.referral(referralId) });
      onNext();
    },
    onError: toastError,
  });

  return (
    <>
      <p className="pt-6.5 text-micro text-fg-muted">{REFERRAL.step2}</p>
      <h1 className="pt-4 text-title-sm font-bold text-fg">{REFERRAL.title2}</h1>
      <p className="pt-4 text-body-sm text-fg-muted">{REFERRAL.guide2}</p>

      {detail.candidates.length === 0 && (
        <p className="pt-6 text-body-sm text-fg-muted">{REFERRAL.noCandidates}</p>
      )}
      <ul role="radiogroup" aria-label={REFERRAL.title2} className="pt-2">
        {detail.candidates.map((candidate) => {
          const id = candidate.provider_id ?? '';
          const selected = id === expertId;
          const name = [candidate.display_name, serviceLabel(candidate.track)]
            .filter(Boolean)
            .join(SEPARATOR);
          const facts = [
            candidate.earliest_slot &&
              REFERRAL.earliest(formatRelativeKST(candidate.earliest_slot, now)),
            typeof candidate.price === 'number' && MATCHES.price(candidate.price),
          ].filter(Boolean);
          return (
            <li key={id}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelect(id)}
                className="w-full border-b border-line pb-3 pt-2.5 text-left text-body-sm"
              >
                <span className="block font-bold text-fg">
                  {selected && <span aria-hidden="true">✓ </span>}
                  {selected ? [name, REFERRAL.selected].join(SEPARATOR) : name}
                </span>
                <span className="block pt-1 text-fg-muted">
                  {candidate.specialties?.join(SEPARATOR)}
                </span>
                <span className="block text-fg-muted">{facts.join(SEPARATOR)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto pb-10 pt-8">
        <Button
          block
          disabled={!expertId}
          loading={selection.isPending}
          onClick={() => expertId && selection.mutate(expertId)}
        >
          {REFERRAL.next2}
        </Button>
      </div>
    </>
  );
}

/** C-12 포함 상담 선택·전문가 선택·종합 리포트 미리보기·전달 동의 (3단계) */
export function C12ReferralPage() {
  const { referralId = '' } = useParams();
  const [step, setStep] = useState<Step>(1);
  const [pickedExpertId, setPickedExpertId] = useState<string | null>(null);
  const referral = useQuery({
    queryKey: queryKeys.referral(referralId),
    queryFn: () => getReferral(referralId),
    staleTime: REFERRAL_STALE_MS,
  });
  const detail = referral.data;
  const expertId = pickedExpertId ?? detail?.referral.expert_id ?? null;

  return (
    <Screen>
      <ScreenHeader
        onBack={step === 1 ? undefined : () => setStep(step === 3 ? 2 : 1)}
        right={<CrisisButton />}
      />
      {referral.isPending && <Skeleton lines={6} className="pt-8" />}
      {referral.isError && (
        <ErrorState
          title={COMMON.serverErrorTitle}
          description={errorCopy(isApiError(referral.error) ? referral.error.code : '').message}
          requestId={isApiError(referral.error) ? referral.error.requestId : undefined}
          onRetry={() => void referral.refetch()}
        />
      )}

      {detail && step === 1 && (
        <SessionsStep detail={detail} referralId={referralId} onNext={() => setStep(2)} />
      )}
      {detail && step === 2 && (
        <ExpertStep
          detail={detail}
          referralId={referralId}
          expertId={expertId}
          onSelect={setPickedExpertId}
          onNext={() => setStep(3)}
        />
      )}
      {detail && step === 3 && expertId && (
        <ConsentStep detail={detail} referralId={referralId} expertId={expertId} />
      )}
    </Screen>
  );
}
