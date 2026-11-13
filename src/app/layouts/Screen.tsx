import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

interface ScreenProps {
  children: ReactNode;
  className?: string;
}

/** 화면 한 장의 틀. 모바일은 좌우 24px, 768px 이상은 가운데 640px (TRD 11-1). */
export function Screen({ children, className }: ScreenProps) {
  return (
    <main
      className={cx('mx-auto flex w-full max-w-(--size-content) grow flex-col px-6', className)}
    >
      {children}
    </main>
  );
}
