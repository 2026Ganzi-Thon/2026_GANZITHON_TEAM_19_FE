// 빈 상태 문구 (TRD 10-2)
export const EMPTY = {
  clientHome: {
    title: '아직 상담이 없어요.',
    description: '편하게 시작해 보세요',
    action: '새 고민 털어놓기',
  },
  matches: {
    title: '지금 가능한 상담사가 없어요.',
    description: '가능해지면 알려드릴게요',
    action: '알림 신청',
  },
  notifications: { title: '새 알림이 없어요', description: '', action: '' },
  sessions: {
    title: '아직 상담이 없어요.',
    description: '편하게 시작해 보세요',
    action: '새 고민 털어놓기',
  },
} as const;
