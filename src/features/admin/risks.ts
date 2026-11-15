import type { RiskEvent } from '@/api/pendingAdmin';
import type { RiskLevel } from '@/api/pendingProvider';

const SECOND_MS = 1000;
const LEVEL_RANK: Record<RiskLevel, number> = { critical: 4, high: 3, medium: 2, low: 1, none: 0 };

/** 긴급한 것부터, 같은 수준이면 오래 기다린 것부터 (M-04) */
export function sortRiskEvents(events: readonly RiskEvent[]): RiskEvent[] {
  return [...events].sort(
    (a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || b.elapsed_seconds - a.elapsed_seconds,
  );
}

/** 서버가 준 경과 시간에, 받은 뒤 흐른 시간을 더한다. 종결된 건은 더 늘지 않는다 */
export function elapsedMs(event: RiskEvent, fetchedAt: number, now: number): number {
  const base = event.elapsed_seconds * SECOND_MS;
  return event.status === 'resolved' ? base : base + Math.max(0, now - fetchedAt);
}
