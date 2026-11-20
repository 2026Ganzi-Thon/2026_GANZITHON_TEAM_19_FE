// 내담자 접수·예약·상담 화면 문구 (TRD 13장 C-02~C-10). 새 디자인 '상세 시연' 시안과 TRD 문구를 옮긴 것이다.
import type { IntakeCategory } from '@/api/endpoints/intakes';
import type { PreferredTime } from '@/stores/intakeDraftStore';

const CATEGORIES: ReadonlyArray<{ value: IntakeCategory; label: string }> = [
  { value: 'career', label: '취업·진로' },
  { value: 'burnout', label: '번아웃' },
  { value: 'relationship', label: '대인관계' },
  { value: 'romance', label: '연애' },
  { value: 'family', label: '가족' },
  { value: 'self', label: '자존감' },
  { value: 'other', label: '기타' },
];

const TIMES: ReadonlyArray<{ value: PreferredTime; label: string }> = [
  { value: 'morning', label: '오전' },
  { value: 'afternoon', label: '오후' },
  { value: 'evening', label: '저녁' },
  { value: 'night', label: '심야' },
];

export const INTAKE = {
  categoryStep: '1 / 2 · 고민 선택',
  categoryTitle: '어떤 일로 마음이 무거운가요?',
  categoryDescription: '가장 가까운 주제를 하나 골라 주세요.',
  categories: CATEGORIES,
  writeStep: '고민 작성  2 / 2',
  writeTitle: '어떤 이야기를\n나누고 싶으세요?',
  writeGuide: '편하게 적어주세요. 이름·회사명 같은 개인정보는 빼고 적어도 괜찮아요',
  textLabel: '고민 이야기',
  textTooLong: '2,000자까지 적을 수 있어요',
  shareRaw: '상담사에게 원문 보여주기',
  shareRawHint: '선택하지 않으면 상담사는 고민 주제와 AI 태그만 봐요.',
  timesLabel: '선호 시간대',
  times: TIMES,
  submit: '분석하고 매칭하기',
  loadingSteps: ['마음을 읽고 있어요', '잘 맞는 상담사를 찾고 있어요'],
} as const;

export const TEXT_COUNT = {
  moreNeeded: (count: number) => `${count}자 더 적어주세요`,
  progress: (current: number, max: number) =>
    `${current.toLocaleString('ko-KR')} / ${max.toLocaleString('ko-KR')}`,
} as const;

export const LEAVE = {
  title: '작성 중인 내용이 있어요',
  description: '나가면 적은 내용이 사라져요.',
  stay: '계속 작성',
  leave: '나가기',
} as const;

export const MATCHES = {
  title: '이런 분과\n이야기해 보세요',
  notice: 'AI 분석은 참고용이며 진단이 아닙니다.',
  summaryTitle: 'AI가 읽은 마음',
  emotions: '정서 키워드',
  distortions: '생각 패턴',
  aiFallback: 'AI 분석은 잠시 후 반영돼요',
  listTitle: '추천 대상',
  others: '다른 상담사 보기',
  noOthers: '지금은 다른 상담사가 없어요',
  notifyDone: '가능해지면 알려드릴게요',
  price: (value: number) => `${value.toLocaleString('ko-KR')}원`,
} as const;

export const PROVIDER = {
  title: (name: string) => `${name}님을 소개해요`,
  specialties: (list: string) => `관심 분야: ${list}`,
  aboutTitle: '소개와 자격',
  rating: (average: string, count: number) => `후기 평점 ${average} (${count}개)`,
  dateTitle: '날짜 선택',
  timeTitle: '가능한 시간',
  noSlotsOnDate: '이 날은 가능한 시간이 없어요',
  noSlots: '지금은 예약할 수 있는 시간이 없어요',
  duration: (minutes: number) => `${minutes}분`,
  holdNote: '선택한 시간은 결제 중 10분간 보관됩니다.',
  book: '예약하기',
  unavailable: '지금은 예약할 수 없는 상담사예요',
  newIntake: '새 고민 털어놓기',
} as const;

export const CHECKOUT = {
  title: '예약을 확인해요',
  holdNote: '예약 자리는 10분간 유지돼요.',
  remaining: '남은 시간',
  nameLabel: '이름',
  birthLabel: '생년월일',
  phoneLabel: '휴대폰 번호',
  phonePlaceholder: '010-0000-0000',
  identityNotice: '결제를 위해서만 확인하며 상담사에게 절대 전달되지 않아요',
  identityDone: '본인인증을 마쳤어요',
  methodTitle: '결제 수단',
  methodMock: '모의 결제 (시연용)',
  refundAgree: '환불 규정을 확인했어요.',
  refundPolicy: '24시간 전 취소 100% 환불, 이후 환불 불가',
  submitMock: '모의 결제하고 예약하기',
  submit: '결제하고 예약하기',
  confirmed: '예약이 확정되었어요',
  failed: '결제에 실패했어요. 다시 시도해 주세요',
  unsupported: '지금은 사용할 수 없는 결제 수단이에요',
  alreadyConfirmed: '이미 예약이 확정된 상담이에요',
  nameRequired: '이름을 입력해 주세요',
  birthInvalid: '생년월일을 확인해 주세요',
  phoneInvalid: '휴대폰 번호를 확인해 주세요',
  refundRequired: '환불 규정을 확인해 주세요',
} as const;

