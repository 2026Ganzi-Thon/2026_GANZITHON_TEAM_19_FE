import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { grantConsent, TRANSFER_CONSENT_VERSION } from '@/api/endpoints/consents';
import { updateReferralSessions } from '@/api/endpoints/referrals';
import { getReport } from '@/api/endpoints/reports';
import { isApiError } from '@/api/errors';
import type { ReferralDetail } from '@/api/pending';
import { queryKeys } from '@/api/queryKeys';
import { ReportCard } from '@/components/report/ReportCard';
import { ReportTimeline } from '@/components/report/ReportTimeline';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Skeleton } from '@/components/ui/Skeleton';
import { errorCopy } from '@/copy/errorMessages';
import { REFERRAL, REPORT } from '@/copy/referral';
import { useNow } from '@/hooks/useNow';
import { track } from '@/lib/analytics';
import { showToast } from '@/stores/uiStore';

const POLL_MS = 5000;
/** 이 시간이 넘도록 리포트가 안 만들어지면 먼저 예약하게 한다 (TRD C-12) */
const WAIT_LIMIT_MS = 2 * 60_000;

interface ConsentStepProps {
  detail: ReferralDetail;
  referralId: string;
  expertId: string;
}

/** 단계 3: 종합 리포트 미리보기와 민감정보 전달 동의 (RPT-01, CNS-02) */
export function ConsentStep({ detail, referralId, expertId }: ConsentStepProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const now = useNow(POLL_MS);
  const [enteredAt] = useState(() => Date.now());
  // 민감정보 전달은 내담자가 직접 체크해야 동의로 본다
  const [reportChecked, setReportChecked] = useState(false);
  const [transcriptChecked, setTranscriptChecked] = useState(false);

  const reportId = detail.report?.id ?? '';
  const report = useQuery({
    queryKey: queryKeys.report(reportId),
    queryFn: () => getReport(reportId),
    enabled: Boolean(reportId),
    staleTime: Infinity,
    refetchInterval: (query) => (query.state.data?.status === 'generating' ? POLL_MS : false),
  });
  const status = report.data?.status;
  const ready = status === 'ready';
  const generating = Boolean(reportId) && (report.isPending || status === 'generating');
  const waitedTooLong = generating && now - enteredAt > WAIT_LIMIT_MS;
  const expertName =
    detail.candidates.find((candidate) => candidate.provider_id === expertId)?.display_name ?? '';
  const sessionCount = detail.included_session_ids.length;
  const bookingPath = `/c/providers/${expertId}?referral_id=${referralId}`;

  useEffect(() => {
    if (ready) track('referral_report_previewed');
  }, [ready]);

  const target = {
    version: TRANSFER_CONSENT_VERSION,
    referral_id: referralId,
    target_expert_id: expertId,
    report_id: reportId,
    report_version: report.data?.version,
  };

  const consent = useMutation({
    mutationFn: async () => {
      if (reportChecked) {
        await grantConsent({ ...target, type: 'report_transfer' });
      }
      if (transcriptChecked) {
        await grantConsent({ ...target, type: 'transcript_transfer' });
      }
    },
    onSuccess: () => {
      track('consent_granted');
      void queryClient.invalidateQueries({ queryKey: queryKeys.referral(referralId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.consents });
      showToast(REFERRAL.consented, 'success');
      navigate(bookingPath);
    },
    onError: (error) => {
      showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
      if (isApiError(error, 'REPORT_NOT_READY')) void report.refetch();
    },
  });

  // 같은 목록으로 다시 만들기를 요청한다 (REF-07)
  const regenerate = useMutation({
    mutationFn: () => updateReferralSessions(referralId, detail.included_session_ids),
    onSuccess: () => void report.refetch(),
    onError: (error) => {
      showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
    },
  });

  /** 동의하지 않아도 전문 상담은 예약할 수 있다 */
  function proceedWithoutReport() {
    showToast(REFERRAL.skipNotice);
    navigate(bookingPath);
  }

  return (
    <>
      <p className="pt-6.5 text-micro text-fg-muted">{REFERRAL.step3}</p>
      <h1 className="pt-4 text-title-sm font-bold text-fg">{REFERRAL.title3}</h1>
      <p className="pt-4 text-body-sm text-fg-muted">
        {REFERRAL.summary(sessionCount, expertName)}
      </p>
      <p className="pt-4 text-micro text-fg-muted">{REPORT.notice}</p>

      {generating && (
        <div role="status" className="pt-6">
          <p className="pb-4 text-body-sm text-fg-muted">{REFERRAL.generating}</p>
          <Skeleton lines={5} />
          {waitedTooLong && (
            <Button
              block
              variant="secondary"
              className="mt-6"
              onClick={() => navigate(bookingPath)}
            >
              {REFERRAL.bookFirst}
            </Button>
          )}
        </div>
      )}

      {status === 'failed' && (
        <div role="status" className="pt-6">
          <p className="text-body-sm text-fg-muted">{REFERRAL.failed}</p>
          <Button
            block
            size="md"
            variant="secondary"
            className="mt-4"
            loading={regenerate.isPending}
            onClick={() => regenerate.mutate()}
          >
            {REFERRAL.retry}
          </Button>
        </div>
      )}

      {ready && report.data?.client_summary && (
        <>
          <section className="mt-2 border-b border-line pb-3 pt-2.5 text-body-sm">
            <h2 className="font-bold text-fg">{REFERRAL.timelineTitle}</h2>
            <ReportTimeline
              sources={report.data.sources ?? []}
              lines={
                typeof report.data.client_summary === 'string'
                  ? undefined
                  : report.data.client_summary.sessions
              }
            />
          </section>
          <section className="pt-2.5">
            <h2 className="text-body-sm font-bold text-fg">{REFERRAL.reportTitle}</h2>
            <ReportCard summary={report.data.client_summary} />
          </section>

          <fieldset className="pt-4">
            <legend className="text-heading font-bold text-fg">{REFERRAL.consentTitle}</legend>
            <Checkbox
              className="pt-2"
              checked={reportChecked}
              onChange={(event) => setReportChecked(event.target.checked)}
              label={REFERRAL.consentReport}
            />
            <Checkbox
              checked={transcriptChecked}
              onChange={(event) => setTranscriptChecked(event.target.checked)}
              label={REFERRAL.consentTranscript}
            />
            <ul className="pt-1 text-micro text-fg-muted">
              <li>{REFERRAL.consentTarget(expertName)}</li>
              <li>{REFERRAL.consentItems(sessionCount)}</li>
              <li>{REFERRAL.consentPurpose}</li>
              <li>{REFERRAL.consentRevocable}</li>
            </ul>
          </fieldset>
        </>
      )}

      <div className="mt-auto flex flex-col gap-2.5 pb-10 pt-8">
        <Button
          block
          disabled={!ready || (!reportChecked && !transcriptChecked)}
          loading={consent.isPending}
          onClick={() => consent.mutate()}
        >
          {REFERRAL.agree}
        </Button>
        <Button
          block
          variant="secondary"
          disabled={consent.isPending}
          onClick={proceedWithoutReport}
        >
          {REFERRAL.skip}
        </Button>
      </div>
    </>
  );
}
