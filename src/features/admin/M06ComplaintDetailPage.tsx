import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { decideComplaint, getComplaint } from '@/api/endpoints/admin';
import type { AdminComplaintDetail, ComplaintDecision } from '@/api/pendingAdmin';
import { queryKeys } from '@/api/queryKeys';
import { NotFoundPage } from '@/app/ErrorPages';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextArea } from '@/components/ui/TextArea';
import { ADMIN_COMPLAINTS } from '@/copy/adminOps';
import { COMMON } from '@/copy/fixed';
import { useFeatureFlag } from '@/hooks/useAppConfig';
import { formatKST } from '@/lib/date';
import { countChars } from '@/lib/text';
import { showToast } from '@/stores/uiStore';

import { splitMaskTokens } from './masking';
import { toastApiError } from './toastError';

const LIST_PATH = '/admin/complaints';
const REASON_MAX = 500;
const DECISIONS: readonly ComplaintDecision[] = ['trainee_fault', 'malicious', 'no_fault'];

/** 개인정보를 가린 글. 치환 표시는 눈에 띄게 강조한다 */
function MaskedText({ text }: { text: string }) {
  return (
    <>
      {splitMaskTokens(text).map((part, index) =>
        part.token ? (
          // 한 문장 안의 조각은 순서가 바뀌지 않는다
          <mark
            key={`${index}-${part.text}`}
            className="rounded-sm bg-highlight px-0.5 font-bold text-fg"
          >
            {part.text}
          </mark>
        ) : (
          <span key={`${index}-${part.text}`}>{part.text}</span>
        ),
      )}
    </>
  );
}

