// shortcut: 배포된 서버에 API가 없는 기능은 입구를 숨기고 호출도 하지 않는다 (2026-11-18 기준).
// 백엔드가 API를 만들면 해당 값을 true 로 바꾸고 화면을 서버 모양에 맞춘다
export const SERVER_HAS = {
  /** 수련생 피드백 목록·내용과 역량 (SUP-04~06) */
  supervisionFeedback: false,
  /** 전문가 연계 요청함과 슈퍼비전 목록·작성 (REF-05·06, SUP-01~03) */
  expertInbox: false,
  /** 내 스트라이크 (CMP-05) */
  strikes: false,
  /** 위기 때 당직 호출 (RSK-04) */
  oncall: false,
  /** 수련생의 전문 상담 권유 (REF-04) */
  referralSuggestion: false,
  /** 관리자 위기 이벤트 (RSK-01~03) */
  adminRisks: false,
  /** 화면 행동 기록 POST /events (TRD 17-6). 서버는 이벤트를 직접 센다 */
  analytics: false,
} as const;
