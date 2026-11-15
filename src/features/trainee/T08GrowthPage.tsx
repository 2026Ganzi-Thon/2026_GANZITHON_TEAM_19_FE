import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

import {
  getCertificateDownloadUrl,
  issueCertificate,
  listCertificates,
} from '@/api/endpoints/supervisions';
import { isApiError } from '@/api/errors';
import type { Competency, SupervisionScores } from '@/api/pendingProvider';
import { NotFoundPage } from '@/app/ErrorPages';
import { Screen } from '@/app/layouts/Screen';
import { PageLoader } from '@/app/PageLoader';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { errorCopy } from '@/copy/errorMessages';
import { GROWTH, SUPERVISION } from '@/copy/supervision';
import { useCompetency } from '@/features/provider/queries';
import { useAppConfig, useFeatureFlag } from '@/hooks/useAppConfig';
import { formatKST } from '@/lib/date';
import { showToast } from '@/stores/uiStore';

const SCORE_KEYS: ReadonlyArray<keyof SupervisionScores> = [
  'rapport',
  'empathy',
  'risk',
  'structure',
];
const MAX_SCORE = 5;
const CHART_HEIGHT = 240;
const POLL_MS = 3000;
// 범례가 아래쪽 축 이름과 겹치지 않게 띄운다
const LEGEND_GAP = 12;
// 차트 색은 토큰 변수를 그대로 쓴다
const PRIMARY = 'var(--color-brand-green)';
const SECONDARY = 'var(--color-fg-muted)';
const GRID = 'var(--color-line)';

function toastError(error: unknown): void {
  showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
}

function average(scores: SupervisionScores): number {
  const total = SCORE_KEYS.reduce((sum, key) => sum + scores[key], 0);
  return Math.round((total / SCORE_KEYS.length) * 10) / 10;
}

