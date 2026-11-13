import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { cx } from '@/lib/cx';

interface ListRowProps {
  to: string;
  title: string;
  description?: ReactNode;
  /** 중요한 다음 행동이면 굵게 보인다 */
  emphasis?: boolean;
  onPointerEnter?: () => void;
}

/** 가는 구분선으로 나뉘는 목록의 한 줄 (새 디자인 시스템 03). */
export function ListRow({
  to,
  title,
  description,
  emphasis = false,
  onPointerEnter,
}: ListRowProps) {
  return (
    <Link
      to={to}
      onPointerEnter={onPointerEnter}
      className="flex min-h-16 items-center justify-between gap-3 border-b border-line py-4"
    >
      <span className="flex flex-col gap-1">
        <span
          className={cx('text-fg', emphasis ? 'text-heading font-bold' : 'text-body font-medium')}
        >
          {title}
        </span>
        {description && <span className="text-caption text-fg-muted">{description}</span>}
      </span>
      <span
        aria-hidden="true"
        className={cx('text-headline', emphasis ? 'text-fg' : 'text-fg-muted')}
      >
        ›
      </span>
    </Link>
  );
}
