import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { getSupervisionContext, saveSupervision } from '@/api/endpoints/supervisions';
import { isApiError } from '@/api/errors';
import type { RiskRating, SupervisionContext } from '@/api/pendingProvider';
import { Screen } from '@/app/layouts/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ConfirmLeaveModal } from '@/components/ui/ConfirmLeaveModal';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StarRating } from '@/components/ui/StarRating';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { errorCopy } from '@/copy/errorMessages';
import { EXPERT_SUPERVISION } from '@/copy/expertSupervision';
import { COMMON } from '@/copy/fixed';
import { SUPERVISION } from '@/copy/supervision';
import { formatKSTTime } from '@/lib/date';
import { countCharsWithoutSpaces } from '@/lib/text';
import { showToast } from '@/stores/uiStore';

import {
  fromSaved,
  LIMITS,
  MAX_ALTERNATIVES,
  missingItems,
  SCORE_KEYS,
  type SupervisionForm,
  toWrite,
} from './supervisionRules';

const AUTOSAVE_MS = 30_000;
const RISK_RATINGS: readonly RiskRating[] = ['appropriate', 'underestimated', 'overestimated'];

interface ReferenceProps {
  context: SupervisionContext;
  /** 수련생 발화를 누르면 인용으로 넣는다 */
  onQuote: (sessionId: string, text: string) => void;
}

