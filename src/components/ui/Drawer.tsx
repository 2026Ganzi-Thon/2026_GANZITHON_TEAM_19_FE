import { type ReactNode, useEffect, useId, useRef } from 'react';

import { ADMIN } from '@/copy/admin';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** 오른쪽에서 열리는 상세 패널 (TRD 16장). 목록을 떠나지 않고 한 건을 본다 */
export function Drawer({ open, title, onClose, children }: DrawerProps) {
  const panel = useRef<HTMLElement>(null);
  const titleId = useId();
  useFocusTrap(panel, open);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div aria-hidden="true" className="absolute inset-0 bg-overlay" onClick={onClose} />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-xl flex-col gap-4 overflow-y-auto border-l border-border-strong bg-bg p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-heading font-bold text-fg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-(--size-touch) text-caption font-bold text-fg underline"
          >
            {ADMIN.close}
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}
