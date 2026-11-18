import { Link } from 'react-router';

import type { Session } from '@/api/endpoints/sessions';
import { INTAKE } from '@/copy/client';
import { REFERRAL } from '@/copy/referral';
import { SESSION_STATUS_LABEL } from '@/copy/screens';
import { DASHBOARD, PROVIDER_SESSIONS } from '@/copy/work';
import { canEnter } from '@/features/client/sessions';
import { formatKST } from '@/lib/date';

/** 인테이크 카테고리 값을 화면 이름으로 */
export function categoryLabel(category: string | undefined): string {
  return INTAKE.categories.find((item) => item.value === category)?.label ?? '';
}

interface SessionRowProps {
  session: Session;
  now: number;
  /** 상담방 경로의 역할 부분: t 또는 e */
  base: 't' | 'e';
  /** 목록 화면에서는 회기·리포트·연계 표시를 더 보여 준다 */
  detailed?: boolean;
}

/** 상담사가 보는 세션 한 줄: 내담자 닉네임, 카테고리, 시각, 입장 */
export function SessionRow({ session, now, base, detailed = false }: SessionRowProps) {
  const facts = [
    session.scheduled_start && formatKST(session.scheduled_start),
    session.visit_no && PROVIDER_SESSIONS.visit(session.visit_no),
    detailed && session.status && SESSION_STATUS_LABEL[session.status],
  ].filter(Boolean);
  const marks = detailed
    ? [
        session.rebook_of && PROVIDER_SESSIONS.rebook,
        session.report &&
          PROVIDER_SESSIONS.reportStatus(REFERRAL.reportStatus[session.report.status]),
        session.referral_id && PROVIDER_SESSIONS.referred,
        session.supervision_ready && PROVIDER_SESSIONS.supervisionReady,
      ].filter(Boolean)
    : [];
  const open = session.status === 'confirmed' || session.status === 'in_progress';

  return (
    <li className="flex items-center justify-between gap-3 border-b border-line py-3 text-body-sm">
      <span className="flex min-w-0 flex-col gap-1">
        <span className="font-bold text-fg">
          {[session.client_nickname, categoryLabel(session.category)].filter(Boolean).join(' · ')}
        </span>
        <span className="text-fg-muted">{facts.join(' · ')}</span>
        {marks.length > 0 && <span className="text-micro text-fg-muted">{marks.join(' · ')}</span>}
      </span>
      {open &&
        (canEnter(session, now) ? (
          <Link
            to={`/${base}/sessions/${session.session_id}/room`}
            className="flex min-h-(--size-touch) shrink-0 items-center rounded-sm bg-action px-4 text-caption font-bold text-fg-inverse"
          >
            {DASHBOARD.enter}
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="flex min-h-(--size-touch) shrink-0 items-center rounded-sm bg-action-disabled px-4 text-caption font-bold text-fg-inverse"
          >
            {DASHBOARD.enter}
          </span>
        ))}
    </li>
  );
}
