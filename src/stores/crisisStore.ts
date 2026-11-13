import { create } from 'zustand';

export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface CrisisTrigger {
  /** 사용자가 긴급 도움을 눌렀으면 manual, risk:alert 로 열렸으면 auto */
  source: 'manual' | 'auto';
  level?: RiskLevel;
  sessionId?: string;
}

// TRD 17-5
interface CrisisState {
  open: boolean;
  trigger: CrisisTrigger | null;
  openedAt: number | null;
  show: (trigger: CrisisTrigger) => void;
  close: () => void;
}

export const useCrisisStore = create<CrisisState>((set) => ({
  open: false,
  trigger: null,
  openedAt: null,
  show: (trigger) => set({ open: true, trigger, openedAt: Date.now() }),
  close: () => set({ open: false, trigger: null, openedAt: null }),
}));
