import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { KpiDailyPoint } from '@/api/pendingAdmin';
import { ADMIN_KPI } from '@/copy/adminOps';

const CHART_HEIGHT = 280;
const GRID = 'var(--color-line)';
const AXIS = 'var(--color-fg-muted)';
// 색만으로 구분하지 않게 선 모양도 다르게 둔다
const SERIES = [
  { key: 'intakes', color: 'var(--color-brand-green)', dash: undefined },
  { key: 'completed_sessions', color: 'var(--color-fg-muted)', dash: '6 3' },
  { key: 'red_flags', color: 'var(--color-danger)', dash: '2 3' },
] as const;

/** 2026-11-14 → 11/14 */
function dayLabel(date: string): string {
  const [, month = '', day = ''] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}

/** M-01 ⑤ 일별 추이: 인테이크, 완료 세션, Red Flag */
export function KpiTrendChart({ daily }: { daily: readonly KpiDailyPoint[] }) {
  const data = daily.map((point) => ({ ...point, label: dayLabel(point.date) }));

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" stroke={AXIS} tickLine={false} />
        <YAxis allowDecimals={false} stroke={AXIS} tickLine={false} />
        <Tooltip />
        <Legend />
        {SERIES.map((series) => (
          <Line
            key={series.key}
            name={ADMIN_KPI.trendSeries[series.key]}
            dataKey={series.key}
            stroke={series.color}
            strokeDasharray={series.dash}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
