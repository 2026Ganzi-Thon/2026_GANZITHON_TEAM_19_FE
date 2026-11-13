// TanStack Query 키 모음 (TRD 17-3)
export const queryKeys = {
  me: ['me'] as const,
  appConfig: ['app-config'] as const,
  crisisContacts: ['crisis-contacts'] as const,
  terms: ['terms'] as const,
  intakes: ['intakes'] as const,
  intakeMatches: (intakeId: string) => ['intake', intakeId, 'matches'] as const,
  provider: (providerId: string) => ['provider', providerId] as const,
  slots: (providerId: string, date: string) => ['slots', providerId, date] as const,
  mySlots: (from: string, to: string) => ['my-slots', from, to] as const,
  sessions: (role: string, tab: string) => ['sessions', role, tab] as const,
  session: (sessionId: string) => ['session', sessionId] as const,
  sessionHistory: (sessionId: string) => ['session', sessionId, 'history'] as const,
  messages: (sessionId: string) => ['messages', sessionId] as const,
  report: (reportId: string) => ['report', reportId] as const,
  referral: (referralId: string) => ['referral', referralId] as const,
  notifications: ['notifications'] as const,
  credentials: ['credentials'] as const,
  settlements: (month: string) => ['settlements', month] as const,
  admin: (resource: string, filters: Record<string, unknown> = {}) =>
    ['admin', resource, filters] as const,
  adminKpi: (range: string) => ['admin', 'kpi', range] as const,
};
