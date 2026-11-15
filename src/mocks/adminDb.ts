import type {
  AdminComplaintDetail,
  AdminStrikeRow,
  ClientSanctionRow,
  ComplaintDecision,
  Kpi,
  RiskEvent,
  StrikeAction,
} from '@/api/pendingAdmin';
import type { Schema } from '@/api/types';
import { kstDateKey } from '@/lib/date';

import { mockDb } from './db';

// 어드민 화면의 목 데이터 (ADM, STL-02·03, RSK-01~03, CMP-02~06, KPI-01). 실제 사람의 정보가 아니다.
type Review = Schema<'CredentialReviewDetail'>;
type QueueItem = Schema<'CredentialReviewItem'>;
type CredentialItem = Schema<'Item'>;
type UserRow = Schema<'AdminUserRow'>;
type UserStatus = NonNullable<UserRow['status']>;
type Setting = Schema<'SettingResponse'>;
type Settlement = Schema<'SettlementResponse'>;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const SUSPEND_DAYS = 14;
const RESTRICT_DAYS = 30;
const MAX_KPI_DAYS = 31;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const ahead = (ms: number) => new Date(Date.now() + ms).toISOString();

const PENDING_TRAINEE_ID = '00000000-0000-7000-8000-000000000b01';
const PENDING_EXPERT_ID = '00000000-0000-7000-8000-000000000b02';
const SUSPENDED_TRAINEE_ID = '00000000-0000-7000-8000-000000000b03';
const DEMO_CLIENT = '따뜻한구름';
const traineeId = mockDb.users.get('trainee1')?.id ?? '';
const expertId = mockDb.users.get('expert1')?.id ?? '';

