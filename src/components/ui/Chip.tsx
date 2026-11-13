import type { ButtonHTMLAttributes } from 'react';

import { cx } from '@/lib/cx';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

/** 선택 칩. 선택 여부는 색과 aria-pressed 로 함께 알린다. */
export function Chip({
  selected = false,
  className,
  children,
  type = 'button',
  ...rest
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cx(
        // 보이는 높이는 시안대로 두고 터치 영역만 44px 로 넓힌다
        'relative min-w-24 rounded-md px-2 py-2 text-left text-micro text-fg after:absolute after:inset-x-0 after:-inset-y-1.5',
        selected ? 'bg-brand-yellow font-bold' : 'bg-chip',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
