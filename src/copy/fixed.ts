// 고정 문구 (TRD 10-2: 화면 코드에 문구를 직접 쓰지 않는다)

export const SERVICE = {
  name: '마음 케어',
  coaching: '마음 코칭',
  professional: '전문 심리상담',
  coachingSummary: '수련생의 경청과 지지  ·  30분',
  professionalSummary: '자격을 확인한 전문가  ·  50분',
} as const;

export const NOTICE = {
  /** TRD A-01 고지 문구 */
  notMedical:
    '마음 코칭은 의료·진단 행위가 아닙니다. 지금 위험하다면 109(자살예방상담) 또는 112·119에 연락하세요.',
  aiNotDiagnosis: '참고용이며 진단이 아닙니다',
  emailPrivate: '입력한 이메일은 상담사에게 공개되지 않아요.',
  roleLocked: '선택한 역할은 나중에 바꿀 수 없어요.',
  nicknameOnly: '상담사에게는 이 이름만 보여요.',
  nicknamePersonalInfo: '실명이나 연락처처럼 보이는 이름은 피해주세요.',
} as const;

export const CRISIS = {
  button: '긴급 도움',
  title: '지금 바로 이야기할 수 있는 곳이 있어요',
  description: '도움을 받을 수 있는 연락처를 선택해 주세요.',
  continue: '상담 계속하기',
  close: '닫기',
  waitToClose: (seconds: number) => `${seconds}초 뒤에 닫을 수 있어요`,
} as const;

/** 서버에서 못 받았을 때 쓰는 내장 위기 연락처 (TRD 17-5). 오프라인에서도 보여야 한다. */
export const DEFAULT_CRISIS_CONTACTS = [
  { number: '109', name: '자살예방상담' },
  { number: '1577-0199', name: '정신건강위기상담' },
  { number: '112', name: '경찰' },
  { number: '119', name: '구급' },
] as const;

export const COMMON = {
  back: '뒤로',
  help: '도움말',
  next: '다음',
  retry: '다시 시도',
  home: '홈으로',
  confirm: '확인',
  cancel: '취소',
  loading: '불러오는 중이에요',
  logout: '로그아웃',
  offline: '인터넷 연결을 확인해 주세요',
  update: '새 버전이 있어요. 새로고침해 주세요',
  refresh: '새로고침',
  notFoundTitle: '찾을 수 없는 페이지예요',
  serverErrorTitle: '일시적인 오류가 발생했어요',
  requestId: (id: string) => `문의 번호 ${id}`,
  desktopOnly: '데스크톱에서 열어 주세요',
  maintenanceTitle: '점검 중입니다',
  maintenanceUntil: (time: string) => `${time}쯤 끝날 예정이에요`,
} as const;

export const NAV = {
  client: { home: '홈', sessions: '상담', notifications: '알림', settings: '내 정보' },
} as const;
