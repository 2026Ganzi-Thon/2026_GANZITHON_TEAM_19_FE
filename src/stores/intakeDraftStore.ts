import { create } from 'zustand';

import type { IntakeCategory } from '@/api/endpoints/intakes';

export type PreferredTime = 'morning' | 'afternoon' | 'evening' | 'night';

interface SubmittedDraft {
  text: string;
  shareRaw: boolean;
  preferredTimes: readonly PreferredTime[];
}

/** 고민 글 초안 (TRD C-02). 민감정보라 메모리에만 두고 브라우저 저장소에는 남기지 않는다. */
interface IntakeDraftState extends SubmittedDraft {
  category: IntakeCategory | null;
  setCategory: (category: IntakeCategory) => void;
  /** 제출한 내용을 남겨 둔다. 후보가 없을 때 알림 신청으로 다시 보내는 데 쓴다 */
  keepSubmitted: (draft: SubmittedDraft) => void;
  reset: () => void;
}

const EMPTY = { category: null, text: '', shareRaw: false, preferredTimes: [] } as const;

export const useIntakeDraftStore = create<IntakeDraftState>((set) => ({
  ...EMPTY,
  setCategory: (category) => set({ category }),
  keepSubmitted: (draft) => set(draft),
  reset: () => set(EMPTY),
}));
