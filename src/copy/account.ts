// 설정·알림함·증빙서 확인 화면 문구 (TRD 12장 A-05, A-06)
import type { PushResult } from '@/lib/push';

const PUSH_RESULT: Record<PushResult, string> = {
  enabled: '알림을 켰어요',
  denied: '브라우저 설정에서 허용해 주세요',
  unsupported: '이 브라우저에서는 알림을 받을 수 없어요',
  unavailable: '지금은 알림을 켤 수 없어요',
};

export const SETTINGS = {
  title: '내 정보',
  nicknameLabel: '닉네임',
  nicknameSave: '닉네임 변경',
  nicknameSaved: '닉네임을 바꿨어요',
  pushTitle: '알림',
  pushDescription: '예약과 상담 정리 소식을 알려드려요.',
  pushIosNotice: 'iPhone에서는 홈 화면에 추가한 뒤에 알림을 받을 수 있어요.',
  pushEnable: '알림 켜기',
  pushResult: PUSH_RESULT,
  menuTitle: '바로 가기',
  consents: '동의 관리',
  profile: '프로필',
  traineeCredentials: '재학·수료 서류',
  expertCredentials: '자격 등록',
  availability: '가용 시간 관리',
  growth: '역량 차트·증빙서',
  supervisionRequests: '슈퍼비전 요청',
  settlements: '정산 내역',
  logout: '로그아웃',
  withdraw: '회원 탈퇴',
  withdrawTitle: '정말 탈퇴할까요?',
  withdrawBody: '탈퇴하면 30일 후 모든 정보가 영구 삭제돼요.',
  withdrawConfirm: '탈퇴하기',
  withdrawn: '탈퇴 처리했어요',
} as const;

export const NOTIFICATIONS = {
  title: '알림',
  readAll: '모두 읽음',
  unread: '읽지 않음',
  more: '더 보기',
} as const;

export const VERIFY = {
  title: '증빙서 진위 확인',
  valid: '유효한 증빙서',
  invalid: '무효 처리된 증빙서',
  notFound: '확인할 수 없는 증빙서입니다',
  code: '발급 번호',
  trainee: '수련생',
  issuedAt: '발급일',
  hours: (hours: number) => `누적 실전 ${hours}시간`,
  sessions: (count: number) => `마음 코칭 ${count}회`,
  supervisions: (count: number) => `슈퍼비전 ${count}건`,
  record: '활동 기록',
} as const;
