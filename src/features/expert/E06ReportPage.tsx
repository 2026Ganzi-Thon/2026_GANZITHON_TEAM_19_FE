import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useParams } from 'react-router';

import { getExpertReport } from '@/api/endpoints/expert';
import { isApiError } from '@/api/errors';
import type { ExpertReport } from '@/api/pendingProvider';
import { queryKeys } from '@/api/queryKeys';
import { Screen } from '@/app/layouts/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Watermark } from '@/components/ui/Watermark';
import { errorCopy } from '@/copy/errorMessages';
import { EXPERT_REFERRAL, EXPERT_REPORT } from '@/copy/expertReferral';
import { COMMON } from '@/copy/fixed';
import { formatKST } from '@/lib/date';
import { useAuthStore } from '@/stores/authStore';

const POLL_MS = 5000;
const UNKNOWN = '-';
const SCOPE_LABEL: Record<string, string> = {
  report: EXPERT_REPORT.scopeReport,
  transcript: EXPERT_REPORT.scopeTranscript,
};

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-line pb-4 pt-4 text-body-sm">
      <h2 className="font-bold text-fg">{title}</h2>
      {children}
    </section>
  );
}

function ReportBody({ report }: { report: ExpertReport }) {
  const content = report.content;
  if (!content) return null;

  return (
    <>
      <Block title={EXPERT_REPORT.timeline}>
        <ol className="flex flex-col gap-3 pt-2">
          {content.timeline.map((item) => {
            const meta = report.sources_meta?.find(
              (source) => source.session_no === item.session_no,
            );
            return (
              <li key={item.session_no}>
                <p className="font-medium text-fg">
                  {EXPERT_REPORT.sessionLine(
                    item.session_no,
                    formatKST(item.session_date, 'M월 D일'),
                    item.trainee_label,
                    meta?.duration_min ?? 0,
                  )}
                </p>
                <p className="text-fg-muted">
                  {EXPERT_REPORT.mood(item.mood_before ?? UNKNOWN, item.mood_after ?? UNKNOWN)}
                </p>
                <ul className="list-disc pl-5 text-fg-muted">
                  {item.key_points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      </Block>

      <Block title={EXPERT_REPORT.chiefComplaint}>
        <p className="whitespace-pre-line pt-1 text-fg-muted">{content.chief_complaint}</p>
      </Block>

      <Block title={EXPERT_REPORT.distortions}>
        <ul className="flex flex-col gap-2 pt-2">
          {content.distortions.map((item) => (
            <li key={`${item.name}-${item.session_no}`}>
              <p className="font-medium text-fg">
                {item.name} · {EXPERT_REPORT.sessionRef(item.session_no)}
              </p>
              <p className="text-fg-muted">{item.evidence}</p>
            </li>
          ))}
        </ul>
      </Block>

      <Block title={EXPERT_REPORT.triggers}>
        <p className="pt-1 text-fg-muted">{content.triggers.join(' · ')}</p>
        <h3 className="pt-3 font-bold text-fg">{EXPERT_REPORT.defenses}</h3>
        <p className="pt-1 text-fg-muted">{content.defenses.join(' · ')}</p>
      </Block>

      <Block title={EXPERT_REPORT.progress}>
        <p className="whitespace-pre-line pt-1 text-fg-muted">{content.progress}</p>
      </Block>

      <Block title={EXPERT_REPORT.redFlag}>
        <p className="pt-1 font-bold text-danger">
          {EXPERT_REPORT.redFlagMax(EXPERT_REFERRAL.riskLevel[content.red_flag.max_level])}
        </p>
        <ul className="pt-1 text-fg-muted">
          {content.red_flag.history.map((item) => (
            <li key={`${item.session_no}-${item.evidence}`}>
              {EXPERT_REPORT.sessionRef(item.session_no)} · {EXPERT_REFERRAL.riskLevel[item.level]}{' '}
              · {item.evidence}
            </li>
          ))}
        </ul>
      </Block>

      <Block title={EXPERT_REPORT.focus}>
        <ol className="list-decimal pl-5 pt-1 text-fg-muted">
          {content.focus_suggestions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </Block>

      {report.consent && (
        <Block title={EXPERT_REPORT.consent}>
          <p className="pt-1 text-fg-muted">
            {EXPERT_REPORT.consentLine(
              formatKST(report.consent.granted_at),
              report.consent.report_version,
            )}
          </p>
          <p className="text-fg-muted">
            {report.consent.scopes.map((scope) => SCOPE_LABEL[scope] ?? scope).join(' · ')}
          </p>
        </Block>
      )}
    </>
  );
}

/** E-06 AI 연계 리포트 상세 (RPT-02). 열람은 서버가 감사 로그로 남긴다. 복사·인쇄 버튼은 두지 않는다 */
export function E06ReportPage() {
  const { reportId = '' } = useParams();
  const expertName = useAuthStore(
    (state) => state.me?.provider_profile?.display_name ?? state.me?.nickname ?? '',
  );
  const report = useQuery({
    queryKey: queryKeys.report(reportId),
    queryFn: () => getExpertReport(reportId),
    // 동의가 없거나 철회된 경우(403)는 다시 시도해도 같아서 한 번만 묻는다
    retry: false,
    staleTime: Infinity,
    refetchInterval: (query) => (query.state.data?.status === 'generating' ? POLL_MS : false),
  });
  const error = report.error;

  return (
    <Screen className="relative">
      <ScreenHeader backTo="/e/referrals" />
      <h1 className="pt-6.5 text-title-sm font-bold text-fg">{EXPERT_REPORT.title}</h1>
      <p className="pt-4 text-micro text-fg-muted">{EXPERT_REPORT.notice}</p>

      {report.isPending && <Skeleton lines={8} className="pt-6" />}
      {isApiError(error, 'NO_CONSENT') && (
        <ErrorState
          title={EXPERT_REPORT.noConsentTitle}
          description={EXPERT_REPORT.noConsentBody}
        />
      )}
      {isApiError(error, 'CONSENT_REVOKED') && <ErrorState title={EXPERT_REPORT.revokedTitle} />}
      {report.isError &&
        !isApiError(error, 'NO_CONSENT') &&
        !isApiError(error, 'CONSENT_REVOKED') && (
          <ErrorState
            title={COMMON.serverErrorTitle}
            description={errorCopy(isApiError(error) ? error.code : '').message}
            onRetry={() => void report.refetch()}
          />
        )}

      {report.data?.status === 'generating' && (
        <div role="status" className="pt-6">
          <p className="pb-4 text-body-sm text-fg-muted">{EXPERT_REPORT.generating}</p>
          <Skeleton lines={6} />
        </div>
      )}
      {report.data?.status === 'ready' && (
        <div className="select-none pb-10 pt-2">
          <ReportBody report={report.data} />
          <Watermark text={EXPERT_REPORT.watermark(expertName)} />
        </div>
      )}
    </Screen>
  );
}
