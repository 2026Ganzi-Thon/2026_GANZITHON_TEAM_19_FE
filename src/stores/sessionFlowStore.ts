import { create } from 'zustand';

/**
 * 예약·상담 흐름에서 화면 사이에 넘기는 값. 서버 응답에 없는 값만 둔다.
 * - 홀드 만료 시각: 예약(SES-01)에 성공한 시각 + 10분. 새로고침하면 사라지고 서버가 410 으로 막는다
 * - 상담 전 마음 온도: 종료 화면에서 견줘 보여 주려고 남긴다
 */
interface SessionFlowState {
  holdExpiresAt: Readonly<Record<string, number>>;
  moodBefore: Readonly<Record<string, number>>;
  setHold: (sessionId: string, expiresAt: number) => void;
  setMoodBefore: (sessionId: string, score: number) => void;
}

export const useSessionFlowStore = create<SessionFlowState>((set) => ({
  holdExpiresAt: {},
  moodBefore: {},
  setHold: (sessionId, expiresAt) =>
    set((state) => ({ holdExpiresAt: { ...state.holdExpiresAt, [sessionId]: expiresAt } })),
  setMoodBefore: (sessionId, score) =>
    set((state) => ({ moodBefore: { ...state.moodBefore, [sessionId]: score } })),
}));
