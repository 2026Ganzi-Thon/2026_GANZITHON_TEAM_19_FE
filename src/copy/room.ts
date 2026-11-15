// 수련생·전문가 상담방 문구 (TRD T-06, E-07)
import type { ReferralReasonCode } from '@/api/pendingProvider';

const REFERRAL_REASONS: ReadonlyArray<{ value: ReferralReasonCode; label: string }> = [
  { value: 'deep_issue', label: '더 깊은 탐색이 필요해요' },
  { value: 'risk', label: '위험 징후가 보여요' },
  { value: 'client_request', label: '내담자가 원해요' },
  { value: 'other', label: '기타' },
];

const SESSIONS_NEEDED = [
  { value: 0, label: '0회' },
  { value: 1, label: '1회' },
  { value: 2, label: '2회 이상' },
] as const;

export const PROVIDER_ROOM = {
  panelOpen: '세션 정보',
  end: '세션 종료',
  endTitle: '세션을 종료할까요?',
  endBody: '종료하면 내담자와의 대화가 끝나요.',
  endConfirm: '종료하기',
  ended: '세션을 종료했어요',
  sessionsNeededLabel: '배경 파악에 필요했던 회기 수 (선택)',
  sessionsNeeded: SESSIONS_NEEDED,
  supervisionTitle: '수련생 슈퍼비전을 작성해 주세요',
  supervisionBody: '연계된 상담이 끝났어요. 슈퍼비전을 작성하면 정산 보류가 풀려요.',
  supervisionGo: '슈퍼비전 작성하기',
  contactWarning: '연락처 교환은 운영 정책 위반입니다',
  tabsLabel: '세션 정보 구분',
  tabSummary: '요약',
  tabNote: '메모',
  tabHistory: '이전 회기',
  tabReferral: '권유',
  summaryTitle: '인테이크 요약',
  emotions: '정서',
  distortions: '생각 패턴',
  rawText: '내담자가 공유한 고민 글',
  rawTextHidden: '내담자가 고민 글 원문을 공유하지 않았어요.',
  noteLabel: '상담 메모',
  noteHint: '나만 볼 수 있어요.',
  noteSave: '메모 저장',
  noteSaved: '메모를 저장했어요',
  historyEmpty: '이 내담자와 진행한 이전 회기가 없어요',
  historyMood: (before: number | string, after: number | string) =>
    `마음 온도 ${before} → ${after}`,
  referralTitle: '전문 상담 권유',
  referralReasons: REFERRAL_REASONS,
  referralText: '한 줄 사유',
  referralSubmit: '권유 보내기',
  referralDone: '전문 상담을 권유했어요',
  riskTitle: '위기 대응',
  riskEvidence: '감지 근거',
  riskScripts: '대응 문장 (누르면 입력창에 들어가요)',
  riskCallOncall: '당직 전문가 호출',
  riskOncallCalled: '당직 전문가를 호출했어요',
  riskShare: '내담자에게 위기 자원 보내기',
  riskShared: '위기 자원을 보냈어요',
  riskAck: '확인했어요',
} as const;
