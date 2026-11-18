import type {
  ClientReport,
  ClientSummary,
  Consent,
  ReferralDetail,
  ReportStatus,
} from '@/api/pending';
import type { Schema } from '@/api/types';

import { MOCK_PRICE, mockDb, type MockSession } from './db';

// 상담 정리·연계·동의·민원의 목 데이터 (RPT, REF, CNS, CMP). 리포트는 만들어진 뒤 몇 초가 지나면 ready 가 된다.
export const SESSION_REPORT_DELAY_MS = 5000;
const REFERRAL_REPORT_DELAY_MS = 4000;
const SEED_SESSION_ID = '00000000-0000-7000-8000-00000000a002';
const SEED_REPORT_ID = '00000000-0000-7000-8000-00000000b002';

interface StoredReport {
  scope: ClientReport['scope'];
  version: number;
  readyAt: number;
  sessionIds: string[];
  traineeSuggested: boolean;
}

interface StoredReferral {
  detail: ReferralDetail;
  clientId: string | undefined;
}

type StoredConsent = Consent & { userId: string | undefined; referralId?: string };

const SUMMARY: ClientSummary = {
  chief_complaint: '일과 휴식 사이에서 느끼는 부담을 나눴어요.',
  thinking_patterns: '잘해야 한다는 생각이 마음을 무겁게 할 때가 있어요.',
  triggers: '업무가 쌓이는 순간 불안감이 커져요.',
  coping: '혼자 버티기보다 잠깐 쉬어 가는 방법을 찾아보고 있어요.',
  safety_check: '필요할 때 도움을 요청할 수 있어요.',
};

const SESSION_LINES = ['업무 부담', '휴식에 대한 불안', '관계 스트레스'];

export const reportDb = {
  reports: new Map<string, StoredReport>([
    [
      SEED_REPORT_ID,
      {
        scope: 'session',
        version: 1,
        readyAt: 0,
        sessionIds: [SEED_SESSION_ID],
        traineeSuggested: true,
      },
    ],
  ]),
  /** 세션 ID → 세션 리포트 ID */
  sessionReports: new Map<string, string>([[SEED_SESSION_ID, SEED_REPORT_ID]]),
  referrals: new Map<string, StoredReferral>(),
  consents: [] as StoredConsent[],
  complaintSessionIds: new Set<string>(),
};

function statusOf(report: StoredReport): ReportStatus {
  return Date.now() >= report.readyAt ? 'ready' : 'generating';
}

function providerDisplay(session: MockSession | undefined): string {
  return (
    mockDb.providers.find((provider) => provider.provider_id === session?.provider_id)
      ?.display_name ?? ''
  );
}

/** 코칭 세션이 끝나면 세션 리포트를 만든다. 리포트 ID를 돌려준다 */
export function createSessionReport(sessionId: string): string {
  const existing = reportDb.sessionReports.get(sessionId);
  if (existing) return existing;
  const id = crypto.randomUUID();
  reportDb.reports.set(id, {
    scope: 'session',
    version: 1,
    readyAt: Date.now() + SESSION_REPORT_DELAY_MS,
    sessionIds: [sessionId],
    traineeSuggested: false,
  });
  reportDb.sessionReports.set(sessionId, id);
  return id;
}

/** SES-02 응답에 붙는 리포트 요약 */
export function sessionReportOf(sessionId: string | undefined) {
  const id = reportDb.sessionReports.get(sessionId ?? '');
  const report = id ? reportDb.reports.get(id) : undefined;
  return id && report ? { id, status: statusOf(report) } : null;
}

