import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { listMySupervisionRequests, requestSupervision } from '@/api/endpoints/supervisions';
import { isApiError } from '@/api/errors';
import { NotFoundPage } from '@/app/ErrorPages';
import { Screen } from '@/app/layouts/Screen';
import { PageLoader } from '@/app/PageLoader';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextArea } from '@/components/ui/TextArea';
import { MATCHES } from '@/copy/client';
import { errorCopy } from '@/copy/errorMessages';
import { SUPERVISION_REQUEST } from '@/copy/supervision';
import { useProviderSessions } from '@/features/provider/queries';
import { useAppConfig, useFeatureFlag } from '@/hooks/useAppConfig';
import { formatKST } from '@/lib/date';
import { countChars } from '@/lib/text';
import { showToast } from '@/stores/uiStore';

const QUESTION_MIN = 50;
const QUESTION_MAX = 500;
const REQUESTS_KEY = ['supervision-requests', 'trainee'];

function RequestForm() {
  const queryClient = useQueryClient();
  const sessions = useProviderSessions();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const length = countChars(question.trim());
  // 연계되지 않은 완료 세션만 요청할 수 있다
  const candidates = (sessions.data ?? []).filter(
    (session) => session.status === 'COMPLETED' && !session.referral_id,
  );

  const submission = useMutation({
    mutationFn: (id: string) => requestSupervision({ session_id: id, question: question.trim() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: REQUESTS_KEY });
      showToast(SUPERVISION_REQUEST.submitted, 'success');
      setQuestion('');
      setSessionId(null);
    },
    onError: (error) => {
      showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
    },
  });

  return (
    <div className="flex flex-col gap-4 pt-6">
      <fieldset>
        <legend className="text-body-sm font-bold text-fg">
          {SUPERVISION_REQUEST.sessionLabel}
        </legend>
        {sessions.data && candidates.length === 0 && (
          <p className="pt-2 text-body-sm text-fg-muted">{SUPERVISION_REQUEST.noSessions}</p>
        )}
        <div className="flex flex-wrap gap-1.5 pt-3">
          {candidates.map((session) => (
            <Chip
              key={session.session_id}
              selected={sessionId === session.session_id}
              onClick={() => setSessionId(session.session_id ?? null)}
            >
              {[
                session.scheduled_start && formatKST(session.scheduled_start, 'M월 D일'),
                session.client_nickname,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Chip>
          ))}
        </div>
      </fieldset>
      <TextArea
        label={SUPERVISION_REQUEST.questionLabel}
        rows={4}
        minLength={QUESTION_MIN}
        maxLength={QUESTION_MAX}
        length={length}
        showCount
        error={length > QUESTION_MAX ? SUPERVISION_REQUEST.questionTooLong : undefined}
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
      />
      <p className="text-micro text-fg-muted">{SUPERVISION_REQUEST.maskNotice}</p>
      <Button
        block
        disabled={!sessionId || length < QUESTION_MIN || length > QUESTION_MAX}
        loading={submission.isPending}
        onClick={() => sessionId && submission.mutate(sessionId)}
      >
        {SUPERVISION_REQUEST.submit}
      </Button>
    </div>
  );
}

/** T-09 슈퍼비전 요청 (P1). 기능 플래그가 꺼져 있으면 없는 화면으로 본다 */
export function T09SupervisionRequestsPage() {
  const config = useAppConfig();
  const enabled = useFeatureFlag('p1_supervision_requests');
  const requests = useQuery({
    queryKey: REQUESTS_KEY,
    queryFn: listMySupervisionRequests,
    enabled,
  });

  if (config.isPending) return <PageLoader />;
  if (!enabled) return <NotFoundPage />;

  return (
    <Screen>
      <ScreenHeader backTo="/settings" />
      <h1 className="pt-6.5 text-title-sm font-bold text-fg">{SUPERVISION_REQUEST.title}</h1>
      <RequestForm />

      <section aria-labelledby="request-list" className="pb-10 pt-8">
        <h2 id="request-list" className="text-body-sm font-bold text-fg">
          {SUPERVISION_REQUEST.listTitle}
        </h2>
        {requests.data?.length === 0 && (
          <p className="pt-3 text-body-sm text-fg-muted">{SUPERVISION_REQUEST.empty}</p>
        )}
        <ul>
          {(requests.data ?? []).map((item) => (
            <li key={item.id} className="border-b border-line pb-3 pt-2.5 text-body-sm">
              <p className="font-bold text-fg">
                {[
                  formatKST(item.session_date, 'M월 D일'),
                  SUPERVISION_REQUEST.status[item.status],
                  item.fee > 0 ? MATCHES.price(item.fee) : SUPERVISION_REQUEST.free,
                ].join(' · ')}
              </p>
              <p className="whitespace-pre-line pt-1 text-fg-muted">{item.question}</p>
              {item.expert_display && <p className="pt-1 text-fg-muted">{item.expert_display}</p>}
            </li>
          ))}
        </ul>
      </section>
    </Screen>
  );
}
