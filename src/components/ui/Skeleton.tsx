import { useEffect, useState } from 'react';

import { COMMON } from '@/copy/fixed';
import { cx } from '@/lib/cx';

const SHOW_AFTER_MS = 300;

interface SkeletonProps {
  /** 줄 수 */
  lines?: number;
  className?: string;
}

/** 300ms 안에 끝나는 로딩에는 보이지 않는다 (TRD 18-2). */
export function Skeleton({ lines = 3, className }: SkeletonProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      aria-label={COMMON.loading}
      className={cx('flex flex-col gap-3', !visible && 'invisible', className)}
    >
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className={cx('h-5 animate-pulse rounded-sm bg-field', index === lines - 1 && 'w-2/3')}
        />
      ))}
    </div>
  );
}
