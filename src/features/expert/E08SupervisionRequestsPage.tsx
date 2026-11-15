import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { acceptSupervisionRequest } from '@/api/endpoints/supervisions';
import { isApiError } from '@/api/errors';
import { NotFoundPage } from '@/app/ErrorPages';
import { Screen } from '@/app/layouts/Screen';
import { PageLoader } from '@/app/PageLoader';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { MATCHES } from '@/copy/client';
import { errorCopy } from '@/copy/errorMessages';
import { EXPERT_SUPERVISION } from '@/copy/expertSupervision';
import { SUPERVISION_REQUEST } from '@/copy/supervision';
import { useSupervisionRequests } from '@/features/provider/queries';
import { useAppConfig, useFeatureFlag } from '@/hooks/useAppConfig';
import { formatKST } from '@/lib/date';
import { showToast } from '@/stores/uiStore';

/** E-08 요청함: 수련생이 직접 요청한 슈퍼비전을 수락한다 (SUP-11, P1) */
export function E08SupervisionRequestsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const config = useAppConfig();
  const enabled = useFeatureFlag('p1_supervision_requests');
  const requests = useSupervisionRequests(enabled);

  const acceptance = useMutation({
    mutationFn: acceptSupervisionRequest,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['supervision-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['supervisions', 'expert'] });
      showToast(EXPERT_SUPERVISION.accepted, 'success');
      // 수락하면 같은 작성 폼으로 이어 간다
      navigate(`/e/supervisions/${result.supervision_id}/write`);
    },
    onError: (error) => {
      showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
    },
  });

  if (config.isPending) return <PageLoader />;
  if (!enabled) return <NotFoundPage />;

  const items = requests.data ?? [];

  return (
    <Screen>
      <ScreenHeader backTo="/e/supervisions" />
      <h1 className="pt-6.5 text-title-sm font-bold text-fg">{EXPERT_SUPERVISION.requestsTitle}</h1>
      {requests.isPending && <Skeleton lines={4} className="pt-6" />}
      {requests.data && items.length === 0 && (
        <EmptyState title={EXPERT_SUPERVISION.requestsEmpty} />
      )}
      <ul className="pb-10 pt-2">
        {items.map((item) => (
          <li key={item.id} className="border-b border-line pb-3 pt-3 text-body-sm">
            <p className="font-bold text-fg">
              {[
                item.trainee_display,
                formatKST(item.created_at, 'M월 D일'),
                item.fee > 0 ? MATCHES.price(item.fee) : SUPERVISION_REQUEST.free,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <p className="whitespace-pre-line pt-1 text-fg-muted">{item.question}</p>
            <Button
              size="md"
              variant="secondary"
              className="mt-2"
              loading={acceptance.isPending && acceptance.variables === item.id}
              onClick={() => acceptance.mutate(item.id)}
            >
              {EXPERT_SUPERVISION.accept}
            </Button>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
