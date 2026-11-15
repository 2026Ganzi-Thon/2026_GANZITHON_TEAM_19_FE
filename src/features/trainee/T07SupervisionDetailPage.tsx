import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useParams } from 'react-router';

import { getTraineeSupervision } from '@/api/endpoints/supervisions';
import type { SupervisionScores } from '@/api/pendingProvider';
import { Screen } from '@/app/layouts/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { COMMON } from '@/copy/fixed';
import { SUPERVISION } from '@/copy/supervision';

const SCORE_KEYS: ReadonlyArray<keyof SupervisionScores> = [
  'rapport',
  'empathy',
  'risk',
  'structure',
];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line pb-4 pt-4 text-body-sm">
      <h2 className="font-bold text-fg">{title}</h2>
      {children}
    </section>
  );
}

/** T-07 슈퍼비전 피드백 상세. 열면 서버가 읽음으로 기록한다 */
export function T07SupervisionDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const supervision = useQuery({
    queryKey: ['supervisions', 'trainee', id],
    queryFn: () => getTraineeSupervision(id),
    staleTime: Infinity,
  });
  const data = supervision.data;
  const loaded = data !== undefined;

  useEffect(() => {
    // 읽음 표시가 목록과 대시보드에 반영되게 한다
    if (loaded)
      void queryClient.invalidateQueries({ queryKey: ['supervisions', 'trainee'], exact: true });
  }, [loaded, queryClient]);

  return (
    <Screen>
      <ScreenHeader backTo="/t/supervisions" />
      <h1 className="pt-6.5 text-title-sm font-bold text-fg">{SUPERVISION.detailTitle}</h1>
      {supervision.isPending && <Skeleton lines={8} className="pt-6" />}
      {supervision.isError && (
        <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void supervision.refetch()} />
      )}

      {data && (
        <div className="pb-10">
          <p className="pt-4 text-body-sm text-fg-muted">
            {SUPERVISION.target(data.session_count, data.expert_display)}
          </p>
          <Card title={SUPERVISION.wellDone}>
            <p className="whitespace-pre-line pt-1 text-fg-muted">{data.well_done}</p>
          </Card>
          <Card title={SUPERVISION.blindSpot}>
            <p className="whitespace-pre-line pt-1 text-fg-muted">{data.blind_spot}</p>
          </Card>
          <Card title={SUPERVISION.alternatives}>
            <ul className="flex flex-col gap-3 pt-2">
              {data.alternative_responses.map((item) => (
                <li key={`${item.quote}-${item.suggestion}`}>
                  <p className="text-micro text-fg-muted">{SUPERVISION.quote}</p>
                  <p className="rounded-sm bg-field px-3 py-2 text-fg-muted">{item.quote}</p>
                  <p className="pt-2 text-micro text-fg-muted">{SUPERVISION.suggestion}</p>
                  <p className="rounded-sm bg-highlight px-3 py-2 text-fg">{item.suggestion}</p>
                </li>
              ))}
            </ul>
          </Card>
          <Card title={SUPERVISION.riskTitle}>
            <p className="pt-1 font-bold text-fg">{SUPERVISION.riskRating[data.risk_rating]}</p>
            <p className="whitespace-pre-line pt-1 text-fg-muted">{data.risk_comment}</p>
          </Card>
          <Card title={SUPERVISION.nextAction}>
            <p className="whitespace-pre-line pt-1 text-fg-muted">{data.next_action}</p>
          </Card>
          <Card title={SUPERVISION.scoresTitle}>
            <dl className="grid grid-cols-2 gap-3 pt-2">
              {SCORE_KEYS.map((key) => (
                <div key={key}>
                  <dt className="text-fg-muted">{SUPERVISION.scoreLabel[key]}</dt>
                  <dd className="font-bold text-fg">{SUPERVISION.score(data.scores[key])}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      )}
    </Screen>
  );
}
