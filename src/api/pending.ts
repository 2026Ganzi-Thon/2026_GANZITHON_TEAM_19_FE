// 백엔드가 아직 배포하지 않은 API 의 타입 (백엔드 기술명세서 13-3, 13-4, 13-6 기준).
// 배포되어 schema.d.ts 에 들어오면 이 파일의 타입을 지우고 Schema<'...'> 로 바꾼다.
import type { Schema } from './types';

/** SES-01 POST /sessions */
export interface SessionCreateRequest {
  slot_id: string;
  intake_id?: string;
  referral_id?: string;
  /** 같은 상담사 재예약이면 지난 세션 ID. 매칭·인테이크를 다시 거치지 않는다 */
  rebook_of?: string;
}

export type ReportStatus = 'generating' | 'ready' | 'failed';

/** SES-02 의 내담자 시점 필드. 코칭 세션에만 온다 */
export interface PendingSessionFields {
  report?: { id: string; status: ReportStatus } | null;
  can_rebook?: boolean;
}

/** 내담자용 쉬운 말 요약. 연계 리포트는 회기별 한 줄(sessions)이 더 온다 */
export interface ClientSummary {
  chief_complaint: string;
  thinking_patterns: string;
  triggers: string;
  coping: string;
  safety_check: string;
  sessions?: Array<{ session_no: number; line: string }>;
}

export interface ReportSource {
  session_id: string;
  session_no: number;
  date: string;
  provider_display: string;
}

/** RPT-01 GET /me/reports/{id}. 세션 리포트와 연계(종합) 리포트가 같은 모양이다 */
export interface ClientReport {
  scope: 'session' | 'referral';
  status: ReportStatus;
  version: number;
  client_summary?: ClientSummary | null;
  risk_level_label?: string | null;
  trainee_suggested_referral?: boolean;
  sources?: ReportSource[];
}

export type ReferralStatus =
  'suggested' | 'expert_selected' | 'booked' | 'accepted' | 'declined' | 'expired' | 'cancelled';

export interface Referral {
  id: string;
  status: ReferralStatus;
  initiated_by: 'client' | 'trainee' | 'ai';
  included_locked_at?: string | null;
  expert_id?: string | null;
}

export interface EligibleSession {
  session_id: string;
  date: string;
  provider_display: string;
  report_status: ReportStatus;
}

/** REF-01 POST /referrals, REF-02 GET /referrals/{id} 응답 */
export interface ReferralDetail {
  referral: Referral;
  candidates: Schema<'Match'>[];
  eligible_sessions: EligibleSession[];
  included_session_ids: string[];
  report: { id: string; status: ReportStatus; version: number } | null;
}

export type ConsentType =
  | 'terms'
  | 'privacy'
  | 'sensitive'
  | 'age14'
  | 'training_data'
  | 'marketing'
  | 'report_transfer'
  | 'transcript_transfer';

/** CNS-01 GET /me/consents 항목. 연계 리포트 동의에는 대상 전문가·포함 회기가 붙는다 */
export interface Consent {
  id: string;
  type: ConsentType;
  granted_at: string;
  revoked_at?: string | null;
  target_expert_display?: string | null;
  report_version?: number | null;
  session_count?: number | null;
  session_dates?: string[];
}

/** CNS-02 POST /consents. 대상 전문가·리포트·버전은 서버가 연계에서 정한다 */
export interface ConsentCreateRequest {
  type: 'report_transfer' | 'transcript_transfer';
  referral_id: string;
}

export type ComplaintCategory =
  'late_noshow' | 'religion_moralizing' | 'private_contact' | 'insincere' | 'other';

/** CMP-01 POST /complaints */
export interface ComplaintCreateRequest {
  session_id: string;
  category: ComplaintCategory;
  description: string;
}

/** SUP-12 GET /certificates/verify/{code} (로그인 없이 호출) */
export interface CertificateVerification {
  valid: boolean;
  issued_at: string;
  trainee_name_masked: string;
  hours: number;
  session_count: number;
  supervision_count: number;
}