/** 참고 자료 (SUP-02): 권유 사유, 위험도 판단 기록, 연계 리포트 요약, 대화록 마스킹본 */
function Reference({ context, onQuote }: ReferenceProps) {
  const [sessionId, setSessionId] = useState(context.trainee_sessions[0]?.session_id ?? '');
  const session = context.trainee_sessions.find((item) => item.session_id === sessionId);
  const report = context.referral_report;

  return (
    <details className="border-b border-line py-3 text-body-sm">
      <summary className="flex min-h-(--size-touch) cursor-pointer items-center font-bold text-fg">
        {EXPERT_SUPERVISION.referenceTitle}
      </summary>
      {context.trainee_reason && (
        <>
          <h3 className="pt-2 font-bold text-fg">{EXPERT_SUPERVISION.reasonTitle}</h3>
          <p className="pt-1 text-fg-muted">{context.trainee_reason}</p>
        </>
      )}
      {context.trainee_risk_actions.length > 0 && (
        <>
          <h3 className="pt-3 font-bold text-fg">{EXPERT_SUPERVISION.riskActionsTitle}</h3>
          <p className="pt-1 text-fg-muted">{context.trainee_risk_actions.join(' · ')}</p>
        </>
      )}
      {report && (
        <>
          <h3 className="pt-3 font-bold text-fg">{EXPERT_SUPERVISION.reportTitle}</h3>
          <p className="pt-1 text-fg-muted">{report.chief_complaint}</p>
          <p className="pt-1 text-fg-muted">{report.progress}</p>
        </>
      )}

      <h3 className="pt-3 font-bold text-fg">{EXPERT_SUPERVISION.transcriptTitle}</h3>
      <div className="flex flex-wrap gap-1.5 pt-2">
        {context.trainee_sessions.map((item) => (
          <Chip
            key={item.session_id}
            selected={item.session_id === sessionId}
            onClick={() => setSessionId(item.session_id)}
          >
            {EXPERT_SUPERVISION.sessionTab(item.session_no)}
          </Chip>
        ))}
      </div>
      {session?.masked_transcript ? (
        <>
          <p className="pt-2 text-micro text-fg-muted">{EXPERT_SUPERVISION.transcriptHint}</p>
          <ul className="flex flex-col gap-2 pt-2">
            {session.masked_transcript.map((line, index) => (
              // 대화록은 순서가 바뀌지 않는 읽기 전용 목록이다
              <li key={index}>
                <span className="text-micro text-fg-muted">
                  {line.role === 'client'
                    ? EXPERT_SUPERVISION.speakerClient
                    : EXPERT_SUPERVISION.speakerTrainee}
                </span>
                {line.role === 'provider' ? (
                  <button
                    type="button"
                    onClick={() => onQuote(session.session_id, line.text)}
                    className="block min-h-(--size-touch) w-full rounded-sm bg-field px-3 py-2 text-left text-fg underline"
                  >
                    {line.text}
                  </button>
                ) : (
                  <p className="rounded-sm bg-field px-3 py-2 text-fg-muted">{line.text}</p>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="pt-2 text-fg-muted">{EXPERT_SUPERVISION.transcriptMissing}</p>
      )}
    </details>
  );
}

interface WriteFormProps {
  supervisionId: string;
  context: SupervisionContext;
}

function WriteForm({ supervisionId, context }: WriteFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SupervisionForm>(() => fromSaved(context.saved));
  const [savedAt, setSavedAt] = useState<number | null>(null);
  // 마지막으로 저장한 뒤 바뀐 것이 있는지. 자동 저장과 이탈 확인이 본다
  const dirty = useRef(false);
  const latest = useRef(form);
  const submitted = useRef(false);
  const missing = missingItems(form);

  useEffect(() => {
    latest.current = form;
  });

  function change(patch: Partial<SupervisionForm>) {
    dirty.current = true;
    setForm((current) => ({ ...current, ...patch }));
  }

  const draft = useMutation({
    mutationFn: () => saveSupervision(supervisionId, toWrite(latest.current, true)),
    onSuccess: () => {
      dirty.current = false;
      setSavedAt(Date.now());
    },
  });
  const { mutate: saveDraft } = draft;

  // 임시저장은 30초마다 자동으로 한다. 실패하면 다음 차례에 다시 시도한다
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (dirty.current && !submitted.current) saveDraft();
    }, AUTOSAVE_MS);
    return () => window.clearInterval(timer);
  }, [saveDraft]);

  const submission = useMutation({
    mutationFn: () => saveSupervision(supervisionId, toWrite(form, false)),
    onSuccess: () => {
      submitted.current = true;
      void queryClient.invalidateQueries({ queryKey: ['supervisions', 'expert'] });
      void queryClient.invalidateQueries({ queryKey: ['settlements'] });
      const nextId = context.position.next_id;
      if (nextId) {
        showToast(EXPERT_SUPERVISION.submittedMore, 'success');
        navigate(`/e/supervisions/${nextId}/write`, { replace: true });
      } else {
        showToast(EXPERT_SUPERVISION.submittedLast, 'success');
        navigate('/e/settlements', { replace: true });
      }
    },
    onError: (error) => {
      showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
      // 이미 제출된 건이면 목록으로 돌아간다 (409 ALREADY_SUBMITTED)
      if (isApiError(error, 'ALREADY_SUBMITTED')) {
        submitted.current = true;
        navigate('/e/supervisions', { replace: true });
      }
    },
  });

  function quote(sessionId: string, text: string) {
    const emptyIndex = form.alternatives.findIndex((item) => item.quote.trim() === '');
    if (emptyIndex >= 0) {
      change({
        alternatives: form.alternatives.map((item, index) =>
          index === emptyIndex ? { ...item, sessionId, quote: text } : item,
        ),
      });
    } else if (form.alternatives.length < MAX_ALTERNATIVES) {
      change({ alternatives: [...form.alternatives, { sessionId, quote: text, suggestion: '' }] });
    }
  }

  function changeAlternative(index: number, patch: { quote?: string; suggestion?: string }) {
    change({
      alternatives: form.alternatives.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  }

  function over(value: string, limit: { max: number }): string | undefined {
    return countCharsWithoutSpaces(value) > limit.max ? EXPERT_SUPERVISION.tooLong : undefined;
  }

  return (
    <div className="flex grow flex-col">
      <p className="pt-4 text-body-sm text-fg-muted">
        {EXPERT_SUPERVISION.position(context.position.total, context.position.index)}
        {' · '}
        {EXPERT_SUPERVISION.trainee(context.trainee_display)}
      </p>
      <Reference context={context} onQuote={quote} />

      <div className="flex flex-col gap-6 pt-6">
        <TextArea
          label={EXPERT_SUPERVISION.wellDone}
          rows={5}
          minLength={LIMITS.wellDone.min}
          maxLength={LIMITS.wellDone.max}
          length={countCharsWithoutSpaces(form.wellDone)}
          showCount
          error={over(form.wellDone, LIMITS.wellDone)}
          value={form.wellDone}
          onChange={(event) => change({ wellDone: event.target.value })}
        />
        <TextArea
          label={EXPERT_SUPERVISION.blindSpot}
          rows={5}
          minLength={LIMITS.blindSpot.min}
          maxLength={LIMITS.blindSpot.max}
          length={countCharsWithoutSpaces(form.blindSpot)}
          showCount
          error={over(form.blindSpot, LIMITS.blindSpot)}
          value={form.blindSpot}
          onChange={(event) => change({ blindSpot: event.target.value })}
        />

        <fieldset>
          <legend className="text-body-sm font-bold text-fg">
            {EXPERT_SUPERVISION.alternatives}
          </legend>
          <p className="pt-1 text-micro text-fg-muted">{EXPERT_SUPERVISION.alternativesHint}</p>
          <ul className="flex flex-col gap-4 pt-3">
            {form.alternatives.map((item, index) => (
              // 항목은 최대 2개이고 순서로만 구분된다
              <li key={index} className="flex flex-col gap-2 border-b border-line pb-4">
                <TextField
                  label={EXPERT_SUPERVISION.quote}
                  value={item.quote}
                  onChange={(event) => changeAlternative(index, { quote: event.target.value })}
                />
                <TextArea
                  label={EXPERT_SUPERVISION.suggestion}
                  rows={2}
                  minLength={LIMITS.suggestion.min}
                  maxLength={LIMITS.suggestion.max}
                  length={countCharsWithoutSpaces(item.suggestion)}
                  showCount
                  error={over(item.suggestion, LIMITS.suggestion)}
                  value={item.suggestion}
                  onChange={(event) => changeAlternative(index, { suggestion: event.target.value })}
                />
                {form.alternatives.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      change({
                        alternatives: form.alternatives.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      })
                    }
                    className="min-h-(--size-touch) self-start text-caption text-fg-muted underline"
                  >
                    {EXPERT_SUPERVISION.removeAlternative}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {form.alternatives.length < MAX_ALTERNATIVES && (
            <Button
              size="md"
              variant="secondary"
              className="mt-3"
              onClick={() =>
                change({ alternatives: [...form.alternatives, { quote: '', suggestion: '' }] })
              }
            >
              {EXPERT_SUPERVISION.addAlternative}
            </Button>
          )}
        </fieldset>

        <fieldset>
          <legend className="text-body-sm font-bold text-fg">{EXPERT_SUPERVISION.risk}</legend>
          <div className="flex flex-wrap gap-1.5 pb-3 pt-3">
            {RISK_RATINGS.map((rating) => (
              <Chip
                key={rating}
                selected={form.riskRating === rating}
                onClick={() => change({ riskRating: rating })}
              >
                {SUPERVISION.riskRating[rating]}
              </Chip>
            ))}
          </div>
          <TextArea
            label={EXPERT_SUPERVISION.riskComment}
            rows={3}
            minLength={LIMITS.riskComment.min}
            maxLength={LIMITS.riskComment.max}
            length={countCharsWithoutSpaces(form.riskComment)}
            showCount
            error={over(form.riskComment, LIMITS.riskComment)}
            value={form.riskComment}
            onChange={(event) => change({ riskComment: event.target.value })}
          />
        </fieldset>

        <TextArea
          label={EXPERT_SUPERVISION.nextAction}
          rows={3}
          minLength={LIMITS.nextAction.min}
          maxLength={LIMITS.nextAction.max}
          length={countCharsWithoutSpaces(form.nextAction)}
          showCount
          error={over(form.nextAction, LIMITS.nextAction)}
          value={form.nextAction}
          onChange={(event) => change({ nextAction: event.target.value })}
        />

        <fieldset>
          <legend className="text-body-sm font-bold text-fg">{EXPERT_SUPERVISION.scores}</legend>
          <ul className="pt-2">
            {SCORE_KEYS.map((key) => (
              <li key={key} className="flex items-center justify-between gap-3">
                <span className="text-body-sm text-fg">{SUPERVISION.scoreLabel[key]}</span>
                <StarRating
                  label={SUPERVISION.scoreLabel[key]}
                  itemLabel={(value) =>
                    `${SUPERVISION.scoreLabel[key]} ${SUPERVISION.score(value)}`
                  }
                  value={form.scores[key]}
                  onChange={(value) => change({ scores: { ...form.scores, [key]: value } })}
                />
              </li>
            ))}
          </ul>
        </fieldset>
      </div>

      {missing.length > 0 && (
        <section aria-live="polite" className="pt-6 text-body-sm">
          <h2 className="font-bold text-fg">{EXPERT_SUPERVISION.missingTitle}</h2>
          <ul className="pt-1 text-fg-muted">
            {missing.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-auto flex flex-col gap-2 pb-10 pt-8">
        {savedAt !== null && (
          <p role="status" className="text-micro text-fg-muted">
            {EXPERT_SUPERVISION.autoSaved(formatKSTTime(savedAt))}
          </p>
        )}
        <Button block variant="secondary" loading={draft.isPending} onClick={() => saveDraft()}>
          {EXPERT_SUPERVISION.saveDraft}
        </Button>
        <Button
          block
          disabled={missing.length > 0}
          loading={submission.isPending}
          onClick={() => submission.mutate()}
        >
          {EXPERT_SUPERVISION.submit}
        </Button>
        {context.position.next_id && (
          <Link
            to={`/e/supervisions/${context.position.next_id}/write`}
            className="flex min-h-(--size-touch) items-center self-center text-caption font-bold text-fg underline"
          >
            {COMMON.next}
          </Link>
        )}
      </div>
      <ConfirmLeaveModal when={() => dirty.current && !submitted.current} />
    </div>
  );
}

/** E-08 슈퍼비전 작성 (SUP-02, SUP-03) */
export function E08SupervisionWritePage() {
  const { id = '' } = useParams();
  const context = useQuery({
    queryKey: ['supervision-context', id],
    queryFn: () => getSupervisionContext(id),
    staleTime: Infinity,
    gcTime: 0,
  });

  return (
    <Screen>
      <ScreenHeader backTo="/e/supervisions" />
      <h1 className="pt-6.5 text-title-sm font-bold text-fg">{EXPERT_SUPERVISION.writeTitle}</h1>
      {context.isPending && <Skeleton lines={8} className="pt-6" />}
      {context.isError && (
        <ErrorState
          title={COMMON.serverErrorTitle}
          description={errorCopy(isApiError(context.error) ? context.error.code : '').message}
          onRetry={() => void context.refetch()}
        />
      )}
      {context.data && <WriteForm key={id} supervisionId={id} context={context.data} />}
    </Screen>
  );
}
