// 어드민 화면이 쓰는, 아직 배포되지 않은 API 의 타입 (백엔드 기술명세서 13-6, 15-6, 15-9 기준).
// 배포되어 schema.d.ts 에 들어오면 지우고 Schema<'...'> 로 바꾼다.
import type { ComplaintCategory } from './pending';
import type { RiskLevel, TranscriptLine } from './pendingProvider';

/** KPI-01 GET /admin/kpi. 지표는 개요서 4-2 의 핵심 지표다 (North Star 는 따로 온다) */
export type KpiMetricKey =
  | 'high_risk_referrals'
  | 'trainee_hours'
  | 'mood_delta'
  | 'first_session_completion_rate'
  | 'cac'
  | 'pro_conversion_rate'
  | 'report_consent_rate'
  | 'churn_rate'
  | 'pro_revisit_clients'
  | 'intake_sessions_saved'
  | 'supervision_completion_rate'
  | 'trainee_retention'
  | 'red_flag_lead_p50'
  | 'red_flag_lead_p90'
  | 'malicious_complaint_rate';

export interface KpiFunnelStep {
  step: string;
  count: number;
}

export interface KpiDailyPoint {
  /** KST 날짜 (YYYY-MM-DD) */
  date: string;
  intakes: number;
  completed_sessions: number;
  red_flags: number;
}

export interface Kpi {
  /** North Star: 첫 상담 경험자 수와 전 기간 값 */
  north_star: { value: number; previous?: number | null };
  metrics: Partial<Record<KpiMetricKey, number | null>>;
  funnel: KpiFunnelStep[];
  daily: KpiDailyPoint[];
  ops: {
    referral_avg_sessions?: number | null;
    referral_gen_p50_seconds?: number | null;
    referral_gen_p90_seconds?: number | null;
    rebook_rate?: number | null;
  };
}

export type RiskEventStatus = 'open' | 'acknowledged' | 'escalated' | 'resolved';
export type RiskEventSource = 'intake' | 'session' | 'contact_exchange';

/** RSK-01 GET /admin/risk-events 항목 */
export interface RiskEvent {
  id: string;
  level: RiskLevel;
  source: RiskEventSource;
  status: RiskEventStatus;
  client_nickname: string;
  provider_display?: string | null;
  created_at: string;
  elapsed_seconds: number;
  provider_acked: boolean;
  evidence: string;
  /** 근거 문장과 앞뒤 메시지 */
  context: string[];
  detector: 'rule' | 'llm';
  score?: number | null;
  timeline: Array<{ at: string; action: string }>;
  false_positive?: boolean;
}

export type ComplaintStatus = 'received' | 'in_review' | 'decided';
export type ComplaintSource = 'client' | 'auto_no_show' | 'auto_contact';
export type ComplaintDecision = 'trainee_fault' | 'malicious' | 'no_fault';

/** CMP-02 GET /admin/complaints 항목 */
export interface AdminComplaint {
  id: string;
  created_at: string;
  category: ComplaintCategory;
  source: ComplaintSource;
  reporter_role: 'client' | 'system';
  target_display: string;
  target_strike_count: number;
  status: ComplaintStatus;
  decision?: ComplaintDecision | null;
}

/** CMP-03 GET /admin/complaints/{id}. 원문 대화는 오지 않는다 */
export interface AdminComplaintDetail extends AdminComplaint {
  description: string;
  masked_transcript: TranscriptLine[];
  auto_evidence: string[];
  /** 판정별로 일어날 일 미리보기 */
  preview: Record<ComplaintDecision, string>;
}

export type StrikeAction = 'none' | 'warning_hold' | 'suspend_2w' | 'ban';

/** CMP-05 GET /admin/strikes 항목 */
export interface AdminStrikeRow {
  trainee_id: string;
  trainee_display: string;
  count: number;
  action: StrikeAction;
  until?: string | null;
  ethics_training_done: boolean;
  items: Array<{
    id: string;
    created_at: string;
    category: ComplaintCategory;
    revoked_at?: string | null;
  }>;
}

/** CMP-05 GET /admin/client-sanctions 항목 */
export interface ClientSanctionRow {
  id: string;
  nickname: string;
  type: 'warning' | 'booking_restricted';
  until?: string | null;
  lifted_at?: string | null;
}
