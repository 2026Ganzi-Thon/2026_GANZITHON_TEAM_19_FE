import type { ButtonHTMLAttributes } from 'react';

import { cx } from '@/lib/cx';

import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** 부모 너비를 채운다 */
  block?: boolean;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'bg-action text-fg-inverse hover:bg-action-hover disabled:bg-action-disabled',
  secondary:
    'border border-brand-green bg-surface text-fg hover:bg-field disabled:border-border disabled:text-fg-muted',
  ghost: 'bg-transparent text-fg hover:bg-field disabled:text-fg-muted',
  danger: 'bg-danger text-fg-inverse disabled:bg-action-disabled',
};

// 가장 작은 크기도 터치 영역은 44px 이 되게 가상 요소로 넓힌다 (TRD 18-1, 18-3)
const SIZE_CLASS: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-caption after:absolute after:inset-x-0 after:-inset-y-1',
  md: 'min-h-(--size-touch) px-4 text-body-sm',
  lg: 'min-h-(--size-button) px-4 text-body',
};

export function Button({
  variant = 'primary',
  size = 'lg',
  loading = false,
  block = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'relative inline-flex items-center justify-center gap-2 rounded-sm font-bold transition-colors disabled:cursor-not-allowed',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
