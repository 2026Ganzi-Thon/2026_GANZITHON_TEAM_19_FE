import { create } from 'zustand';

export type ToastKind = 'success' | 'info' | 'error';

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

interface UiState {
  toasts: Toast[];
  showToast: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: string) => void;
}

const MAX_TOASTS = 3;

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  showToast: (message, kind = 'info') =>
    set((state) => ({
      toasts: [...state.toasts, { id: crypto.randomUUID(), kind, message }].slice(-MAX_TOASTS),
    })),
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

/** 컴포넌트 밖(인터셉터, 실시간 이벤트)에서 토스트를 띄울 때 쓴다. */
export function showToast(message: string, kind: ToastKind = 'info'): void {
  useUiStore.getState().showToast(message, kind);
}