function Charts({ competency }: { competency: Competency }) {
  const radar = competency.radar;
  if (!radar) return <EmptyState title={GROWTH.empty} />;

  const radarData = SCORE_KEYS.map((key) => ({
    axis: SUPERVISION.scoreLabel[key],
    recent: radar.recent5[key],
    all: radar.all[key],
  }));
  const trendData = competency.trend.map((item) => ({
    date: formatKST(item.submitted_at, 'M/D'),
    score: average(item.scores),
  }));

  return (
    <>
      <section aria-labelledby="radar-title" className="pt-6">
        <h2 id="radar-title" className="text-body-sm font-bold text-fg">
          {GROWTH.radarTitle}
        </h2>
        <div aria-hidden="true">
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <RadarChart data={radarData} outerRadius="62%">
              <PolarGrid stroke={GRID} />
              <PolarAngleAxis dataKey="axis" tick={{ fill: SECONDARY, fontSize: 12 }} />
              <PolarRadiusAxis domain={[0, MAX_SCORE]} tick={false} axisLine={false} />
              <Radar
                name={GROWTH.all}
                dataKey="all"
                stroke={SECONDARY}
                fill={SECONDARY}
                fillOpacity={0.1}
              />
              <Radar
                name={GROWTH.recent}
                dataKey="recent"
                stroke={PRIMARY}
                fill={PRIMARY}
                fillOpacity={0.25}
              />
              <Legend wrapperStyle={{ paddingTop: LEGEND_GAP }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        {/* 차트를 볼 수 없어도 같은 값을 읽을 수 있게 표로도 둔다 */}
        <table className="w-full text-left text-body-sm">
          <thead>
            <tr className="text-fg-muted">
              <th scope="col" className="py-1 font-medium" />
              <th scope="col" className="py-1 font-medium">
                {GROWTH.recent}
              </th>
              <th scope="col" className="py-1 font-medium">
                {GROWTH.all}
              </th>
            </tr>
          </thead>
          <tbody>
            {radarData.map((row) => (
              <tr key={row.axis} className="border-t border-line">
                <th scope="row" className="py-2 font-medium text-fg">
                  {row.axis}
                </th>
                <td className="py-2 text-fg">{row.recent}</td>
                <td className="py-2 text-fg-muted">{row.all}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="trend-title" className="pt-8">
        <h2 id="trend-title" className="text-body-sm font-bold text-fg">
          {GROWTH.trendTitle}
        </h2>
        <div aria-hidden="true">
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart data={trendData} margin={{ top: 16, right: 8, bottom: 0, left: -24 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: SECONDARY, fontSize: 12 }} />
              <YAxis domain={[0, MAX_SCORE]} tick={{ fill: SECONDARY, fontSize: 12 }} />
              <Line name={GROWTH.trendSeries} dataKey="score" stroke={PRIMARY} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ul className="sr-only">
          {trendData.map((item) => (
            <li key={item.date}>{`${item.date} ${GROWTH.trendSeries} ${item.score}`}</li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Certificates({ canIssue }: { canIssue: boolean }) {
  const queryClient = useQueryClient();
  const certificates = useQuery({
    queryKey: ['certificates'],
    queryFn: listCertificates,
    // 발급은 비동기라 만드는 중인 것이 있으면 가끔 다시 묻는다 (certificate:ready 를 놓쳐도 되게)
    refetchInterval: (query) =>
      query.state.data?.some((item) => item.status === 'generating') ? POLL_MS : false,
  });

  const issue = useMutation({
    mutationFn: issueCertificate,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['certificates'] });
      showToast(GROWTH.issued, 'success');
    },
    onError: toastError,
  });
  const download = useMutation({
    mutationFn: getCertificateDownloadUrl,
    onSuccess: (downloadUrl) => {
      window.open(downloadUrl, '_blank', 'noopener');
    },
    onError: toastError,
  });

  return (
    <section aria-labelledby="certificate-title" className="pb-10 pt-8">
      <h2 id="certificate-title" className="text-body-sm font-bold text-fg">
        {GROWTH.certificateTitle}
      </h2>
      <p className="pt-1 text-micro text-fg-muted">{GROWTH.issueRule}</p>
      <Button
        block
        className="mt-3"
        disabled={!canIssue}
        loading={issue.isPending}
        onClick={() => issue.mutate()}
      >
        {GROWTH.issue}
      </Button>
      {certificates.data?.length === 0 && (
        <p className="pt-4 text-body-sm text-fg-muted">{GROWTH.noCertificates}</p>
      )}
      <ul>
        {(certificates.data ?? []).map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 border-b border-line py-3 text-body-sm"
          >
            <span className="flex flex-col gap-1">
              <span className="font-bold text-fg">{item.code}</span>
              <span className="text-fg-muted">
                {[
                  item.issued_at && formatKST(item.issued_at, 'YYYY년 M월 D일'),
                  GROWTH.certificateStatus[item.status],
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
            {item.status === 'ready' && (
              <button
                type="button"
                onClick={() => download.mutate(item.id)}
                className="min-h-(--size-touch) shrink-0 text-caption font-bold text-fg underline"
              >
                {GROWTH.download}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** T-08 역량 차트·증빙서 PDF (P1). 기능 플래그가 꺼져 있으면 없는 화면으로 본다 */
export function T08GrowthPage() {
  const config = useAppConfig();
  const enabled = useFeatureFlag('p1_certificates');
  const competency = useCompetency();

  if (config.isPending) return <PageLoader />;
  if (!enabled) return <NotFoundPage />;

  const totals = competency.data?.totals;

  return (
    <Screen>
      <ScreenHeader backTo="/settings" />
      <h1 className="pt-6.5 text-title-sm font-bold text-fg">{GROWTH.title}</h1>
      {competency.isPending && <Skeleton lines={8} className="pt-6" />}
      {competency.data && <Charts competency={competency.data} />}

      {totals && (
        <section aria-labelledby="totals-title" className="pt-8">
          <h2 id="totals-title" className="text-body-sm font-bold text-fg">
            {GROWTH.totalsTitle}
          </h2>
          <p className="pt-2 text-body-sm text-fg-muted">
            {[
              GROWTH.hours(totals.session_hours),
              GROWTH.supervisions(totals.supervision_count),
              GROWTH.referrals(totals.referral_count),
            ].join(' · ')}
          </p>
        </section>
      )}
      <Certificates canIssue={(totals?.session_count ?? 0) > 0} />
    </Screen>
  );
}
