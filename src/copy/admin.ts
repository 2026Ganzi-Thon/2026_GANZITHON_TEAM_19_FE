// 어드민 화면 문구 (TRD 16장)
import type { AdminUser } from '@/api/endpoints/admin';
import type { Credential } from '@/api/endpoints/credentials';

type Role = NonNullable<AdminUser['role']>;
type Status = NonNullable<AdminUser['status']>;
type VerifyResult = NonNullable<Credential['verify_result']>;

const ROLE_LABEL: Record<Role, string> = {
  client: '내담자',
  trainee: '수련생',
  expert: '전문가',
  admin: '어드민',
};

const STATUS_LABEL: Record<Status, string> = {
  active: '정상',
  pending_review: '심사 중',
  rejected: '반려',
  suspended: '정지',
  banned: '퇴출',
  restricted: '예약 제한',
  withdrawn: '탈퇴',
};

const VERIFY_LABEL: Record<VerifyResult, string> = {
  match: '일치',
  mismatch: '불일치',
  unavailable: '확인 불가',
  none: '없음',
};

const SETTING_LABEL: Record<string, string> = {
  coaching: '마음 코칭 가격·세션 길이·수수료율',
  professional: '전문 심리상담 가격·세션 길이·수수료율',
  supervision: '슈퍼비전 정산 단가',
  supervision_request: '수련생 슈퍼비전 요청 비용 (0이면 무상)',
  refund_policy: '환불 규정 (전액 환불 기한, 시간)',
  crisis_contacts: '위기 연락처 목록',
  oncall: '당직자 지정',
  crisis_scripts: '위기 대응 스크립트 문구',
  referral_respond_hours: '연계 수락 기한 (시간)',
  referral_report: '연계 리포트 설정',
  marketing_cost: '마케팅 비용 (CAC 계산용)',
  feature_flags: '기능 플래그 (P1 기능 켜기·끄기)',
  maintenance: '점검 모드',
};

export const ADMIN = {
  brand: '마음 케어 어드민',
  menuLabel: '어드민 메뉴',
  menu: {
    risks: 'Red Flag',
    credentials: '자격 심사',
    complaints: '민원',
    strikes: '스트라이크·제재',
    kpi: 'KPI',
    users: '사용자',
    settlements: '정산',
    settings: '운영 설정',
  },
  open: '열기',
  close: '닫기',
  more: '더 보기',
  all: '전체',
  empty: '조건에 맞는 항목이 없어요',
  reason: '사유',
  reasonRequired: '사유를 입력해 주세요',
  role: ROLE_LABEL,
  status: STATUS_LABEL,
  verify: VERIFY_LABEL,
  riskAlert: (level: string) => `새 위기 경고 (${level})`,
  riskAlertOpen: '바로 보기',
} as const;

export const ADMIN_CREDENTIALS = {
  title: '자격 심사 대기열',
  filterRole: '역할',
  filterKind: '자격 종류',
  filterVerify: '자동 검증 결과',
  kindSchool: '재학·수료',
  kindNational: '국가',
  kindSociety: '학회',
  submittedAt: '제출일',
  displayName: '활동명',
  certName: '자격명',
  verifyResult: '자동 검증',
  waiting: '대기 시간',
  detailTitle: '자격 심사 상세',
  realName: (name: string) => `실명: ${name}`,
  realNameNotice: '실명을 본 기록은 감사 로그에 남아요.',
  document: '서류',
  noFile: '올린 파일이 없어요',
  openFile: '새 창에서 열기',
  zoomIn: '확대',
  zoomOut: '축소',
  rotate: '회전',
  compareTitle: '입력값 · AI 판독값 · 자동 검증 응답',
  field: '항목',
  input: '입력값',
  ocr: 'AI 판독값',
  verified: '자동 검증 응답',
  fieldCertName: '자격명',
  fieldCertNumber: '자격번호',
  fieldIssuedOn: '발급·취득일',
  userCorrected: '신청자가 AI 판독값을 직접 고쳤어요',
  approve: '승인',
  reject: '반려',
  rejectReasons: [
    '서류가 흐려서 확인할 수 없음',
    '자격 정보가 일치하지 않음',
    '자격 요건에 맞지 않음',
  ],
  rejectDetail: '반려 사유 (신청자에게 전달돼요)',
  goNext: '결정 후 다음 대기 건으로 이동',
  approved: '승인했어요',
  rejected: '반려했어요',
} as const;

export const ADMIN_USERS = {
  title: '사용자 관리',
  search: '닉네임·활동명 검색',
  filterRole: '역할',
  filterStatus: '상태',
  joinedAt: '가입일',
  nickname: '닉네임',
  displayName: '활동명',
  drawerTitle: '사용자 상태',
  privacyNotice: '내담자의 이메일과 실명은 표시하지 않아요.',
  newStatus: '바꿀 상태',
  until: '기한 (정지·예약 제한)',
  change: '상태 변경',
  changed: '상태를 바꿨어요',
  forceLogout: '강제 로그아웃',
  loggedOut: '로그인 토큰을 폐기했어요',
} as const;

const SETTING_FIELD: Record<string, string> = {
  price: '가격 (원)',
  duration_min: '세션 길이 (분)',
  fee_rate: '수수료율 (0~1)',
  full_refund_hours: '전액 환불 기한 (시간)',
  lookback_days: '조회 기간 (일)',
  max_sessions: '최대 포함 회기',
  max_supervised_trainees: '슈퍼비전 최대 수련생',
  on: '켜기',
  message: '안내 메시지',
  until: '종료 예정 시각',
  p1_certificates: '수련 이력 증빙서',
  p1_supervision_requests: '수련생 슈퍼비전 요청',
  p1_complaints: '민원·3진 아웃',
  p1_credential_auto_verify: '자격 자동 검증',
};

export const ADMIN_SETTINGS = {
  title: '운영 설정',
  fields: SETTING_FIELD,
  valueLabel: '값',
  reasonLabel: '변경 사유 (선택)',
  numberRequired: '숫자를 입력해 주세요',
  description: '가격 변경은 이후 예약부터 적용돼요.',
  labels: SETTING_LABEL,
  jsonHint: '값은 JSON 형식으로 적어요.',
  jsonInvalid: 'JSON 형식이 올바르지 않아요',
  save: '저장',
  saved: '설정을 저장했어요',
  updatedAt: (time: string) => `마지막 변경 ${time}`,
  confirmTitle: '바로 반영되는 설정이에요',
  confirmBody: '내담자 화면에 바로 반영돼요',
  /** 저장 전에 한 번 더 확인하는 키 */
  immediateKeys: ['feature_flags', 'maintenance'],
} as const;
