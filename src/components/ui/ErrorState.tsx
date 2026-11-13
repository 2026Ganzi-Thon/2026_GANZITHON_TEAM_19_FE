import type { ReactNode } from 'react';

import { COMMON } from '@/copy/fixed';

import { Button } from './Button';

interface ErrorStateProps {
  title: string;
  description?: string;
  /** 문의용 요청 ID (TRD 18-2) */
  requestId?: string;
  onRetry?: () => void;
  action?: ReactNode;
}

/** 일반 오류에는 고양이 없이 설명과 다시 시도를 준다 (새 디자인 시스템 07). */
export function ErrorState({ title, description, requestId, onRetry, action }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <p className="text-heading font-bold text-fg">{title}</p>
      {description && <p className="text-body-sm text-fg-muted">{description}</p>}
      {requestId && <p className="text-micro text-fg-muted">{COMMON.requestId(requestId)}</p>}
      {onRetry && (
        <Button variant="secondary" size="md" onClick={onRetry}>
          {COMMON.retry}
        </Button>
      )}
      {action}
    </div>
  );
}
