// 어드민 운영 화면 문구 (TRD 16장: M-01, M-04~M-07, M-09).
// 지표 정의와 민원 판정 기준은 프로젝트 개요서 4-2, 6-5 를 그대로 옮겼다.
import type { ComplaintCategory } from '@/api/pending';
import type {
  ComplaintDecision,
  ComplaintSource,
  ComplaintStatus,
  KpiMetricKey,
  RiskEventSource,
  RiskEventStatus,
  StrikeAction,
} from '@/api/pendingAdmin';

import { COMPLAINT } from './referral';

const KPI_METRICS: Record<KpiMetricKey, { label: string; definition: string }> = {
  high_risk_referrals: {
    label: '고위험군 조기 발견·연계 건수',
    definition: 'Red Flag 감지 후 전문가 또는 위기 대응 기관에 연결된 건수',
  },
  trainee_hours: {
    label: '수련생 수련 시간',
    definition: '플랫폼에서 확보한 실전 상담·슈퍼비전 누적 시간',
  },
  mood_delta: {
    label: '상담 후 마음 온도 변화',
    definition: '세션 전후 자기보고 정서 점수(1~10) 차이',
  },
  first_session_completion_rate: {
    label: '첫 상담 완료율',
    definition: '인테이크 작성 대비 첫 세션 완료 비율',
  },
  cac: { label: 'CAC', definition: '첫 결제 내담자 1인당 획득 비용' },
  pro_conversion_rate: {
    label: '전문 상담 전환율',
    definition: '수련생 트랙 내담자 중 전문 트랙을 이용한 비율',
  },
  report_consent_rate: {
    label: '리포트 연동 동의율',
    definition: '심화 전환 시 민감정보 전달 동의 비율',
  },
  churn_rate: { label: '중도 이탈률', definition: '전문 상담 3회기 이전 이탈 비율' },
  pro_revisit_clients: {
    label: '전문 상담 재방문 내담자 수',
    definition: '수련생 트랙 경유 후 전문 상담 2회 이상 이용한 내담자',
  },
  intake_sessions_saved: {
    label: '인테이크 회기 절감',
    definition: '전문가가 배경 파악에 쓴 회기 수',
  },
  supervision_completion_rate: {
    label: '슈퍼비전 작성 완료율',
    definition: '연결 케이스 중 5대 항목 피드백 제출 비율',
  },
  trainee_retention: {
    label: '수련생 리텐션',
    definition: '월간 1회 이상 상담한 활성 수련생 비율',
  },
  red_flag_lead_p50: {
    label: 'Red Flag 리드타임 p50',
    definition: '고위험 탐지부터 전문가·위기 대응 연결까지 시간 (중앙값)',
  },
  red_flag_lead_p90: {
    label: 'Red Flag 리드타임 p90',
    definition: '고위험 탐지부터 전문가·위기 대응 연결까지 시간 (느린 10% 기준)',
  },
  malicious_complaint_rate: {
    label: '악성 민원 판정 비율',
    definition: '전체 민원 중 스트라이크 무효 처리 비율',
  },
};

const KPI_GROUPS: ReadonlyArray<{ title: string; keys: readonly KpiMetricKey[] }> = [
  { title: '사회적 가치', keys: ['high_risk_referrals', 'trainee_hours', 'mood_delta'] },
  { title: '획득', keys: ['first_session_completion_rate', 'cac'] },
  { title: '전환', keys: ['pro_conversion_rate', 'report_consent_rate'] },
  { title: '유지', keys: ['churn_rate', 'pro_revisit_clients'] },
  { title: '효율', keys: ['intake_sessions_saved'] },
  { title: '공급', keys: ['supervision_completion_rate', 'trainee_retention'] },
  { title: '안전', keys: ['red_flag_lead_p50', 'red_flag_lead_p90', 'malicious_complaint_rate'] },
];

const FUNNEL_STEPS: Record<string, string> = {
  intake_submitted: '인테이크',
  match_viewed: '매칭 조회',
  payment_succeeded: '예약',
  first_completed: '첫 상담 완료',
  referral_accepted: '전문 연계',
};