export const SESSIONS = {
  title: '나의 상담',
  description: '예정된 상담과 지난 이야기를 확인해요.',
  tabsLabel: '상담 구분',
  tabUpcoming: '예정',
  tabPast: '지난 상담',
  enter: '입장',
  enterLobby: '상담 대기실 입장',
  pay: '결제 이어서 하기',
  cancel: '취소',
  cancelTitle: '상담을 취소할까요?',
  cancelRefundFull: '지금 취소하면 전액 환불돼요.',
  cancelRefundNone: '상담 시작까지 24시간이 남지 않아 환불되지 않아요.',
  cancelKeep: '돌아가기',
  cancelConfirm: '취소하기',
  cancelReason: '내담자 취소',
  cancelled: '상담을 취소했어요',
  rebook: '같은 상담사와 다시',
  emptyPast: '지난 상담이 없어요',
} as const;

export const MOOD = {
  hint: '1은 매우 힘듦, 10은 매우 편안함',
  valueText: (score: number) => `${score}점`,
  before: (score: number) => `상담 전 ${score}점`,
} as const;

export const LOBBY = {
  label: '상담 대기실',
  title: '곧 이야기가\n시작돼요.',
  untilStart: '시작까지',
  enterHint: '시작 10분 전부터 입장할 수 있어요.',
  entryClosed: '상담 시간이 지나 입장할 수 없어요.',
  moodTitle: '지금 마음의 온도는?',
  etiquette: '연락처 교환과 녹취·캡처 공유는 할 수 없어요.\n불편하면 언제든 나갈 수 있어요.',
  enter: '상담방 입장',
  later: '나중에 기록',
  notAvailable: '지금은 들어갈 수 없는 상담이에요',
} as const;

export const ROOM = {
  listLabel: '대화',
  connected: '연결됨',
  connecting: '연결 중',
  unstable: '연결이 불안정해요',
  remaining: '남은 시간',
  me: '나',
  typing: (name: string) => `${name}님이 입력 중 ···`,
  messageLabel: '메시지',
  placeholder: '메시지를 입력하세요',
  send: '전송',
  sending: '전송 중',
  failed: '전송하지 못했어요',
  retry: '재전송',
  newMessage: '새 메시지',
  olderMessages: '이전 메시지 더 보기',
  tooLong: '메시지는 1,000자까지 보낼 수 있어요',
  leave: '상담 나가기',
  leaveTitle: '상담방에서 나갈까요?',
  leaveDescription: '상담이 끝나기 전에는 다시 들어올 수 있어요.',
  leaveConfirm: '나가기',
  stay: '계속 상담하기',
  riskTitle: '지금 바로 도움을 받을 수 있어요',
  riskBody: '힘든 마음을 나눠주셔서 고마워요.',
  riskCall: '109 전화',
  riskNumber: '109',
  noShowTitle: '상담사가 입장하지 않았어요',
  noShowBody: '전액 환불됩니다. 민원은 자동으로 접수됐어요.',
  endingSoon: (minutes: number) => `상담 종료 ${minutes}분 전이에요`,
  contactTitle: '연락처로 보이는 내용이 있어요',
  contactBody: '상담방에서는 연락처를 주고받을 수 없어요.',
  contactEdit: '수정하기',
  contactSend: '그대로 보내기',
  contactWarned: '연락처 교환은 할 수 없어요',
  joinFailed: '상담방에 들어가지 못했어요',
} as const;

export const COUNTDOWN = {
  minutesLeft: (minutes: number) => `${minutes}분 남음`,
} as const;

export const DONE = {
  title: '오늘 이야기해 주셔서 고마워요',
  description: '지금 마음의 온도도 살펴볼까요?',
  moodTitle: '상담 후 마음 온도',
  ratingTitle: '오늘의 시간은 어땠나요?',
  ratingLabel: (score: number) => `별점 ${score}점`,
  reviewLabel: '한 줄 후기 (선택)',
  reviewPlaceholder: '경험을 남겨주세요.',
  reviewTooLong: '후기는 1,000자까지 적을 수 있어요',
  reportNotice: '오늘 상담 정리는 준비되면 알려드릴게요',
  submit: '제출하고 홈으로',
  submitted: '소중한 기록 고마워요',
} as const;
