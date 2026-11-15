import type { EligibleSession } from '@/api/pending';
import { Checkbox } from '@/components/ui/Checkbox';
import { REFERRAL } from '@/copy/referral';
import { formatKST } from '@/lib/date';

import { canToggleSession, MAX_REFERRAL_SESSIONS, toggleSession } from './selection';

interface SessionPickerProps {
  sessions: readonly EligibleSession[];
  selected: readonly string[];
  onChange: (selected: string[]) => void;
  max?: number;
  /** 동의한 뒤에는 포함할 상담을 바꿀 수 없다 */
  locked?: boolean;
}

/** 종합 리포트에 포함할 상담 고르기 (TRD C-12 단계 1, 18-1). */
export function SessionPicker({
  sessions,
  selected,
  onChange,
  max = MAX_REFERRAL_SESSIONS,
  locked = false,
}: SessionPickerProps) {
  return (
    <fieldset>
      <legend className="sr-only">{REFERRAL.title1}</legend>
      <ul>
        {sessions.map((session) => (
          <li key={session.session_id}>
            <Checkbox
              checked={selected.includes(session.session_id)}
              disabled={locked || !canToggleSession(selected, session.session_id, max)}
              onChange={() => onChange(toggleSession(selected, session.session_id, max))}
              label={[
                session.date && formatKST(session.date, 'M월 D일'),
                session.provider_display,
                REFERRAL.reportStatus[session.report_status],
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          </li>
        ))}
      </ul>
      <p className="pt-2 text-micro text-fg-muted">
        {locked ? REFERRAL.locked : REFERRAL.count(selected.length, max)}
      </p>
    </fieldset>
  );
}
