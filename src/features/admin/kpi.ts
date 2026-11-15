import type { KpiFunnelStep, KpiMetricKey } from '@/api/pendingAdmin';
import { ADMIN_KPI } from '@/copy/adminOps';
import { kstToUtcIso, toKST } from '@/lib/date';

export type KpiPreset = 'today' | '7d' | '30d' | 'custom';
export const KPI_PRESETS: readonly KpiPreset[] = ['today', '7d', '30d', 'custom'];

export interface KpiRange {
  from: string;
  to: string;
}

export interface FunnelRow {
  step: string;
  label: string;
  count: number;
  /** 전 단계 대비 전환율. 첫 단계는 null */
  rate: string | null;
  /** 첫 단계 대비 비율 (막대 길이, 0~1) */
  share: number;
}

type Unit = keyof typeof ADMIN_KPI.units | 'seconds';

const PRESET_DAYS = { today: 1, '7d': 7, '30d': 30 } as const;
const DEFAULT_PRESET: KpiPreset = '7d';
const DATE_KEY = 'YYYY-MM-DD';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PERCENT = 100;
const MINUTE_SECONDS = 60;

const UNIT: Record<KpiMetricKey, Unit> = {
  high_risk_referrals: 'count',
  trainee_hours: 'hours',
  mood_delta: 'score',
  first_session_completion_rate: 'rate',
  cac: 'won',
  pro_conversion_rate: 'rate',
  report_consent_rate: 'rate',
  churn_rate: 'rate',
  pro_revisit_clients: 'people',
  intake_sessions_saved: 'sessions',
  supervision_completion_rate: 'rate',
  trainee_retention: 'rate',
  red_flag_lead_p50: 'seconds',
  red_flag_lead_p90: 'seconds',
  malicious_complaint_rate: 'rate',
};

export function parsePreset(value: string | null): KpiPreset {
  return KPI_PRESETS.find((preset) => preset === value) ?? DEFAULT_PRESET;
}

/** 조회 기간 [from, to) 을 UTC 로 만든다. 끝은 한국 시간으로 다음 날 0시다 */
export function kpiRange(
  preset: KpiPreset,
  custom: { from: string; to: string },
  now: number = Date.now(),
): KpiRange | null {
  if (preset === 'custom') {
    const valid =
      DATE_PATTERN.test(custom.from) && DATE_PATTERN.test(custom.to) && custom.from <= custom.to;
    if (!valid) return null;
    const end = toKST(kstToUtcIso(custom.to)).add(1, 'day').format(DATE_KEY);
    return { from: kstToUtcIso(custom.from), to: kstToUtcIso(end) };
  }
  const today = toKST(now);
  return {
    from: kstToUtcIso(today.subtract(PRESET_DAYS[preset] - 1, 'day').format(DATE_KEY)),
    to: kstToUtcIso(today.add(1, 'day').format(DATE_KEY)),
  };
}

function numberText(value: number, digits = 0): string {
  return value.toLocaleString('ko-KR', { maximumFractionDigits: digits });
}

export function formatSeconds(value: number): string {
  const total = Math.round(value);
  return ADMIN_KPI.duration(Math.floor(total / MINUTE_SECONDS), total % MINUTE_SECONDS);
}

/** 0~1 사이 비율을 퍼센트로 보여 준다 */
export function formatRate(value: number): string {
  return ADMIN_KPI.units.rate(numberText(value * PERCENT, 1));
}

/** 지표 값을 단위에 맞춰 보여 준다. 아직 집계되지 않았으면 '집계 전' */
export function formatMetric(key: KpiMetricKey, value: number | null | undefined): string {
  if (value === null || value === undefined) return ADMIN_KPI.none;
  const unit = UNIT[key];
  if (unit === 'seconds') return formatSeconds(value);
  if (unit === 'rate') return formatRate(value);
  if (unit === 'score') {
    return ADMIN_KPI.units.score(`${value > 0 ? '+' : ''}${numberText(value, 1)}`);
  }
  if (unit === 'hours' || unit === 'sessions') return ADMIN_KPI.units[unit](numberText(value, 1));
  return ADMIN_KPI.units[unit](numberText(value));
}

/** North Star 의 전 기간 대비 증감. 전 기간 값이 없으면 null */
export function northStarDelta(value: number, previous: number | null | undefined): string | null {
  if (previous === null || previous === undefined) return null;
  const diff = value - previous;
  return ADMIN_KPI.versusPrevious(`${diff > 0 ? '+' : ''}${ADMIN_KPI.people(diff)}`);
}

export function funnelRows(funnel: readonly KpiFunnelStep[]): FunnelRow[] {
  const first = funnel[0]?.count ?? 0;
  return funnel.map((item, index) => {
    const previous = index > 0 ? (funnel[index - 1]?.count ?? 0) : 0;
    return {
      step: item.step,
      label: ADMIN_KPI.funnelSteps[item.step] ?? item.step,
      count: item.count,
      rate: previous > 0 ? formatRate(item.count / previous) : null,
      share: first > 0 ? Math.min(1, item.count / first) : 0,
    };
  });
}
