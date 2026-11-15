// 전문가의 연계 요청함·연계 리포트 문구 (TRD E-05, E-06). 전문가에게는 임상 용어를 그대로 보여 준다.
import type { ReferralDeclineReason, RiskLevel } from '@/api/pendingProvider';

const RISK_LEVEL: Record<RiskLevel, string> = {
  none: '없음',
  low: '낮음',
  medium: '보통',
  high: '높음',
  critical: '위기',
};

const DECLINE_REASONS: ReadonlyArray<{ value: ReferralDeclineReason; label: string }> = [
  { value: 'schedule', label: '일정 불가' },
  { value: 'out_of_scope', label: '전문 분야 아님' },
  { value: 'other', label: '기타' },
];

export const EXPERT_REFERRAL = {
  title: '연계 요청함',
  empty: '도착한 연계 요청이 없어요',
  riskLevel: RISK_LEVEL,
  risk: (label: string) => `AI 위험도 ${label}`,
  reportConsented: (count: number) => `리포트 동의 있음 · 상담 ${count}회 종합`,
  reportPreparing: '리포트 준비 중',
  reportNoConsent: '리포트 동의 없음',
  traineeReason: (reason: string) => `수련생 권유 사유: ${reason}`,
  deadline: '수락 기한',
  accept: '수락',
  decline: '거절',
  accepted: '수락한 요청',
  declined: '거절한 요청',
  expired: '기한이 지나 자동으로 거절되었어요',
  acceptedToast: '연계 요청을 수락했어요',
  declinedToast: '연계 요청을 거절했어요',
  declineTitle: '거절 사유를 골라 주세요',
  declineBody: '거절하면 내담자에게 환불과 재선택 안내가 자동으로 가요.',
  declineReasons: DECLINE_REASONS,
  declineConfirm: '거절하기',
  viewReport: 'AI 연계 리포트 보기',
} as const;

export const EXPERT_REPORT = {
  title: 'AI 연계 리포트',
  notice: 'AI 생성 참고 자료. 임상 판단은 전문가가 합니다',
  watermark: (name: string) => `외부 유출 금지 · ${name}`,
  timeline: '포함 회기 타임라인',
  sessionLine: (sessionNo: number, date: string, trainee: string, minutes: number) =>
    `${sessionNo}회기 · ${date} · ${trainee} · ${minutes}분`,
  mood: (before: number | string, after: number | string) => `기분 ${before} → ${after}`,
  chiefComplaint: '주요 호소 문제 (Chief Complaint)',
  distortions: '핵심 인지 왜곡 패턴',
  sessionRef: (sessionNo: number) => `${sessionNo}회기`,
  triggers: '정서적 트리거',
  defenses: '방어기제',
  progress: '변화 추이',
  redFlag: '자해/타해 고위험군 징후 (Red Flag)',
  redFlagMax: (label: string) => `최고 수준: ${label}`,
  focus: '첫 회기 탐색 제안 (참고용)',
  consent: '동의 정보',
  consentLine: (time: string, version: number) => `${time} 동의 · 리포트 버전 ${version}`,
  scopeReport: '리포트',
  scopeTranscript: '대화록 마스킹본',
  generating: '연계 리포트를 만들고 있어요',
  noConsentTitle: '내담자가 아직 동의하지 않았어요',
  noConsentBody: '동의하면 알림으로 알려드려요',
  revokedTitle: '내담자가 열람 동의를 철회했어요',
} as const;
