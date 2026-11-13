import { useEffect } from 'react';

import { cx } from '@/lib/cx';
import { type Toast, useUiStore } from '@/stores/uiStore';

const AUTO_DISMISS_MS = 4000;

const KIND_CLASS: Record<Toast['kind'], string> = {
  success: 'bg-success-bg text-fg',
  info: 'bg-surface text-fg',
  error: 'bg-danger-bg text-danger',
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useUiStore((state) => state.dismissToast);

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [dismiss, toast.id]);

  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      className={cx(
        'rounded-md border border-border px-4 py-3 text-body-sm shadow-sm',
        KIND_CLASS[toast.kind],
      )}
    >
      {toast.message}
    </div>
  );
}

/** 화면 아래에 뜨는 짧은 알림 (새 디자인 시스템 07) */
export function Toaster() {
  const toasts = useUiStore((state) => state.toasts);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-6">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto w-full max-w-md">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}
