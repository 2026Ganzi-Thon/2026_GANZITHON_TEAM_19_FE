// 슈퍼비전·성장 기록·증빙서 문구 (TRD T-07~T-09, E-08)
import type {
  Certificate,
  RiskRating,
  SupervisionRequestItem,
  SupervisionScores,
} from '@/api/pendingProvider';

const RISK_RATING: Record<RiskRating, string> = {
  appropriate: '적절',
  underestimated: '과소평가',
  overestimated: '과대평가',
};

const SCORE_LABEL: Record<keyof SupervisionScores, string> = {
  rapport: '라포 형성',
  empathy: '공감·질문',
  risk: '위험 평가',
  structure: '개입 구조화',
};

const REQUEST_STATUS: Record<SupervisionRequestItem['status'], string> = {
  pending: '대기',
  accepted: '수락',
  completed: '완료',
  expired: '만료',
};

const CERTIFICATE_STATUS: Record<Certificate['status'], string> = {
  generating: '만드는 중',
  ready: '발급 완료',
  failed: '발급 실패',
};

export const SUPERVISION = {
  listTitle: '슈퍼비전 피드백',
  empty: '아직 도착한 피드백이 없어요',
  unread: '읽지 않음',
  arrived: (date: string) => `${date} 도착`,
  detailTitle: '슈퍼비전 피드백',
  target: (count: number, expert: string) => `대상 회기 ${count}개 · ${expert}`,
  wellDone: '라포 형성 및 개입 강점',
  blindSpot: '놓친 맹점 및 방어기제 분석',
  alternatives: '대안 질문·공감 반응',
  quote: '내 발화',
  suggestion: '대안 발화',
  riskTitle: '위험 징후 평가',
  riskRating: RISK_RATING,
  nextAction: '다음 회기를 위한 한 줄 조언',
  scoresTitle: '역량 점수',
  scoreLabel: SCORE_LABEL,
  score: (value: number) => `${value} / 5`,
} as const;

export const GROWTH = {
  title: '역량 차트·증빙서',
  empty: '첫 피드백이 도착하면 차트가 그려져요',
  radarTitle: '역량 4축',
  recent: '최근 5건 평균',
  all: '전체 평균',
  trendTitle: '슈퍼비전 회차별 점수 추이',
  trendSeries: '평균 점수',
  totalsTitle: '누적 지표',
  hours: (hours: number) => `실전 세션 ${hours}시간`,
  supervisions: (count: number) => `슈퍼비전 ${count}건`,
  referrals: (count: number) => `연계 케이스 ${count}건`,
  certificateTitle: '공인 수련 이력 증빙서',
  issue: '증빙서 발급',
  issueRule: '완료한 세션이 1건 이상 있어야 발급할 수 있어요.',
  issued: '증빙서 발급을 요청했어요',
  certificateStatus: CERTIFICATE_STATUS,
  download: '다운로드',
  noCertificates: '발급한 증빙서가 없어요',
} as const;

export const SUPERVISION_REQUEST = {
  title: '슈퍼비전 요청',
  sessionLabel: '대상 세션',
  noSessions: '요청할 수 있는 완료 세션이 없어요',
  questionLabel: '질문',
  questionTooLong: '질문은 500자까지 적을 수 있어요',
  maskNotice: '대화록은 개인정보를 가린 뒤 전문가에게 전달돼요.',
  submit: '요청하기',
  submitted: '슈퍼비전을 요청했어요',
  listTitle: '요청 목록',
  empty: '요청한 내역이 없어요',
  status: REQUEST_STATUS,
  free: '무료',
} as const;
