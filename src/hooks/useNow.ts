import { useEffect, useState } from 'react';

/** 일정 간격으로 현재 시각을 다시 준다. 입장 가능 여부처럼 시간이 지나면 바뀌는 표시에 쓴다. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
