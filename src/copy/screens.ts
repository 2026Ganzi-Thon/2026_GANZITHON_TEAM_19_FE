// 화면별 고정 문구 (TRD 10-2). 새 디자인 '상세 시연' 시안과 TRD 12~13장의 문구를 옮긴 것이다.

export const LANDING = {
  headerTitle: '상담 시작',
  headline: '어떤 이야기도\n괜찮아요.',
  sub: '지금 필요한 도움을 선택해\n편한 속도로 시작해 보세요.',
  tracksLabel: '상담을 받으려면',
  start: '익명으로 시작하기',
  joinAsProvider: '상담사로 함께하기',
} as const;

/** 넓은 화면에서 앱 화면 옆에 보이는 서비스 소개 */
export const SHELL = {
  headline: '어떤 이야기도\n괜찮아요.',
  description:
    '익명으로 부담 없이 시작하는 마음 상담.\n휴대폰에서도 같은 화면으로 이어서 쓸 수 있어요.',
  /** 움직이는 고양이 버튼의 이름. 눌린 상태(aria-pressed)가 잠든 상태다 */
  petSleep: '고양이 재우기',
  petSleepHint: '누르면 고양이가 잠들어요',
  petWakeHint: '누르면 고양이가 일어나요',
} as const;

export const LOGIN = {
  titleLogin: '다시 만나 반가워요',
  titleSignup: '익명으로 부담 없이 시작해요',
  tabLogin: '로그인',
  tabSignup: '회원가입',
  google: 'Google로 계속하기',
  email: '이메일',
  emailPlaceholder: 'name@example.com',
  password: '비밀번호',
  passwordHint: '영문·숫자 포함 8자 이상',
  passwordPlaceholder: '비밀번호를 입력하세요',
  submitLogin: '로그인',
  submitSignup: '가입하기',
  forgot: '비밀번호를 잊으셨나요?',
  reset: '재설정',
  resetSent: '비밀번호 재설정 메일을 보냈어요',
  emailInvalid: '이메일 형식을 확인해 주세요',
  passwordInvalid: '영문과 숫자를 포함해 8자 이상 입력해 주세요',
} as const;

export const ONBOARDING = {
  step: (current: number) => `가입  ${current} / 3`,
  roleTitle: '어떤 역할로\n함께하시나요?',
  roles: [
    { value: 'client', title: '상담을 받고 싶어요', description: '내담자로 시작' },
    { value: 'trainee', title: '수련생으로 참여할게요', description: '마음 코칭을 제공하며 성장' },
    { value: 'expert', title: '전문 상담사로 참여할게요', description: '전문 심리상담과 슈퍼비전' },
  ],
  nicknameStep: '2 / 3 · 닉네임',
  nicknameTitle: '사용할 이름을 정해주세요',
  nicknameLabel: '닉네임',
  nicknamePlaceholder: '따뜻한구름',
  nicknameRule: '2~12자의 한글·영문·숫자로 정해 주세요',
  randomNickname: '랜덤 생성',
  termsStep: '3 / 3 · 약관',
  termsTitle: '이용 전 확인해 주세요',
  termsDescription: '필수 항목과 선택 항목을 구분해 주세요.',
  required: '(필수)',
  optional: '(선택)',
  viewTerms: '내용 보기',
  priorCounseling: '전문 상담을 받아본 적이 있나요? (선택)',
  priorCounselingOptions: [
    { value: 'yes', label: '있음' },
    { value: 'no', label: '없음' },
    { value: 'skip', label: '말하고 싶지 않음' },
  ],
  start: '시작하기',
  termsError: '약관을 불러오지 못했어요',
} as const;

export const STATUS = {
  pending: {
    title: '서류 심사 중입니다',
    description: '보통 1영업일 안에 결과를 알려드려요.',
    editProfile: '프로필 수정',
    viewDocuments: '서류 보기',
  },
  rejected: {
    title: '서류 심사가 반려되었어요',
    description: '반려 사유를 확인하고 서류를 다시 제출해 주세요.',
    resubmit: '서류 다시 제출',
  },
  suspended: {
    title: (until: string) => `배정이 ${until}까지 정지되었습니다`,
    description: '윤리 가이드 재교육을 마치면 확인을 눌러 주세요.',
    confirmTraining: '재교육 완료 확인',
    trainingDone: '재교육 완료를 확인했어요',
  },
  banned: {
    title: '이용할 수 없는 계정입니다',
    description: '운영 정책에 따라 영구 퇴출되었습니다.',
  },
  restricted: {
    title: '예약이 제한되었습니다',
    until: (until: string) => `${until}까지 새 예약을 할 수 없어요. 지난 상담은 볼 수 있어요.`,
  },
} as const;

export const CLIENT_HOME = {
  greeting: (nickname: string) => `안녕하세요,\n${nickname}님`,
  upcoming: '다가오는 상담',
  enterHint: '시작 10분 전부터 입장할 수 있어요.',
  enterLobby: '상담 대기실 입장',
  newIntake: '새 고민 털어놓기',
  recent: '최근 상담',
  rebook: '같은 상담사와 다시',
  allSessions: '상담 내역 전체 보기',
} as const;

export const SESSION_STATUS_LABEL = {
  pending_payment: '결제 대기',
  confirmed: '예약 확정',
  in_progress: '진행 중',
  completed: '완료',
  cancelled: '취소',
  no_show: '불참',
} as const;