export const ADMIN_KPI = {
  title: 'KPI 대시보드',
  rangeLabel: '기간',
  presets: { today: '오늘', '7d': '7일', '30d': '30일', custom: '사용자 지정' },
  from: '시작일',
  to: '종료일',
  customInvalid: '시작일과 종료일을 골라 주세요',
  refreshNote: '60초마다 새로 불러와요',
  /** 서버가 세는 이벤트 이름 (KPI-01) */
  counts: {
    signup_completed: '가입 완료',
    intake_created: '고민 접수',
    session_completed: '상담 완료',
    referral_accepted: '전문 상담 연계 수락',
    payment_succeeded: '결제 완료',
  } as Record<string, string>,
  northStar: '첫 상담 경험자 수',
  northStarDefinition: '플랫폼에서 생애 첫 상담을 완료한 내담자 (가입 시 자기보고)',
  people: (count: number) => `${count.toLocaleString('ko-KR')}명`,
  versusPrevious: (delta: string) => `전 기간 대비 ${delta}`,
  groups: KPI_GROUPS,
  metrics: KPI_METRICS,
  none: '집계 전',
  units: {
    count: (text: string) => `${text}건`,
    people: (text: string) => `${text}명`,
    rate: (text: string) => `${text}%`,
    hours: (text: string) => `${text}시간`,
    score: (text: string) => `${text}점`,
    won: (text: string) => `${text}원`,
    sessions: (text: string) => `${text}회기`,
  },
  duration: (minutes: number, seconds: number) =>
    minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`,
  funnelTitle: '퍼널',
  funnelSteps: FUNNEL_STEPS,
  funnelRate: (rate: string) => `전 단계 대비 ${rate}`,
  trendTitle: '일별 추이',
  trendSeries: {
    intakes: '인테이크',
    completed_sessions: '완료 세션',
    red_flags: 'Red Flag',
  },
  opsTitle: '운영 참고 지표',
  ops: {
    referralAvgSessions: '연계 리포트 평균 포함 회기 수',
    referralGenP50: '연계 리포트 생성 시간 p50',
    referralGenP90: '연계 리포트 생성 시간 p90',
    rebookRate: '재예약 비율',
  },
} as const;

const RISK_TABS: Record<RiskEventStatus, string> = {
  open: '미처리',
  acknowledged: '확인',
  escalated: '에스컬레이션',
  resolved: '종결',
};

const RISK_SOURCES: Record<RiskEventSource, string> = {
  intake: '인테이크',
  session: '세션',
  contact_exchange: '연락처 교환',
};

export const ADMIN_RISKS = {
  title: 'Red Flag 모니터',
  tabs: RISK_TABS,
  level: '수준',
  source: '발생 위치',
  sources: RISK_SOURCES,
  client: '내담자',
  provider: '담당 상담사',
  noProvider: '없음',
  elapsed: '경과 시간',
  providerAcked: '상담사 확인',
  acked: '확인함',
  notAcked: '미확인',
  drawerTitle: '위기 경고 상세',
  evidence: '감지 근거',
  context: '앞뒤 메시지',
  detector: '판정 출처',
  detectors: { rule: '규칙', llm: 'LLM' },
  score: (value: number) => `점수 ${value}`,
  timeline: '조치 기록',
  falsePositiveTag: '오탐',
  ack: '확인',
  ackDone: '확인 처리했어요',
  escalate: '전문가 연결',
  expertLabel: '당직 전문가',
  expertPlaceholder: '전문가를 골라 주세요',
  noExpert: '연결할 수 있는 전문가가 없어요',
  escalateConfirm: '이 전문가에게 연결',
  escalateDone: '전문가에게 넘겼어요',
  resolve: '종결',
  note: '조치 메모',
  noteRequired: '조치 메모를 적어야 종결할 수 있어요',
  falsePositive: '오탐이에요 (AI 평가에 쓰여요)',
  resolveConfirm: '종결하기',
  resolveDone: '종결했어요',
} as const;

const COMPLAINT_STATUS: Record<ComplaintStatus, string> = {
  received: '접수',
  in_review: '심사 중',
  decided: '판정 완료',
};

const COMPLAINT_SOURCE: Record<ComplaintSource, string> = {
  client: '내담자',
  auto_no_show: '노쇼 자동',
  auto_contact: '연락처 교환 자동',
};

const COMPLAINT_DECISION: Record<ComplaintDecision, string> = {
  trainee_fault: '수련생 귀책',
  malicious: '악성 민원',
  no_fault: '귀책 없음',
};

const COMPLAINT_CATEGORY = Object.fromEntries(
  COMPLAINT.categories.map((category) => [category.value, category.label]),
) as Record<ComplaintCategory, string>;

/** 개요서 6-5 운영 심사 기준 */
const CRITERIA: ReadonlyArray<{
  decision: ComplaintDecision;
  cases: readonly string[];
  action: string;
}> = [
  {
    decision: 'trainee_fault',
    cases: [
      '15분 이상 무단 지각·노쇼',
      '종교 권유·훈계·도덕적 비난',
      '사적 연락 시도',
      '불성실 단답형',
    ],
    action: '스트라이크 부여',
  },
  {
    decision: 'malicious',
    cases: [
      '수련생에게 의학적 진단서·처방전 강요',
      '성희롱·폭언',
      '상습적 환불 목적의 악의적 평점 테러',
    ],
    action: '스트라이크 무효 + 고객 제재',
  },
];

export const ADMIN_COMPLAINTS = {
  title: '민원 목록',
  filterStatus: '상태',
  filterCategory: '유형',
  filterSource: '접수 경로',
  status: COMPLAINT_STATUS,
  source: COMPLAINT_SOURCE,
  category: COMPLAINT_CATEGORY,
  reporter: { client: '내담자', system: '시스템' },
  createdAt: '접수일',
  reporterRole: '제기자',
  target: '대상 활동명',
  strikes: '누적 스트라이크',
  strikeCount: (count: number) => `${count}회`,
  detailTitle: '민원 심사',
  summary: (category: string, target: string, count: number) =>
    `${category} · 대상 ${target} · 누적 스트라이크 ${count}회`,
  description: '민원 내용 (개인정보를 가린 글)',
  transcript: '대화록 (개인정보를 가린 글)',
  transcriptNotice:
    '이름·연락처·지명·직장은 [이름1] 같은 표시로 바뀌어 있어요. 원문은 볼 수 없어요.',
  transcriptEmpty: '대화록이 없어요',
  speaker: { client: '내담자', provider: '상담사' },
  evidence: '자동 근거',
  checklist: '판정 기준',
  criteria: CRITERIA,
  penaltyTitle: '3-Out 페널티',
  penalties: [
    '1회: 정산 보류 및 주의 경고',
    '2회: 배정 2주 정지 및 윤리 가이드 재교육',
    '3회: 플랫폼 영구 퇴출 및 자격 박탈',
  ],
  decisionLabel: '판정',
  decisions: COMPLAINT_DECISION,
  reason: '판정 사유',
  reasonHint: '사유를 적어야 판정할 수 있어요',
  preview: '판정하면 일어나는 일',
  submit: '판정하기',
  confirmTitle: '이 판정으로 확정할까요?',
  confirmBody: '스트라이크, 제재, 정산 보류, 알림이 한 번에 처리돼요.',
  decided: '판정을 마쳤어요',
  alreadyDecided: (label: string) => `판정 완료: ${label}`,
} as const;

const STRIKE_ACTIONS: Record<StrikeAction, string> = {
  none: '없음',
  warning_hold: '경고·정산 보류',
  suspend_2w: '정지',
  ban: '퇴출',
};

export const ADMIN_STRIKES = {
  title: '스트라이크·제재 관리',
  tabs: { trainees: '수련생', clients: '내담자' },
  trainee: '활동명',
  count: '누적',
  countValue: (count: number) => `${count} / 3`,
  action: '현재 조치',
  actions: STRIKE_ACTIONS,
  until: (date: string) => `~${date}`,
  training: '재교육',
  trainingDone: '완료',
  trainingPending: '미완료',
  history: (count: number) => `이력 ${count}건`,
  revoked: '취소됨',
  revoke: '스트라이크 취소',
  revokeTitle: '스트라이크를 취소할까요?',
  revokeBody: '취소하면 누적 횟수에 맞춰 조치를 다시 계산해요.',
  revokeDone: '스트라이크를 취소했어요',
  nickname: '닉네임',
  sanctionType: '제재 유형',
  sanctionTypes: { warning: '경고', booking_restricted: '예약 제한' },
  period: '기간',
  noPeriod: '기한 없음',
  lifted: '해제됨',
  lift: '제재 해제',
  liftTitle: '제재를 해제할까요?',
  liftDone: '제재를 해제했어요',
  manage: '조치',
} as const;

export const ADMIN_SETTLEMENTS = {
  title: '정산 관리',
  month: '월',
  filterStatus: '상태',
  filterKind: '유형',
  select: '선택',
  selectRow: (provider: string) => `${provider} 정산 선택`,
  provider: '공급자 활동명',
  kind: '유형',
  gross: '금액',
  fee: '수수료',
  net: '지급액',
  status: '상태',
  holdReason: '보류 사유',
  pay: (count: number) => `지급 처리 (${count}건)`,
  payConfirmTitle: '지급 처리할까요?',
  payConfirmBody: (count: number, amount: string) =>
    `${count}건, ${amount}을 지급 완료로 바꿔요. 실제 송금이 아닌 모의 지급이에요.`,
  paid: (count: number, amount: string) => `${count}건, ${amount} 지급 처리했어요`,
  exportCsv: 'CSV 내보내기',
  csvName: (month: string) => `settlements-${month}.csv`,
} as const;
