// 오류 코드별 사용자 문구와 표시 방식 (TRD 17-2, 18-2). 서버 message 는 그대로 노출하지 않는다.
// 코드 표는 백엔드 ErrorCode 와 같다.

export type ErrorDisplay = 'toast' | 'field' | 'screen' | 'redirect';

export interface ErrorCopy {
  message: string;
  display: ErrorDisplay;
}

const ERROR_MESSAGES: Record<string, ErrorCopy> = {
  NETWORK_ERROR: { message: '인터넷 연결을 확인해 주세요', display: 'toast' },
  BAD_REQUEST: { message: '요청을 처리하지 못했어요. 다시 시도해 주세요', display: 'toast' },
  UNAUTHENTICATED: { message: '다시 로그인해 주세요', display: 'redirect' },
  FORBIDDEN_ROLE: { message: '접근 권한이 없어요', display: 'toast' },
  FORBIDDEN_RESOURCE: { message: '접근 권한이 없어요', display: 'screen' },
  ACCOUNT_PENDING: { message: '서류 심사 중입니다', display: 'redirect' },
  ACCOUNT_REJECTED: { message: '서류 심사가 반려되었어요', display: 'redirect' },
  ACCOUNT_SUSPENDED: { message: '이용이 정지된 계정이에요', display: 'redirect' },
  ACCOUNT_BANNED: { message: '이용할 수 없는 계정이에요', display: 'redirect' },
  CLIENT_RESTRICTED: { message: '예약이 제한되었습니다', display: 'redirect' },
  NO_CONSENT: { message: '내담자가 아직 동의하지 않았어요', display: 'screen' },
  CONSENT_REVOKED: { message: '내담자가 열람 동의를 철회했어요', display: 'screen' },
  FEATURE_DISABLED: { message: '지금은 사용할 수 없는 기능이에요', display: 'screen' },
  USER_NOT_REGISTERED: { message: '가입을 먼저 완료해 주세요', display: 'redirect' },
  NOT_FOUND: { message: '찾을 수 없는 페이지예요', display: 'screen' },
  ALREADY_REGISTERED: { message: '이미 가입된 계정이에요', display: 'redirect' },
  NICKNAME_TAKEN: { message: '이미 사용 중인 이름이에요', display: 'field' },
  SLOT_TAKEN: {
    message: '방금 다른 분이 예약한 시간이에요. 다른 시간을 골라 주세요',
    display: 'toast',
  },
  SLOT_BOOKED: { message: '예약된 시간은 지울 수 없어요', display: 'toast' },
  SLOT_OVERLAP: { message: '다른 시간과 겹쳐요', display: 'toast' },
  COMPLAINT_EXISTS: { message: '이미 접수된 민원이 있어요', display: 'toast' },
  ALREADY_SUBMITTED: { message: '이미 제출했어요', display: 'toast' },
  ACTIVE_SESSIONS_EXIST: {
    message: '예정되거나 진행 중인 상담이 있어서 탈퇴할 수 없어요',
    display: 'toast',
  },
  INVALID_STATE: { message: '지금은 할 수 없는 요청이에요', display: 'toast' },
  REPORT_NOT_READY: { message: '정리를 만들고 있어요', display: 'toast' },
  INCLUDED_LOCKED: {
    message: '동의한 뒤에는 바꿀 수 없어요(바꾸려면 동의 관리에서 철회)',
    display: 'toast',
  },
  HOLD_EXPIRED: {
    message: '예약 대기 시간이 지났어요. 시간을 다시 골라 주세요',
    display: 'redirect',
  },
  VALIDATION_ERROR: { message: '입력값을 확인해 주세요', display: 'field' },
  CREDENTIAL_MISMATCH: { message: '입력한 정보가 자격 정보와 달라요', display: 'field' },
  SUPERVISION_INVALID: { message: '작성 조건을 채우지 못한 항목이 있어요', display: 'field' },
  SESSION_NOT_ELIGIBLE: { message: '포함할 수 없는 상담이에요', display: 'toast' },
  RATE_LIMITED: { message: '잠시 후 다시 시도해 주세요', display: 'toast' },
  INTERNAL: { message: '일시적인 오류가 발생했어요', display: 'screen' },
  VERIFIER_UNAVAILABLE: {
    message: '자동 확인이 잠시 안 돼요. 서류로 제출해 주세요',
    display: 'toast',
  },
  AI_UNAVAILABLE: { message: 'AI 분석은 잠시 후 반영돼요', display: 'toast' },
  MAINTENANCE: { message: '점검 중입니다', display: 'screen' },
};

const DEFAULT_ERROR: ErrorCopy = {
  message: '일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요',
  display: 'toast',
};

export function errorCopy(code: string): ErrorCopy {
  return ERROR_MESSAGES[code] ?? DEFAULT_ERROR;
}

// Firebase Auth 오류 (TRD A-02)
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': '이미 가입된 이메일입니다. 로그인해 주세요',
  'auth/wrong-password': '이메일 또는 비밀번호를 확인해 주세요',
  'auth/invalid-credential': '이메일 또는 비밀번호를 확인해 주세요',
  'auth/user-not-found': '이메일 또는 비밀번호를 확인해 주세요',
  'auth/invalid-email': '이메일 형식을 확인해 주세요',
  'auth/weak-password': '비밀번호는 영문·숫자 포함 8자 이상이어야 해요',
  'auth/too-many-requests': '시도가 너무 많았어요. 잠시 후 다시 시도해 주세요',
  'auth/network-request-failed': '인터넷 연결을 확인해 주세요',
  'auth/unauthorized-domain':
    '이 주소에서는 Google 로그인을 쓸 수 없어요. 이메일로 로그인해 주세요',
};

const DEFAULT_AUTH_ERROR = '로그인하지 못했어요. 잠시 후 다시 시도해 주세요';

/** 사용자가 직접 닫은 팝업처럼 알릴 필요가 없는 오류 */
const SILENT_AUTH_CODES = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];

export function authErrorMessage(code: string): string | null {
  if (SILENT_AUTH_CODES.includes(code)) return null;
  return AUTH_ERROR_MESSAGES[code] ?? DEFAULT_AUTH_ERROR;
}