/** ①~③ 민원 내용, 마스킹 대화록, 자동 근거 */
function Evidence({ complaint }: { complaint: AdminComplaintDetail }) {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="pb-2 text-body font-bold text-fg">{ADMIN_COMPLAINTS.description}</h2>
        <p className="whitespace-pre-wrap text-body-sm text-fg">
          <MaskedText text={complaint.description} />
        </p>
      </section>

      <section>
        <h2 className="text-body font-bold text-fg">{ADMIN_COMPLAINTS.transcript}</h2>
        <p className="pb-3 pt-1 text-micro text-fg-muted">{ADMIN_COMPLAINTS.transcriptNotice}</p>
        {complaint.masked_transcript.length === 0 ? (
          <p className="text-body-sm text-fg-muted">{ADMIN_COMPLAINTS.transcriptEmpty}</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {complaint.masked_transcript.map((line, index) => (
              <li
                // 대화록은 순서가 바뀌지 않는다
                key={`${index}-${line.text}`}
                className="rounded-sm bg-field px-3 py-2 text-body-sm text-fg"
              >
                <span className="pr-2 font-bold">{ADMIN_COMPLAINTS.speaker[line.role]}</span>
                <MaskedText text={line.text} />
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="pb-2 text-body font-bold text-fg">{ADMIN_COMPLAINTS.evidence}</h2>
        <ul className="list-disc pl-5 text-body-sm text-fg">
          {complaint.auto_evidence.map((item) => (
            <li key={item}>
              <MaskedText text={item} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** ④ 판정 기준 체크리스트 (개요서 6-5). 체크는 심사를 돕는 표시일 뿐 서버로 가지 않는다 */
function Criteria() {
  return (
    <section>
      <h2 className="pb-2 text-body font-bold text-fg">{ADMIN_COMPLAINTS.checklist}</h2>
      {ADMIN_COMPLAINTS.criteria.map((group) => (
        <fieldset key={group.decision} className="pb-3">
          <legend className="text-body-sm font-bold text-fg">
            {ADMIN_COMPLAINTS.decisions[group.decision]} → {group.action}
          </legend>
          {group.cases.map((item) => (
            <Checkbox key={item} label={item} />
          ))}
        </fieldset>
      ))}
      <h3 className="pb-1 text-body-sm font-bold text-fg">{ADMIN_COMPLAINTS.penaltyTitle}</h3>
      <ul className="text-body-sm text-fg-muted">
        {ADMIN_COMPLAINTS.penalties.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

/** ⑤⑥ 판정 3택 + 사유 + 결과 미리보기 → 확인 모달 → CMP-04 */
function DecisionForm({ complaint }: { complaint: AdminComplaintDetail }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<ComplaintDecision | null>(null);
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const ready = decision !== null && reason.trim().length > 0 && countChars(reason) <= REASON_MAX;

  const decide = useMutation({
    mutationFn: (chosen: ComplaintDecision) =>
      decideComplaint(complaint.id, { decision: chosen, reason: reason.trim() }),
    onSuccess: () => {
      showToast(ADMIN_COMPLAINTS.decided, 'success');
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      navigate(LIST_PATH);
    },
    onError: (error) => {
      toastApiError(error);
      setConfirming(false);
    },
  });

  return (
    <section className="flex flex-col gap-4 border-t border-line pt-6">
      <fieldset>
        <legend className="pb-1 text-body font-bold text-fg">
          {ADMIN_COMPLAINTS.decisionLabel}
        </legend>
        {DECISIONS.map((value) => (
          <label
            key={value}
            className="flex min-h-(--size-touch) items-center gap-2 text-body-sm text-fg"
          >
            <input
              type="radio"
              name="complaint-decision"
              value={value}
              checked={decision === value}
              onChange={() => setDecision(value)}
              className="size-5 accent-brand-green"
            />
            {ADMIN_COMPLAINTS.decisions[value]}
          </label>
        ))}
      </fieldset>

      {decision && (
        <div role="status" className="rounded-sm bg-highlight px-3 py-2 text-body-sm text-fg">
          <p className="font-bold">{ADMIN_COMPLAINTS.preview}</p>
          <p className="pt-1">{complaint.preview[decision]}</p>
        </div>
      )}

      <TextArea
        label={ADMIN_COMPLAINTS.reason}
        hint={ADMIN_COMPLAINTS.reasonHint}
        rows={3}
        maxLength={REASON_MAX}
        length={countChars(reason)}
        showCount
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <Button className="self-start" disabled={!ready} onClick={() => setConfirming(true)}>
        {ADMIN_COMPLAINTS.submit}
      </Button>

      <Modal
        open={confirming}
        title={ADMIN_COMPLAINTS.confirmTitle}
        onClose={() => setConfirming(false)}
        footer={
          <>
            <Button block size="md" variant="secondary" onClick={() => setConfirming(false)}>
              {COMMON.cancel}
            </Button>
            <Button
              block
              size="md"
              loading={decide.isPending}
              onClick={() => decision && decide.mutate(decision)}
            >
              {ADMIN_COMPLAINTS.submit}
            </Button>
          </>
        }
      >
        <p className="text-body-sm font-bold text-fg">
          {decision && ADMIN_COMPLAINTS.decisions[decision]}
        </p>
        <p className="pt-2 text-body-sm text-fg">{decision && complaint.preview[decision]}</p>
        <p className="pt-2 text-body-sm text-fg-muted">{ADMIN_COMPLAINTS.confirmBody}</p>
      </Modal>
    </section>
  );
}

function ComplaintDetail() {
  const { id = '' } = useParams();
  const complaint = useQuery({
    queryKey: queryKeys.admin('complaint', { id }),
    queryFn: () => getComplaint(id),
  });
  const data = complaint.data;

  return (
    <>
      <Link to={LIST_PATH} className="text-body-sm font-bold text-fg underline">
        {ADMIN_COMPLAINTS.title}
      </Link>
      <h1 className="pt-4 text-title-sm font-bold text-fg">{ADMIN_COMPLAINTS.detailTitle}</h1>
      {complaint.isPending && <Skeleton lines={8} className="pt-6" />}
      {complaint.isError && (
        <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void complaint.refetch()} />
      )}

      {data && (
        <>
          <p className="pt-2 text-body-sm text-fg-muted">
            {[
              formatKST(data.created_at),
              ADMIN_COMPLAINTS.summary(
                ADMIN_COMPLAINTS.category[data.category],
                data.target_display,
                data.target_strike_count,
              ),
              ADMIN_COMPLAINTS.source[data.source],
            ].join(' · ')}
          </p>
          <div className="grid grid-cols-2 gap-10 py-6">
            <Evidence complaint={data} />
            <div className="flex flex-col gap-8">
              <Criteria />
              {data.decision ? (
                <p className="border-t border-line pt-6 text-body font-bold text-fg">
                  {ADMIN_COMPLAINTS.alreadyDecided(ADMIN_COMPLAINTS.decisions[data.decision])}
                </p>
              ) : (
                <DecisionForm complaint={data} />
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

/** M-06 민원 심사 상세 (CMP-03, CMP-04). 원문 대화는 받지 않고 가린 글만 보여 준다 */
export function M06ComplaintDetailPage() {
  return useFeatureFlag('p1_complaints') ? <ComplaintDetail /> : <NotFoundPage />;
}
