import { useEffect, useRef } from 'react';

import { COUNTDOWN } from '@/copy/client';
import { useNow } from '@/hooks/useNow';
import { cx } from '@/lib/cx';
import { formatRemaining } from '@/lib/date';

const TICK_MS = 1000;
const MINUTE_MS = 60_000;

interface CountdownTimerProps {
  /** 끝나는 시각 (ISO 문자열 또는 ms) */
  until: string | number;
  onExpire?: () => void;
  /** 1분 이하로 남으면 강조한다 */
  emphasize?: boolean;
  className?: string;
}

/** 남은 시간 (TRD 18-1). 스크린리더에는 1분 단위로만 알린다. */
export function CountdownTimer({
  until,
  onExpire,
  emphasize = false,
  className,
}: CountdownTimerProps) {
  const now = useNow(TICK_MS);
  const target = typeof until === 'number' ? until : Date.parse(until);
  const remaining = Math.max(0, target - now);
  const expired = remaining === 0;
  const latestOnExpire = useRef(onExpire);

  useEffect(() => {
    latestOnExpire.current = onExpire;
  });

  useEffect(() => {
    if (expired) latestOnExpire.current?.();
  }, [expired]);

  return (
    <span
      className={cx(
        'tabular-nums',
        emphasize && remaining <= MINUTE_MS && 'text-danger',
        className,
      )}
    >
      <span aria-hidden="true">{formatRemaining(remaining)}</span>
      <span aria-live="polite" className="sr-only">
        {COUNTDOWN.minutesLeft(Math.ceil(remaining / MINUTE_MS))}
      </span>
    </span>
  );
}
