import { create } from 'zustand';

export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface CrisisTrigger {
  /** 사용자가 긴급 도움을 눌렀으면 manual, risk:alert 로 열렸으면 auto */
  source: 'manual' | 'auto';
  level?: RiskLevel;
  sessionId?: string;
}

export interface SessionRisk {
  sessionId: string;
  level: RiskLevel;
}

// TRD 17-5
interface CrisisState {
  open: boolean;
  trigger: CrisisTrigger | null;
  openedAt: number | null;
  /** 상담방 위쪽 위기 배너에 쓰는 최근 경고 (level 이 high 이상일 때만 남긴다) */
  sessionRisk: SessionRisk | null;
  show: (trigger: CrisisTrigger) => void;
  close: () => void;
  noteRisk: (sessionId: string, level: RiskLevel) => void;
  dismissRisk: () => void;
}

export const useCrisisStore = create<CrisisState>((set) => ({
  open: false,
  trigger: null,
  openedAt: null,
  sessionRisk: null,
  show: (trigger) => set({ open: true, trigger, openedAt: Date.now() }),
  close: () => set({ open: false, trigger: null, openedAt: null }),
  noteRisk: (sessionId, level) => set({ sessionRisk: { sessionId, level } }),
  dismissRisk: () => set({ sessionRisk: null }),
}));
