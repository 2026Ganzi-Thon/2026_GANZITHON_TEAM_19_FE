// 수련생·전문가 화면이 쓰는, 아직 배포되지 않은 API 의 타입 (백엔드 기술명세서 13-3~13-6 기준).
// 배포되어 schema.d.ts 에 들어오면 지우고 Schema<'...'> 로 바꾼다.
import type { ReferralStatus, ReportStatus } from './pending';

export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface AiTags {
  emotions?: string[];
  distortions?: string[];
  keywords?: string[];
}

/** SES-02·SES-03 의 상담사 시점 필드 */
export interface ProviderSessionFields {
  client_nickname?: string;
  category?: string;
  /** 이 내담자와 몇 번째 회기인지 */
  visit_no?: number;
  rebook_of?: string | null;
  referral_id?: string | null;
  /** 수련생: 이 회기의 슈퍼비전이 도착했는지 */
  supervision_ready?: boolean;
  /** SES-03: 원문 고민 글은 내담자가 공유를 허용했을 때만 온다 */
  intake_summary?: { category?: string; ai_tags?: AiTags; raw_text?: string | null } | null;
}

/** SES-09 GET /sessions/{id}/history */
export interface SessionHistoryItem {
  session_id: string;
  date: string;
  mood_before?: number | null;
  mood_after?: number | null;
  my_note?: string | null;
}

/** REF-04 POST /sessions/{id}/referral-suggestion */
export type ReferralReasonCode = 'deep_issue' | 'risk' | 'client_request' | 'other';

export interface ReferralSuggestionRequest {
  reason_code: ReferralReasonCode;
  reason_text: string;
}

export type RiskRating = 'appropriate' | 'underestimated' | 'overestimated';

export interface SupervisionScores {
  rapport: number;
  empathy: number;
  risk: number;
  structure: number;
}

export interface AlternativeResponse {
  session_id?: string;
  /** 수련생 발화 인용 */
  quote: string;
  /** 대안 발화 */
  suggestion: string;
}

/** SUP-04 GET /trainee/supervisions 항목 */
export interface TraineeSupervisionItem {
  id: string;
  session_date: string;
  category?: string;
  expert_display: string;
  submitted_at: string;
  read_at?: string | null;
  /** 대상 회기 수 (연계 건은 여러 회기) */
  session_count: number;
}

/** SUP-05 GET /trainee/supervisions/{id} */
export interface TraineeSupervision extends TraineeSupervisionItem {
  well_done: string;
  blind_spot: string;
  alternative_responses: AlternativeResponse[];
  risk_rating: RiskRating;
  risk_comment: string;
  next_action: string;
  scores: SupervisionScores;
}

/** SUP-06 GET /trainee/competency */
export interface Competency {
  radar: { recent5: SupervisionScores; all: SupervisionScores } | null;
  trend: Array<{ submitted_at: string; scores: SupervisionScores }>;
  totals: {
    session_hours: number;
    session_count: number;
    supervision_count: number;
    referral_count: number;
  };
}

/** SUP-07·SUP-08 증빙서 */
export interface Certificate {
  id: string;
  status: 'generating' | 'ready' | 'failed';
  code?: string;
  issued_at?: string;
}

/** SUP-09 POST /trainee/supervision-requests */
export interface SupervisionRequestCreate {
  session_id: string;
  preferred_expert_id?: string;
  question: string;
}

/** SUP-10·SUP-11 요청 목록 항목 */
export interface SupervisionRequestItem {
  id: string;
  session_id: string;
  session_date: string;
  question: string;
  status: 'pending' | 'accepted' | 'completed' | 'expired';
  created_at: string;
  fee: number;
  expert_display?: string | null;
  trainee_display?: string;
}

/** SUP-01 GET /expert/supervisions 항목 */
export interface ExpertSupervisionItem {
  id: string;
  trainee_display: string;
  session_count: number;
  due_at: string;
  status: 'pending' | 'draft' | 'submitted';
  settlement_locked: boolean;
  /** 같은 연계의 슈퍼비전 수와 남은 수 */
  referral_total?: number;
  referral_remaining?: number;
}

/** SUP-03 PUT /expert/supervisions/{id} */
export interface SupervisionWrite {
  draft: boolean;
  well_done: string;
  blind_spot: string;
  alternative_responses: AlternativeResponse[];
  risk_rating?: RiskRating;
  risk_comment: string;
  next_action: string;
  scores: Partial<SupervisionScores>;
}

export interface TranscriptLine {
  role: 'client' | 'provider';
  text: string;
}

/** 연계 리포트 본문 (전문가용, 임상 용어 그대로) */
export interface ExpertReportContent {
  chief_complaint: string;
  timeline: Array<{
    session_no: number;
    session_date: string;
    trainee_label: string;
    key_points: string[];
    mood_before?: number | null;
    mood_after?: number | null;
  }>;
  distortions: Array<{ name: string; evidence: string; session_no: number }>;
  triggers: string[];
  defenses: string[];
  progress: string;
  red_flag: {
    max_level: RiskLevel;
    history: Array<{ session_no: number; level: RiskLevel; evidence: string }>;
  };
  focus_suggestions: string[];
}

/** RPT-02 GET /expert/reports/{id} */
export interface ExpertReport {
  status: ReportStatus;
  content: ExpertReportContent | null;
  sources_meta?: Array<{
    session_no: number;
    date: string;
    duration_min: number;
    mood_before?: number | null;
    mood_after?: number | null;
    trainee_label: string;
  }>;
  /** 서버가 아직 주지 않는다 (2026-11-20) */
  consent?: { granted_at: string; report_version: number; scopes: string[] };
}

/** SUP-02 GET /expert/supervisions/{id}/context */
export interface SupervisionContext {
  trainee_display: string;
  /** 같은 연계의 슈퍼비전 중 몇 번째인지와 다음 건 */
  position: { index: number; total: number; next_id?: string | null };
  referral_report?: ExpertReportContent | null;
  trainee_sessions: Array<{
    session_id: string;
    session_no: number;
    date: string;
    /** 내담자가 대화록 전달에 동의했을 때만 온다 */
    masked_transcript?: TranscriptLine[] | null;
  }>;
  trainee_risk_actions: string[];
  trainee_reason?: string | null;
  /** 임시저장한 내용 */
  saved?: SupervisionWrite | null;
}

/** REF-05 GET /expert/referrals 항목 */
export interface ExpertReferralItem {
  id: string;
  status: ReferralStatus;
  client_nickname: string;
  category?: string;
  risk_level?: RiskLevel;
  scheduled_start: string;
  has_report_consent: boolean;
  report_ready: boolean;
  included_session_count: number;
  trainee_reason?: string | null;
  respond_by: string;
  report_id?: string | null;
  session_id?: string | null;
}

export type ReferralDeclineReason = 'schedule' | 'out_of_scope' | 'other';

/** CMP-05 GET /me/strikes */
export interface StrikeSummary {
  count: number;
  limit: number;
  next_action?: string | null;
  items: Array<{
    id: string;
    created_at: string;
    category: string;
    action: string;
    revoked_at?: string | null;
  }>;
}
