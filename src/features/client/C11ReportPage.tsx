import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { createReferral } from '@/api/endpoints/referrals';
import { getReport } from '@/api/endpoints/reports';
import { isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { Screen } from '@/app/layouts/Screen';
import { CrisisButton } from '@/components/crisis/CrisisButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { ReportCard } from '@/components/report/ReportCard';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { errorCopy } from '@/copy/errorMessages';
import { COMMON } from '@/copy/fixed';
import { REPORT } from '@/copy/referral';
import { track } from '@/lib/analytics';
import { formatKST } from '@/lib/date';
import { showToast } from '@/stores/uiStore';

const POLL_MS = 5000;
const PAST_SESSIONS = '/c/sessions?tab=past';

/** C-11 상담 정리(세션 리포트)·전문 상담 제안 */
export function C11ReportPage() {
  const { reportId = '' } = useParams();
  const navigate = useNavigate();
  const report = useQuery({
    queryKey: queryKeys.report(reportId),
    queryFn: () => getReport(reportId),
    staleTime: Infinity,
    // report:ready 이벤트로 다시 받지만, 이벤트를 놓쳐도 멈추지 않게 만드는 중에는 가끔 다시 묻는다
    refetchInterval: (query) => (query.state.data?.status === 'generating' ? POLL_MS : false),
  });
  const data = report.data;
  const source = data?.sources?.[0];
  const ready = data?.status === 'ready';

  useEffect(() => {
    if (ready) track('report_viewed');
  }, [ready]);

  const referral = useMutation({
    mutationFn: createReferral,
    onSuccess: (created) => {
      if (!created.id) {
        showToast(errorCopy('').message, 'error');
        return;
      }
      track('referral_started');
      navigate(`/c/referrals/${created.id}`);
    },
    onError: (error) => {
      showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
    },
  });

  return (
    <Screen>
      <ScreenHeader backTo={PAST_SESSIONS} right={<CrisisButton />} />
      {report.isPending && <Skeleton lines={6} className="pt-8" />}
      {report.isError && (
        <ErrorState
          title={COMMON.serverErrorTitle}
          description={errorCopy(isApiError(report.error) ? report.error.code : '').message}
          requestId={isApiError(report.error) ? report.error.requestId : undefined}
          onRetry={() => void report.refetch()}
        />
      )}

      {data && (
        <>
          <h1 className="pt-6.5 text-title-sm font-bold text-fg">{REPORT.title}</h1>
          {source && (
            <p className="pt-4 text-body-sm text-fg-muted">
              {REPORT.meta(
                formatKST(source.date, 'M월 D일'),
                source.provider_display,
                source.session_no,
              )}
            </p>
          )}
          <p className="pt-4 text-micro text-fg-muted">{REPORT.notice}</p>

          {data.status === 'generating' && (
            <div role="status" className="pt-6">
              <p className="pb-4 text-body-sm text-fg-muted">{REPORT.generating}</p>
              <Skeleton lines={6} />
            </div>
          )}
          {data.status === 'failed' && (
            <p role="status" className="pt-6 text-body-sm text-fg-muted">
              {REPORT.failed}
            </p>
          )}

          {ready && data.client_summary && (
            <>
              <div className="pt-2">
                <ReportCard summary={data.client_summary} />
              </div>
              <section className="border-b border-line pb-3 pt-2.5 text-body-sm">
                {data.trainee_suggested_referral && (
                  <p className="mb-2 inline-block rounded-md bg-highlight px-2 py-1 text-micro font-bold text-fg">
                    {REPORT.traineeSuggested}
                  </p>
                )}
                <h2 className="font-bold text-fg">{REPORT.suggestTitle}</h2>
                <p className="pt-1 text-fg-muted">{REPORT.suggestBody}</p>
              </section>
              <Link
                to={PAST_SESSIONS}
                className="flex min-h-(--size-touch) items-center self-start text-caption font-bold text-fg underline"
              >
                {REPORT.pastReports}
              </Link>
              <div className="mt-auto pb-10 pt-8">
                <Button
                  block
                  disabled={!source}
                  loading={referral.isPending}
                  onClick={() => source && referral.mutate(source.session_id)}
                >
                  {REPORT.explore}
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </Screen>
  );
}