const SAMPLE_DOCUMENT = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440"><rect width="640" height="440" fill="white" stroke="gray"/><text x="40" y="80" font-size="28">자격 확인 서류 (시연용)</text><text x="40" y="130" font-size="18">실제 서류가 아닙니다</text></svg>',
)}`;

/** AI 판독값·자동 검증 응답은 계약에 모양이 없어 느슨하게 넣는다 */
const loose = (value: Record<string, string>) => value as unknown as CredentialItem['ocr_result'];

/** 점검 모드·기능 플래그. 목 모드에서는 P1 화면도 볼 수 있게 모두 켜 둔다. M-10 에서 바꾸면 바로 반영된다 */
export const appConfig: Schema<'AppConfigResponse'> = {
  feature_flags: {
    p1_certificates: true,
    p1_supervision_requests: true,
    p1_complaints: true,
    p1_credential_auto_verify: true,
  },
  maintenance: { on: false },
  min_client_version: '2026.10.26',
};

const setting = (key: string, value: unknown): Setting => ({
  key,
  value: value as Setting['value'],
  updated_at: ago(7 * DAY),
});

const reviews: Review[] = [
  {
    user_id: PENDING_TRAINEE_ID,
    role: 'trainee',
    status: 'pending_review',
    nickname: '봄비',
    profile: {
      track: 'trainee',
      display_name: '봄비',
      real_name: '김시연',
      service_label: 'coaching',
      specialties: ['대인관계'],
      school: '시연대학교 상담심리대학원',
    },
    credentials: [
      {
        id: 'cred-b01',
        kind: 'enrollment',
        cert_name: '상담심리대학원 재학증명서',
        cert_number: 'ST-2026-0142',
        issued_on: '2026-09-01',
        file_url: SAMPLE_DOCUMENT,
        ocr_result: loose({
          cert_name: '상담심리대학원 재학증명서',
          cert_number: 'ST-2026-0142',
          issued_on: '2026-09-01',
        }),
        user_corrected: false,
        verify_method: 'manual',
        verify_result: 'none',
        status: 'submitted',
        created_at: ago(3 * DAY),
      },
    ],
  },
  {
    user_id: PENDING_EXPERT_ID,
    role: 'expert',
    status: 'pending_review',
    nickname: '다온',
    profile: {
      track: 'expert',
      display_name: '다온',
      real_name: '이시연',
      specialties: ['불안'],
    },
    credentials: [
      {
        id: 'cred-b02',
        kind: 'society',
        cert_name: '상담심리사 1급',
        cert_number: 'KCPA-1-20417',
        issued_on: '2021-03-15',
        file_url: SAMPLE_DOCUMENT,
        ocr_result: loose({
          cert_name: '상담심리사 1급',
          cert_number: 'KCPA-1-20471',
          issued_on: '2021-03-15',
        }),
        user_corrected: true,
        verify_method: 'ocr',
        verify_result: 'mismatch',
        verify_raw: loose({ cert_name: '상담심리사 1급', cert_number: 'KCPA-1-20471' }),
        status: 'submitted',
        created_at: ago(26 * HOUR),
      },
    ],
  },
];

const extraUsers: UserRow[] = [
  {
    id: 'user-c2',
    role: 'client',
    status: 'active',
    nickname: '조용한바다',
    created_at: ago(12 * DAY),
  },
  {
    id: 'user-c3',
    role: 'client',
    status: 'restricted',
    nickname: '빠른걸음',
    restricted_until: ahead(21 * DAY),
    created_at: ago(40 * DAY),
  },
  {
    id: SUSPENDED_TRAINEE_ID,
    role: 'trainee',
    status: 'suspended',
    nickname: '새벽',
    display_name: '새벽',
    suspended_until: ahead(9 * DAY),
    created_at: ago(55 * DAY),
  },
  {
    id: PENDING_TRAINEE_ID,
    role: 'trainee',
    status: 'pending_review',
    nickname: '봄비',
    display_name: '봄비',
    created_at: ago(3 * DAY),
  },
  {
    id: PENDING_EXPERT_ID,
    role: 'expert',
    status: 'pending_review',
    nickname: '다온',
    display_name: '다온',
    created_at: ago(2 * DAY),
  },
];

const settlements: Settlement[] = [
  {
    id: 'adm-stl-1',
    provider_id: traineeId,
    kind: 'session',
    gross: 15_000,
    fee: 3_000,
    net: 12_000,
    status: 'pending',
    created_at: ago(5 * HOUR),
  },
  {
    id: 'adm-stl-2',
    provider_id: traineeId,
    kind: 'session',
    gross: 15_000,
    fee: 3_000,
    net: 12_000,
    status: 'held',
    status_reason: '스트라이크 1회 정산 보류',
    created_at: ago(9 * HOUR),
  },
  {
    id: 'adm-stl-3',
    provider_id: expertId,
    kind: 'session',
    gross: 60_000,
    fee: 12_000,
    net: 48_000,
    status: 'locked',
    status_reason: '이 연계의 슈퍼비전 1건 중 0건 작성',
    created_at: ago(12 * HOUR),
  },
  {
    id: 'adm-stl-4',
    provider_id: expertId,
    kind: 'supervision',
    gross: 20_000,
    fee: 0,
    net: 20_000,
    status: 'pending',
    created_at: ago(15 * HOUR),
  },
  {
    id: 'adm-stl-5',
    provider_id: expertId,
    kind: 'session',
    gross: 60_000,
    fee: 12_000,
    net: 48_000,
    status: 'paid',
    paid_at: ago(2 * HOUR),
    created_at: ago(20 * HOUR),
  },
];

const riskEvents: RiskEvent[] = [
  {
    id: 'risk-1',
    level: 'critical',
    source: 'session',
    status: 'open',
    client_nickname: DEMO_CLIENT,
    provider_display: '하늘',
    created_at: ago(4 * MINUTE),
    elapsed_seconds: 0,
    provider_acked: false,
    evidence: '오늘 밤이 마지막일 것 같아요.',
    context: [
      '요즘 잠을 거의 못 자고 있어요.',
      '오늘 밤이 마지막일 것 같아요.',
      '아무한테도 말하지 못했어요.',
    ],
    detector: 'rule',
    score: null,
    timeline: [{ at: ago(4 * MINUTE), action: '감지 (규칙)' }],
  },
  {
    id: 'risk-2',
    level: 'high',
    source: 'intake',
    status: 'open',
    client_nickname: '조용한바다',
    provider_display: null,
    created_at: ago(18 * MINUTE),
    elapsed_seconds: 0,
    provider_acked: false,
    evidence: '요즘은 다 그만두고 사라지고 싶어요.',
    context: ['요즘은 다 그만두고 사라지고 싶어요.'],
    detector: 'llm',
    score: 0.86,
    timeline: [{ at: ago(18 * MINUTE), action: '감지 (LLM)' }],
  },
  {
    id: 'risk-3',
    level: 'high',
    source: 'session',
    status: 'acknowledged',
    client_nickname: '빠른걸음',
    provider_display: '서온',
    created_at: ago(3 * HOUR),
    elapsed_seconds: 0,
    provider_acked: true,
    evidence: '예전에 스스로를 다치게 한 적이 있어요.',
    context: [
      '그때는 정말 힘들었어요.',
      '예전에 스스로를 다치게 한 적이 있어요.',
      '지금은 그러지 않아요.',
    ],
    detector: 'llm',
    score: 0.78,
    timeline: [
      { at: ago(3 * HOUR), action: '감지 (LLM)' },
      { at: ago(3 * HOUR - 2 * MINUTE), action: '상담사 확인' },
      { at: ago(3 * HOUR - 5 * MINUTE), action: '어드민 확인' },
    ],
  },
  {
    id: 'risk-4',
    level: 'medium',
    source: 'contact_exchange',
    status: 'resolved',
    client_nickname: DEMO_CLIENT,
    provider_display: '하늘',
    created_at: ago(2 * DAY),
    elapsed_seconds: 0,
    provider_acked: true,
    evidence: '[연락처1] 로 따로 연락 주세요.',
    context: ['[연락처1] 로 따로 연락 주세요.'],
    detector: 'rule',
    score: null,
    timeline: [
      { at: ago(2 * DAY), action: '감지 (규칙)' },
      { at: ago(2 * DAY - HOUR), action: '종결: 연락처 교환 경고 안내' },
    ],
  },
];

const PREVIEW_NO_FAULT = '조치 없음. 양쪽에 결과만 알려요.';
const PREVIEW_AUTO = '자동 접수 건이라 내담자 제재는 없어요';

const complaints: AdminComplaintDetail[] = [
  {
    id: 'cmp-1',
    created_at: ago(6 * HOUR),
    category: 'religion_moralizing',
    source: 'client',
    reporter_role: 'client',
    target_display: '하늘',
    target_strike_count: 1,
    status: 'received',
    description:
      '상담 중에 [지명1]에 있는 모임에 나오라고 여러 번 권했고, 제 선택을 나무라는 말을 들었어요.',
    masked_transcript: [
      { role: 'client', text: '요즘 [직장1] 일 때문에 많이 지쳐 있어요.' },
      { role: 'provider', text: '그럴 때는 [지명1] 모임에 나와 보는 게 답이에요.' },
      { role: 'client', text: '저는 그런 이야기를 하려던 게 아니었어요.' },
      { role: 'provider', text: '[이름1] 님이 마음을 고쳐먹어야 해요.' },
    ],
    auto_evidence: [
      '입장 시각: 상담사 14:00, 내담자 14:01',
      '감지 문장: "모임에 나와 보는 게 답이에요"',
      '상담사 메시지 평균 길이 38자',
    ],
    preview: {
      trainee_fault: '스트라이크 2회 → 2주 정지와 윤리 가이드 재교육',
      malicious: '내담자 경고 (다시 일어나면 예약 30일 제한)',
      no_fault: PREVIEW_NO_FAULT,
    },
  },
  {
    id: 'cmp-2',
    created_at: ago(30 * HOUR),
    category: 'late_noshow',
    source: 'auto_no_show',
    reporter_role: 'system',
    target_display: '새벽',
    target_strike_count: 2,
    status: 'in_review',
    description: '상담사가 시작 시각 뒤 15분 동안 입장하지 않아 자동으로 접수됐어요.',
    masked_transcript: [],
    auto_evidence: ['입장 시각: 상담사 기록 없음, 내담자 19:58', '세션 자동 종료 20:15'],
    preview: {
      trainee_fault: '스트라이크 3회 → 영구 퇴출과 자격 박탈',
      malicious: PREVIEW_AUTO,
      no_fault: PREVIEW_NO_FAULT,
    },
  },
  {
    id: 'cmp-3',
    created_at: ago(4 * DAY),
    category: 'private_contact',
    source: 'auto_contact',
    reporter_role: 'system',
    target_display: '하늘',
    target_strike_count: 1,
    status: 'decided',
    decision: 'no_fault',
    description: '대화에서 연락처로 보이는 글이 감지되어 자동으로 접수됐어요.',
    masked_transcript: [
      { role: 'client', text: '[연락처1] 로 따로 연락 주세요.' },
      { role: 'provider', text: '상담은 이 화면 안에서만 할 수 있어요.' },
    ],
    auto_evidence: ['감지 문장: "[연락처1] 로 따로 연락 주세요" (내담자)'],
    preview: {
      trainee_fault: '스트라이크 2회 → 2주 정지와 윤리 가이드 재교육',
      malicious: PREVIEW_AUTO,
      no_fault: PREVIEW_NO_FAULT,
    },
  },
];

const strikes: AdminStrikeRow[] = [
  {
    trainee_id: traineeId,
    trainee_display: '하늘',
    count: 1,
    action: 'warning_hold',
    until: null,
    ethics_training_done: false,
    items: [{ id: 'strike-1', created_at: ago(10 * DAY), category: 'insincere', revoked_at: null }],
  },
  {
    trainee_id: SUSPENDED_TRAINEE_ID,
    trainee_display: '새벽',
    count: 2,
    action: 'suspend_2w',
    until: ahead(9 * DAY),
    ethics_training_done: false,
    items: [
      { id: 'strike-2', created_at: ago(25 * DAY), category: 'late_noshow', revoked_at: null },
      { id: 'strike-3', created_at: ago(5 * DAY), category: 'late_noshow', revoked_at: null },
    ],
  },
];

const sanctions: ClientSanctionRow[] = [
  {
    id: 'sanction-1',
    nickname: '빠른걸음',
    type: 'booking_restricted',
    until: ahead(21 * DAY),
    lifted_at: null,
  },
  { id: 'sanction-2', nickname: '조용한바다', type: 'warning', until: null, lifted_at: null },
];

export const adminDb = {
  reviews,
  extraUsers,
  settlements,
  riskEvents,
  complaints,
  strikes,
  sanctions,
  settings: [
    setting('coaching', { price: 15_000, duration_min: 30, fee_rate: 0.2 }),
    setting('professional', { price: 60_000, duration_min: 50, fee_rate: 0.2 }),
    setting('supervision', { price: 20_000 }),
    setting('supervision_request', { price: 0 }),
    setting('refund_policy', { full_refund_hours: 24 }),
    setting('referral_respond_hours', 48),
    setting('referral_report', { lookback_days: 90, max_sessions: 10, max_supervised_trainees: 3 }),
    setting('crisis_contacts', [
      { name: '자살예방상담', number: '109', description: '24시간 자살 위기 상담' },
      { name: '정신건강위기상담', number: '1577-0199', description: '24시간 정신건강 위기 상담' },
    ]),
    setting('oncall', [expertId]),
    setting('crisis_scripts', ['지금 안전한 곳에 계신가요?', '자신을 해칠 생각이 드시나요?']),
    setting('marketing_cost', 300_000),
    setting('feature_flags', appConfig.feature_flags),
    setting('maintenance', { on: false, message: '', until: '' }),
  ],
};

export function credentialQueue(): QueueItem[] {
  return adminDb.reviews.map((review) => ({
    user_id: review.user_id,
    role: review.role,
    status: review.status,
    nickname: review.nickname,
    display_name: review.profile?.display_name,
    submitted_at: review.credentials?.[0]?.created_at,
    credentials: review.credentials?.map((credential) => ({
      kind: credential.kind,
      cert_name: credential.cert_name,
      verify_result: credential.verify_result,
      user_corrected: credential.user_corrected,
    })),
  }));
}

export function userRows(): UserRow[] {
  const seeds = [...mockDb.users.values()].map((me, index): UserRow => ({
    id: me.id,
    role: me.role,
    status: me.status,
    nickname: me.nickname,
    display_name: me.provider_profile?.display_name,
    created_at: ago((30 + index) * DAY),
  }));
  return [...seeds, ...adminDb.extraUsers];
}

export function setUserStatus(userId: string, status: UserStatus, until?: string): boolean {
  const seed = [...mockDb.users.values()].find((me) => me.id === userId);
  if (seed) {
    seed.status = status;
    return true;
  }
  const row = adminDb.extraUsers.find((user) => user.id === userId);
  if (!row) return false;
  row.status = status;
  row.suspended_until = status === 'suspended' ? until : undefined;
  row.restricted_until = status === 'restricted' ? until : undefined;
  return true;
}

/** 자격 심사 결정: 대기열에서 빼고 계정 상태를 바꾼다 */
export function decideReview(userId: string, approve: boolean): boolean {
  const index = adminDb.reviews.findIndex((review) => review.user_id === userId);
  if (index < 0) return false;
  adminDb.reviews.splice(index, 1);
  setUserStatus(userId, approve ? 'active' : 'rejected');
  return true;
}

export function riskEventView(event: RiskEvent): RiskEvent {
  return {
    ...event,
    elapsed_seconds: Math.floor((Date.now() - Date.parse(event.created_at)) / 1000),
  };
}

/** 목 모드에서 어드민에게 새 위기 경고를 보여 주려고 한 건을 더한다 */
export function addDemoRiskEvent(): RiskEvent {
  const createdAt = new Date().toISOString();
  const event: RiskEvent = {
    id: `risk-demo-${crypto.randomUUID()}`,
    level: 'high',
    source: 'session',
    status: 'open',
    client_nickname: DEMO_CLIENT,
    provider_display: '하늘',
    created_at: createdAt,
    elapsed_seconds: 0,
    provider_acked: false,
    evidence: '요즘은 다 그만두고 사라지고 싶어요.',
    context: ['네, 요즘 일이 많아서 계속 지쳐 있어요.', '요즘은 다 그만두고 사라지고 싶어요.'],
    detector: 'rule',
    score: null,
    timeline: [{ at: createdAt, action: '감지 (규칙)' }],
  };
  adminDb.riskEvents.unshift(event);
  return event;
}

const ACTION_BY_COUNT: readonly StrikeAction[] = ['none', 'warning_hold', 'suspend_2w', 'ban'];

/** 취소되지 않은 스트라이크 수로 조치를 다시 계산한다 (백엔드 15-6) */
function recount(row: AdminStrikeRow): void {
  const active = row.items.filter((item) => !item.revoked_at).length;
  row.count = active;
  row.action = ACTION_BY_COUNT[Math.min(active, ACTION_BY_COUNT.length - 1)] ?? 'none';
  row.until = row.action === 'suspend_2w' ? (row.until ?? ahead(SUSPEND_DAYS * DAY)) : null;
}

export function revokeStrike(strikeId: string): boolean {
  const row = adminDb.strikes.find((item) => item.items.some((strike) => strike.id === strikeId));
  const strike = row?.items.find((item) => item.id === strikeId);
  if (!row || !strike) return false;
  strike.revoked_at = new Date().toISOString();
  recount(row);
  return true;
}

/** 민원 판정: 수련생 귀책이면 스트라이크, 악성 민원이면 내담자 제재를 더한다 */
export function decideComplaint(id: string, decision: ComplaintDecision): boolean {
  const complaint = adminDb.complaints.find((item) => item.id === id);
  if (!complaint) return false;
  complaint.status = 'decided';
  complaint.decision = decision;

  if (decision === 'trainee_fault') {
    const row = adminDb.strikes.find((item) => item.trainee_display === complaint.target_display);
    const strike = {
      id: `strike-${crypto.randomUUID()}`,
      created_at: new Date().toISOString(),
      category: complaint.category,
      revoked_at: null,
    };
    if (row) {
      row.items.push(strike);
      recount(row);
    } else {
      adminDb.strikes.push({
        trainee_id: `trainee-${complaint.id}`,
        trainee_display: complaint.target_display,
        count: 1,
        action: 'warning_hold',
        until: null,
        ethics_training_done: false,
        items: [strike],
      });
    }
  }
  if (decision === 'malicious' && complaint.reporter_role === 'client') {
    const repeated = adminDb.sanctions.some((item) => item.nickname === DEMO_CLIENT);
    adminDb.sanctions.push({
      id: `sanction-${crypto.randomUUID()}`,
      nickname: DEMO_CLIENT,
      type: repeated ? 'booking_restricted' : 'warning',
      until: repeated ? ahead(RESTRICT_DAYS * DAY) : null,
      lifted_at: null,
    });
  }
  return true;
}

/** 기간 길이에 맞춘 시연용 지표. 실제 계산식은 백엔드 15-9 다 */
export function kpi(from: string, to: string): Kpi {
  const start = Date.parse(from) || Date.now() - 7 * DAY;
  const end = Date.parse(to) || Date.now();
  const days = Math.max(1, Math.min(MAX_KPI_DAYS, Math.round((end - start) / DAY)));
  const daily = Array.from({ length: days }, (_, index) => ({
    date: kstDateKey(start + index * DAY),
    intakes: 6 + ((index * 5) % 7),
    completed_sessions: 4 + ((index * 3) % 5),
    red_flags: index % 4 === 0 ? 1 : 0,
  }));
  const intakes = daily.reduce((sum, day) => sum + day.intakes, 0);
  const completed = daily.reduce((sum, day) => sum + day.completed_sessions, 0);
  const redFlags = daily.reduce((sum, day) => sum + day.red_flags, 0);
  const firstCompleted = Math.round(intakes * 0.41);

  return {
    north_star: { value: firstCompleted, previous: Math.round(firstCompleted * 0.88) },
    metrics: {
      high_risk_referrals: redFlags,
      trainee_hours: Math.round(completed * 0.5 * 10) / 10,
      mood_delta: 1.8,
      first_session_completion_rate: 0.41,
      cac: firstCompleted > 0 ? Math.round(300_000 / firstCompleted) : null,
      pro_conversion_rate: 0.19,
      report_consent_rate: 0.72,
      churn_rate: 0.24,
      pro_revisit_clients: Math.round(intakes * 0.05),
      intake_sessions_saved: 0.4,
      supervision_completion_rate: 0.9,
      trainee_retention: 0.83,
      red_flag_lead_p50: 95,
      red_flag_lead_p90: 260,
      malicious_complaint_rate: 0.12,
    },
    funnel: [
      { step: 'intake_submitted', count: intakes },
      { step: 'match_viewed', count: Math.round(intakes * 0.86) },
      { step: 'payment_succeeded', count: Math.round(intakes * 0.52) },
      { step: 'first_completed', count: firstCompleted },
      { step: 'referral_accepted', count: Math.round(intakes * 0.08) },
    ],
    daily,
    ops: {
      referral_avg_sessions: 3.2,
      referral_gen_p50_seconds: 14,
      referral_gen_p90_seconds: 31,
      rebook_rate: 0.37,
    },
  };
}
