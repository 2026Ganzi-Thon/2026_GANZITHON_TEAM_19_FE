import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  /** 빈 화면에는 아래를 보는 고양이를 둔다 (새 디자인 시스템 07) */
  illustration?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, illustration, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      {illustration}
      <p className="text-subheading font-bold text-fg">{title}</p>
      {description && <p className="text-body-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-2 w-full">{action}</div>}
    </div>
  );
}
