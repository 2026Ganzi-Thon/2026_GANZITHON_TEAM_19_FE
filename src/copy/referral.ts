// 상담 정리·전문 상담 연계·민원·동의 관리 화면 문구 (TRD 13장 C-11~C-14)
import type { ComplaintCategory, ConsentType, ReportStatus } from '@/api/pending';

const REPORT_STATUS: Record<ReportStatus, string> = {
  ready: '상담 정리 완료',
  generating: '정리 중',
  failed: '정리 지연',
};

const COMPLAINT_CATEGORIES: ReadonlyArray<{ value: ComplaintCategory; label: string }> = [
  { value: 'late_noshow', label: '지각·노쇼' },
  { value: 'religion_moralizing', label: '종교 권유·훈계·도덕적 비난' },
  { value: 'private_contact', label: '사적 연락 시도' },
  { value: 'insincere', label: '불성실한 응대' },
  { value: 'other', label: '기타' },
];

const CONSENT_TYPES: Record<ConsentType, string> = {
  terms: '이용약관',
  privacy: '개인정보 수집·이용',
  sensitive: '민감정보(정신건강 정보) 처리',
  age14: '만 14세 이상 확인',
  training_data: '수련 목적 비식별 활용',
  marketing: '마케팅 정보 수신',
  report_transfer: '종합 리포트 전달',
  transcript_transfer: '대화록 마스킹본 전달',
};

export const REPORT = {
  title: '오늘의 상담 정리',
  notice: 'AI가 상담 내용을 정리한 참고 자료예요. 진단이 아닙니다',
  meta: (date: string, name: string, sessionNo: number) =>
    `${date} · ${name}님과 ${sessionNo}번째 상담`,
  chief: '주요 이야기',
  patterns: '생각 패턴',
  triggers: '감정 계기와 대처',
  safety: '안전 점검',
  generating: '상담 정리를 만들고 있어요',
  failed: '정리가 지연되고 있어요',
  suggestTitle: '더 깊이 다뤄보고 싶다면',
  suggestBody:
    '이야기를 더 깊이 다뤄보고 싶다면 전문 상담사에게 이어갈 수 있어요. 지금까지의 상담을 모아 정리해 드려서 처음부터 다시 설명하지 않아도 돼요',
  traineeSuggested: '상담사가 전문 상담을 권했어요',
  explore: '전문 상담 알아보기',
  pastReports: '지난 상담 정리',
  view: '상담 정리 보기',
} as const;

export const REFERRAL = {
  step1: '1 / 3 · 포함할 상담',
  title1: '어떤 상담을 모을까요?',
  guide1: '고른 상담만 모아서 종합 리포트를 만들어요. 빼고 싶은 상담은 체크를 해제하세요',
  reportStatus: REPORT_STATUS,
  count: (count: number, max: number) =>
    `${count}개 선택 · 최소 1개, 최대 ${max}개 · 마지막 1개는 해제할 수 없어요.`,
  locked: '동의한 뒤에는 바꿀 수 없어요(바꾸려면 동의 관리에서 철회)',
  manageConsents: '동의 관리',
  next1: '전문가 고르기',
  step2: '2 / 3 · 전문가 선택',
  title2: '전문가를 골라 주세요',
  guide2: '전문 분야와 가능한 시간을 확인해요.',
  selected: '선택됨',
  earliest: (time: string) => `가장 빠른 시간 ${time}`,
  noCandidates: '지금 가능한 전문가가 없어요.',
  next2: '종합 리포트 확인',
  step3: '3 / 3 · 미리보기와 동의',
  title3: '전달할 내용을 확인해요',
  summary: (count: number, name: string) => `선택한 상담 ${count}회 · ${name} 1명에게 전달`,
  timelineTitle: '포함 상담 타임라인',
  reportTitle: '종합 리포트',
  generating: '종합 리포트를 만들고 있어요(보통 1~2분)',
  bookFirst: '먼저 예약하고, 리포트가 준비되면 홈에서 동의할 수 있어요',
  failed: '종합 리포트를 만들지 못했어요',
  retry: '다시 만들기',
  consentTitle: '민감정보 전달 동의',
  consentReport: '종합 리포트 전달에 동의해요.',
  consentTranscript: '마스킹 대화록 전달에 동의해요. (선택)',
  consentTarget: (name: string) => `전달 대상: ${name}`,
  consentItems: (count: number) =>
    `전달 항목: 종합 리포트 1건(상담 ${count}회 기반), 포함된 상담의 대화록 마스킹본`,
  consentPurpose: '목적: 전문 상담 준비 및 수련생 슈퍼비전',
  consentRevocable: '언제든 철회할 수 있어요. 동의하면 포함할 상담은 더 바꿀 수 없어요',
  agree: '동의하고 예약하기',
  skip: '리포트 없이 진행',
  skipNotice: '전문가가 첫 회기에 배경을 다시 여쭤볼 수 있어요',
  consented: '동의를 저장했어요',
} as const;

export const COMPLAINT = {
  link: '문제가 있었나요?',
  menu: '민원 제기',
  title: '어떤 문제가 있었나요?',
  categoryLabel: '유형',
  categories: COMPLAINT_CATEGORIES,
  descriptionLabel: '내용',
  notice: '대화록은 개인정보를 가린 뒤 운영자가 확인해요',
  submit: '민원 접수하기',
  doneTitle: '민원을 접수했어요',
  doneBody: '처리 결과는 알림으로 알려드릴게요.',
  closed: '상담이 끝나고 7일이 지나 민원을 접수할 수 없어요',
  tooLong: '1,000자까지 적을 수 있어요',
  categoryRequired: '유형을 골라 주세요',
} as const;

export const CONSENTS = {
  title: '동의 관리',
  description: '동의한 내용을 확인하고 전달 동의를 철회할 수 있어요.',
  types: CONSENT_TYPES,
  referralReport: (count: number) => `종합 리포트 (상담 ${count}회)`,
  target: (name: string) => `대상: ${name}`,
  grantedAt: (time: string) => `동의 ${time}`,
  active: '유효',
  revoked: '철회됨',
  includedSessions: '포함된 상담 날짜',
  revoke: '철회',
  revokeTitle: '동의를 철회할까요?',
  revokeBody: '철회하면 전문가가 더 이상 리포트를 볼 수 없어요',
  revokeConfirm: '철회하기',
  revokeDone: '동의를 철회했어요',
  requiredNotice: '필수 약관 동의는 탈퇴할 때만 철회돼요.',
  empty: '동의한 내역이 없어요',
} as const;
