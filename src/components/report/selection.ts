/** 종합 리포트에 넣을 수 있는 상담 수 (TRD C-12, 운영 설정 기본값) */
export const MAX_REFERRAL_SESSIONS = 10;
const MIN_REFERRAL_SESSIONS = 1;

/** 지금 이 상담의 체크를 바꿀 수 있는지: 마지막 1개는 못 빼고, 최대 개수를 넘겨 더할 수 없다 */
export function canToggleSession(
  selected: readonly string[],
  sessionId: string,
  max = MAX_REFERRAL_SESSIONS,
): boolean {
  return selected.includes(sessionId)
    ? selected.length > MIN_REFERRAL_SESSIONS
    : selected.length < max;
}

export function toggleSession(
  selected: readonly string[],
  sessionId: string,
  max = MAX_REFERRAL_SESSIONS,
): string[] {
  if (!canToggleSession(selected, sessionId, max)) return [...selected];
  return selected.includes(sessionId)
    ? selected.filter((id) => id !== sessionId)
    : [...selected, sessionId];
}

/** 순서와 상관없이 같은 상담 묶음인지 */
export function sameSessions(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}
