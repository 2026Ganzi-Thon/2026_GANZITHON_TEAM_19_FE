// 수련생·전문가의 대시보드·가용 시간·세션·정산 문구 (TRD 14~15장)
import type { MySlot } from '@/api/endpoints/slots';
import type { Schema } from '@/api/types';

type SlotStatus = NonNullable<MySlot['status']>;
type SettlementStatus = NonNullable<Schema<'SettlementResponse'>['status']>;
type SettlementKind = NonNullable<Schema<'SettlementResponse'>['kind']>;

const SLOT_STATUS: Record<SlotStatus, string> = {
  open: '열림',
  held: '결제 대기',
  booked: '예약됨',
};

const SETTLEMENT_STATUS: Record<SettlementStatus, string> = {
  locked: '잠금',
  held: '보류',
  pending: '지급 예정',
  paid: '지급 완료',
};

const SETTLEMENT_KIND: Record<SettlementKind, string> = {
  session: '세션',
  supervision: '슈퍼비전',
};

export const DASHBOARD = {
  traineeTitle: (name: string) => `안녕하세요,\n${name}님`,
  upcoming: '오늘·다가오는 세션',
  noUpcoming: '예정된 세션이 없어요',
  enter: '입장',
  newFeedback: '새로 도착한 슈퍼비전 피드백',
  noFeedback: '새 피드백이 없어요',
  totals: '누적 수련',
  hours: (hours: number) => `${hours}시간`,
  sessions: (count: number) => `세션 ${count}회`,
  supervisions: (count: number) => `슈퍼비전 ${count}건`,
  settlement: '이번 달 정산 예정액',
  strikes: '스트라이크',
  strikeCount: (count: number, limit: number) => `${count} / ${limit}`,
  newReferrals: '새 연계 요청',
  referralWaiting: (count: number) => `수락 대기 ${count}건`,
  referralDeadline: (time: string) => `가장 급한 요청 ${time} 남음`,
  noReferrals: '수락을 기다리는 요청이 없어요',
  supervisionTodo: '작성할 슈퍼비전',
  noSupervisionTodo: '작성할 슈퍼비전이 없어요',
  supervisionItem: (name: string, count: number) => `${name} · 대상 회기 ${count}개`,
  supervisionDue: (time: string) => `기한 ${time}`,
  supervisionGroup: (total: number, remaining: number) => `${total}건 중 ${remaining}건 남음`,
  settlementLocked: '정산 잠금',
  requestsWaiting: (count: number) => `슈퍼비전 요청 대기 ${count}건`,
  settlementSummary: '이번 달 정산',
  viewAll: '전체 보기',
} as const;

export const AVAILABILITY = {
  title: '가용 시간 관리',
  coachingRule: '마음 코칭 한 번은 30분이에요.',
  professionalRule: '전문 상담 한 번은 50분이고, 다음 상담까지 10분을 쉬어요.',
  prevWeek: '이전 주',
  nextWeek: '다음 주',
  daysLabel: '날짜',
  cellsLabel: '시간',
  repeatLabel: '반복',
  repeatNone: '반복 없음',
  repeatWeeks: (weeks: number) => `${weeks}주 더`,
  repeatHint: '매주 같은 요일·시간으로 더 열어요.',
  slotStatus: SLOT_STATUS,
  cellOpen: (time: string) => `${time} 열림, 누르면 닫아요`,
  cellLocked: (time: string, status: string) => `${time} ${status}`,
  cellEmpty: (time: string) => `${time} 선택`,
  create: (count: number) => `선택한 ${count}개 시간 열기`,
  created: '시간을 열었어요',
  deleted: '시간을 닫았어요',
  suspended: '배정이 정지된 동안에는 새 시간을 열 수 없어요',
  legend: '노란색은 고른 시간, 진한 색은 열린 시간, 회색은 예약된 시간이에요.',
} as const;

export const PROVIDER_SESSIONS = {
  title: '세션 목록',
  tabsLabel: '세션 구분',
  tabUpcoming: '예정',
  tabDone: '완료',
  visit: (count: number) => `${count}번째 회기`,
  rebook: '재예약',
  referred: '전문 상담 연계',
  supervisionReady: '슈퍼비전 도착',
  reportStatus: (label: string) => `리포트 ${label}`,
  emptyUpcoming: '예정된 세션이 없어요',
  emptyDone: '완료한 세션이 없어요',
} as const;

export const SETTLEMENTS = {
  title: '정산 내역',
  tabsLabel: '내역 구분',
  tabSettlements: '정산',
  tabStrikes: '스트라이크',
  monthLabel: '월',
  status: SETTLEMENT_STATUS,
  kind: SETTLEMENT_KIND,
  professionalSession: '전문 상담',
  total: '합계',
  empty: '이 달의 정산 내역이 없어요',
  lockedHint: '슈퍼비전을 모두 작성하면 지급 예정으로 바뀌어요',
  writeSupervision: '슈퍼비전 작성하기',
  strikeCount: (count: number, limit: number) => `현재 누적 ${count} / ${limit}`,
  strikeEmpty: '스트라이크 이력이 없어요',
  ethicsGuide: '윤리 가이드 다시 보기',
  revoked: '취소됨',
} as const;
