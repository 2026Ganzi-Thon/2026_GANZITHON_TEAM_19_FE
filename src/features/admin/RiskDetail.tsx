import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import {
  ackRiskEvent,
  escalateRiskEvent,
  listUsers,
  resolveRiskEvent,
} from '@/api/endpoints/admin';
import type { RiskEvent } from '@/api/pendingAdmin';
import { queryKeys } from '@/api/queryKeys';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { TextArea } from '@/components/ui/TextArea';
import { ADMIN_RISKS } from '@/copy/adminOps';
import { EXPERT_REFERRAL } from '@/copy/expertReferral';
import { cx } from '@/lib/cx';
import { formatKST } from '@/lib/date';
import { countChars } from '@/lib/text';
import { showToast } from '@/stores/uiStore';

import { toastApiError } from './toastError';

const NOTE_MAX = 500;
const EXPERT_FILTER = { role: 'expert', status: 'active' };

type Action =
  | { type: 'ack' }
  | { type: 'escalate'; expertId: string }
  | { type: 'resolve'; note: string; falsePositive: boolean };

const DONE_COPY: Record<Action['type'], string> = {
  ack: ADMIN_RISKS.ackDone,
  escalate: ADMIN_RISKS.escalateDone,
  resolve: ADMIN_RISKS.resolveDone,
};

function runAction(eventId: string, action: Action): Promise<void> {
  if (action.type === 'ack') return ackRiskEvent(eventId);
  if (action.type === 'escalate') return escalateRiskEvent(eventId, action.expertId);
  return resolveRiskEvent(eventId, { note: action.note, false_positive: action.falsePositive });
}

interface RiskDetailProps {
  event: RiskEvent;
  onDone: () => void;
}

/** M-04 드로어: 감지 근거, 판정 출처, 조치 기록과 확인·전문가 연결·종결 (RSK-02, RSK-03) */
export function RiskDetail({ event, onDone }: RiskDetailProps) {
  const [mode, setMode] = useState<'idle' | 'escalate' | 'resolve'>('idle');
  const [expertId, setExpertId] = useState('');
  const [note, setNote] = useState('');
  const [falsePositive, setFalsePositive] = useState(false);
  const experts = useQuery({
    queryKey: queryKeys.admin('users', EXPERT_FILTER),
    queryFn: () => listUsers(EXPERT_FILTER),
    enabled: mode === 'escalate',
  });
  const expertOptions = experts.data?.items ?? [];
  const act = useMutation({
    mutationFn: (action: Action) => runAction(event.id, action),
    onSuccess: (_result, action) => {
      showToast(DONE_COPY[action.type], 'success');
      onDone();
    },
    onError: toastApiError,
  });
  const pending = act.isPending ? act.variables?.type : undefined;
  const detector = [
    ADMIN_RISKS.detectors[event.detector],
    typeof event.score === 'number' && ADMIN_RISKS.score(event.score),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-col gap-6 text-body-sm">
      <p className="font-bold text-fg">
        {[
          EXPERT_REFERRAL.riskLevel[event.level],
          ADMIN_RISKS.sources[event.source],
          event.client_nickname,
          event.false_positive && ADMIN_RISKS.falsePositiveTag,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>

      <section>
        <h3 className="pb-2 font-bold text-fg">{ADMIN_RISKS.evidence}</h3>
        <ul aria-label={ADMIN_RISKS.context} className="flex flex-col gap-1.5">
          {event.context.map((line, index) => (
            <li
              // 앞뒤 메시지는 순서가 바뀌지 않는다
              key={`${index}-${line}`}
              className={cx(
                'rounded-sm px-3 py-2',
                line === event.evidence ? 'bg-danger-bg font-bold text-danger' : 'bg-field text-fg',
              )}
            >
              {line}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="pb-1 font-bold text-fg">{ADMIN_RISKS.detector}</h3>
        <p className="text-fg">{detector}</p>
      </section>

      <section>
        <h3 className="pb-2 font-bold text-fg">{ADMIN_RISKS.timeline}</h3>
        <ol className="flex flex-col gap-1">
          {event.timeline.map((item) => (
            <li key={`${item.at}-${item.action}`} className="flex gap-3 text-fg">
              <span className="shrink-0 text-fg-muted">{formatKST(item.at)}</span>
              <span>{item.action}</span>
            </li>
          ))}
        </ol>
      </section>

      {event.status !== 'resolved' && (
        <section className="flex flex-col gap-3 border-t border-line pt-4">
          <div className="flex flex-wrap gap-2">
            {event.status === 'open' && (
              <Button
                size="md"
                loading={pending === 'ack'}
                onClick={() => act.mutate({ type: 'ack' })}
              >
                {ADMIN_RISKS.ack}
              </Button>
            )}
            {event.status !== 'escalated' && (
              <Button size="md" variant="secondary" onClick={() => setMode('escalate')}>
                {ADMIN_RISKS.escalate}
              </Button>
            )}
            <Button size="md" variant="secondary" onClick={() => setMode('resolve')}>
              {ADMIN_RISKS.resolve}
            </Button>
          </div>

          {mode === 'escalate' && (
            <div className="flex flex-col gap-2">
              <label htmlFor="risk-expert" className="font-bold text-fg">
                {ADMIN_RISKS.expertLabel}
              </label>
              <select
                id="risk-expert"
                value={expertId}
                onChange={(changeEvent) => setExpertId(changeEvent.target.value)}
                className="min-h-(--size-touch) rounded-sm border border-border bg-field px-3 text-body-sm text-fg"
              >
                <option value="">{ADMIN_RISKS.expertPlaceholder}</option>
                {expertOptions.map((expert) => (
                  <option key={expert.id} value={expert.id}>
                    {expert.display_name ?? expert.nickname}
                  </option>
                ))}
              </select>
              {experts.data && expertOptions.length === 0 && (
                <p className="text-fg-muted">{ADMIN_RISKS.noExpert}</p>
              )}
              <Button
                size="md"
                disabled={!expertId}
                loading={pending === 'escalate'}
                onClick={() => act.mutate({ type: 'escalate', expertId })}
              >
                {ADMIN_RISKS.escalateConfirm}
              </Button>
            </div>
          )}

          {mode === 'resolve' && (
            <div className="flex flex-col gap-2">
              <TextArea
                label={ADMIN_RISKS.note}
                hint={ADMIN_RISKS.noteRequired}
                rows={3}
                maxLength={NOTE_MAX}
                length={countChars(note)}
                showCount
                value={note}
                onChange={(changeEvent) => setNote(changeEvent.target.value)}
              />
              <Checkbox
                checked={falsePositive}
                onChange={(changeEvent) => setFalsePositive(changeEvent.target.checked)}
                label={ADMIN_RISKS.falsePositive}
              />
              <Button
                size="md"
                variant="danger"
                disabled={note.trim().length === 0 || countChars(note) > NOTE_MAX}
                loading={pending === 'resolve'}
                onClick={() => act.mutate({ type: 'resolve', note: note.trim(), falsePositive })}
              >
                {ADMIN_RISKS.resolveConfirm}
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
