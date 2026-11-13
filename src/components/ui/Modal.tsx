import { type ReactNode, useEffect, useId, useRef } from 'react';

import { useFocusTrap } from '@/hooks/useFocusTrap';
import { cx } from '@/lib/cx';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** 버튼 영역. 중요한 확인은 가로 두 버튼을 쓴다 (새 디자인 시스템 07) */
  footer?: ReactNode;
  /** false 면 바깥 클릭·Esc 로 닫히지 않는다 */
  dismissible?: boolean;
  role?: 'dialog' | 'alertdialog';
  className?: string;
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  dismissible = true,
  role = 'dialog',
  className,
}: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(panel, open);

  useEffect(() => {
    if (!open || !dismissible) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center p-5 md:items-center">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-overlay"
        onClick={dismissible ? onClose : undefined}
      />
      <div
        ref={panel}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          'relative flex max-h-[85dvh] w-full max-w-md flex-col gap-2.5 overflow-y-auto rounded-lg border border-border-strong bg-bg p-5 safe-bottom',
          className,
        )}
      >
        <h2 id={titleId} className="text-heading font-bold text-fg">
          {title}
        </h2>
        {children}
        {footer && <div className="mt-2 flex gap-2">{footer}</div>}
      </div>
    </div>
  );
}
