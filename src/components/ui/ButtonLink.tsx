import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { cx } from '@/lib/cx';

type Variant = 'primary' | 'secondary';

interface ButtonLinkProps {
  to: string;
  children: ReactNode;
  variant?: Variant;
  /** 아직 누를 수 없는 이동 (예: 입장 가능 시각 전). 링크 대신 비활성 모양만 그린다 */
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

const BASE =
  'flex min-h-(--size-button) w-full items-center justify-center rounded-sm px-4 text-body font-bold';

// 반응(button-feedback)은 누를 수 있는 링크에만 준다. 비활성 모양은 가만히 있는다
const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'button-feedback bg-action text-fg-inverse hover:bg-action-hover active:bg-action-hover',
  secondary:
    'button-feedback border border-brand-green bg-surface text-fg hover:bg-field active:bg-field',
};

/** 버튼 모양의 화면 이동 링크. */
export function ButtonLink({
  to,
  children,
  variant = 'primary',
  disabled = false,
  onClick,
  className,
}: ButtonLinkProps) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cx(BASE, 'cursor-not-allowed bg-action-disabled text-fg-inverse', className)}
      >
        {children}
      </span>
    );
  }
  return (
    <Link to={to} onClick={onClick} className={cx(BASE, VARIANT_CLASS[variant], className)}>
      {children}
    </Link>
  );
}