/** RPT-01 응답 */
export function reportView(reportId: string): ClientReport | undefined {
  const report = reportDb.reports.get(reportId);
  if (!report) return undefined;
  const status = statusOf(report);
  const sources = report.sessionIds.map((sessionId, index) => {
    const session = mockDb.sessions.find((item) => item.session_id === sessionId);
    return {
      session_id: sessionId,
      session_no: index + 1,
      date: session?.scheduled_start ?? new Date().toISOString(),
      provider_display: providerDisplay(session),
    };
  });
  const sessions =
    report.scope === 'referral'
      ? sources.map((source, index) => ({
          session_no: source.session_no,
          line: SESSION_LINES[index % SESSION_LINES.length] ?? '',
        }))
      : undefined;
  return {
    scope: report.scope,
    status,
    version: report.version,
    client_summary: status === 'ready' ? { ...SUMMARY, sessions } : null,
    risk_level_label: status === 'ready' ? SUMMARY.safety_check : null,
    trainee_suggested_referral: report.traineeSuggested,
    sources,
  };
}

function expertCandidates(): Schema<'Match'>[] {
  return mockDb.providers
    .filter((provider) => provider.track === 'expert')
    .map((provider, index) => ({
      provider_id: provider.provider_id,
      display_name: provider.display_name,
      track: 'professional',
      specialties: provider.specialties,
      earliest_slot: mockDb.slots
        .filter((slot) => slot.provider_id === provider.provider_id && slot.status === 'open')
        .map((slot) => slot.start_at ?? '')
        .sort()[0],
      price: MOCK_PRICE.professional,
      score_rank: index + 1,
    }));
}

/** REF-01: 내 완료된 코칭 세션 중 리포트가 있는 회기를 모아 연계를 만든다 */
export function createReferral(clientId: string | undefined): ReferralDetail {
  const existing = [...reportDb.referrals.values()].find(
    (item) => item.clientId === clientId && item.detail.referral.status === 'suggested',
  );
  if (existing) return existing.detail;

  const eligible = mockDb.sessions
    .filter(
      (session) =>
        session.client_id === clientId &&
        session.status === 'completed' &&
        session.track !== 'professional' &&
        reportDb.sessionReports.has(session.session_id ?? ''),
    )
    .sort((a, b) => (a.scheduled_start ?? '').localeCompare(b.scheduled_start ?? ''));
  const includedIds = eligible.map((session) => session.session_id ?? '');
  const reportId = crypto.randomUUID();
  reportDb.reports.set(reportId, {
    scope: 'referral',
    version: 1,
    readyAt: Date.now() + REFERRAL_REPORT_DELAY_MS,
    sessionIds: includedIds,
    traineeSuggested: false,
  });
  const detail: ReferralDetail = {
    referral: { id: crypto.randomUUID(), status: 'suggested', initiated_by: 'client' },
    candidates: expertCandidates(),
    eligible_sessions: eligible.map((session) => ({
      session_id: session.session_id ?? '',
      date: session.scheduled_start ?? '',
      provider_display: providerDisplay(session),
      report_status: 'ready',
    })),
    included_session_ids: includedIds,
    report: { id: reportId, status: 'generating', version: 1 },
  };
  reportDb.referrals.set(detail.referral.id, { detail, clientId });
  return detail;
}

/** REF-02: 리포트 상태를 지금 시각에 맞춰 돌려준다 */
export function referralView(referralId: string): ReferralDetail | undefined {
  const detail = reportDb.referrals.get(referralId)?.detail;
  const report = detail?.report ? reportDb.reports.get(detail.report.id) : undefined;
  if (!detail || !detail.report || !report) return detail;
  return {
    ...detail,
    report: { ...detail.report, status: statusOf(report), version: report.version },
  };
}

/** REF-07: 목록이 바뀌면 버전을 올리고 다시 만든다. 같은 목록이면 그대로 둔다 */
export function changeIncluded(referralId: string, sessionIds: string[]): void {
  const stored = reportDb.referrals.get(referralId);
  const report = stored?.detail.report ? reportDb.reports.get(stored.detail.report.id) : undefined;
  if (!stored || !report) return;
  const current = stored.detail.included_session_ids;
  const same =
    current.length === sessionIds.length && current.every((id) => sessionIds.includes(id));
  if (same) return;
  stored.detail.included_session_ids = sessionIds;
  report.sessionIds = sessionIds;
  report.version += 1;
  report.readyAt = Date.now() + REFERRAL_REPORT_DELAY_MS;
}
