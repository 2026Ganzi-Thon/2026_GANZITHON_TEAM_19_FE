import { skipToken, useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { useSearchParams } from 'react-router';

import { getKpi } from '@/api/endpoints/admin';
import type { Kpi, KpiMetricKey } from '@/api/pendingAdmin';
import { queryKeys } from '@/api/queryKeys';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextField } from '@/components/ui/TextField';
import { ADMIN_KPI } from '@/copy/adminOps';
import { COMMON } from '@/copy/fixed';

import {
  formatMetric,
  formatRate,
  formatSeconds,
  funnelRows,
  KPI_PRESETS,
  kpiRange,
  northStarDelta,
  parsePreset,
} from './kpi';
import { KpiTrendChart } from './KpiTrendChart';

const REFRESH_MS = 60_000;
const PERCENT = 100;
const RANGE_PARAM = 'range';
const FROM_PARAM = 'from';
const TO_PARAM = 'to';

/** 지표 한 줄. 이름에 마우스를 올리거나 초점을 주면 정의가 보인다 */
function Metric({
  metricKey,
  value,
}: {
  metricKey: KpiMetricKey;
  value: number | null | undefined;
}) {
  const tooltipId = useId();
  const copy = ADMIN_KPI.metrics[metricKey];

  return (
    <div className="group relative flex items-baseline justify-between gap-3 py-1.5">
      <dt>
        <button
          type="button"
          aria-describedby={tooltipId}
          className="text-left text-body-sm text-fg-muted underline decoration-dotted"
        >
          {copy.label}
        </button>
        <span
          id={tooltipId}
          role="tooltip"
          className="invisible absolute left-0 top-full z-10 w-64 rounded-sm border border-border-strong bg-bg p-2 text-micro text-fg group-focus-within:visible group-hover:visible"
        >
          {copy.definition}
        </span>
      </dt>
      <dd className="shrink-0 text-body font-bold text-fg">{formatMetric(metricKey, value)}</dd>
    </div>
  );
}

function NorthStar({ northStar }: { northStar: Kpi['north_star'] }) {
  const delta = northStarDelta(northStar.value, northStar.previous);

  return (
    <section className="border-b border-line py-6">
      <h2 className="text-body-sm font-bold text-fg-muted">North Star · {ADMIN_KPI.northStar}</h2>
      <p className="pt-2 text-display font-bold text-fg">{ADMIN_KPI.people(northStar.value)}</p>
      <p className="pt-1 text-body-sm text-fg-muted">
        {[delta, ADMIN_KPI.northStarDefinition].filter(Boolean).join(' · ')}
      </p>
    </section>
  );
}

function Funnel({ funnel }: { funnel: Kpi['funnel'] }) {
  return (
    <section>
      <h2 className="text-heading font-bold text-fg">{ADMIN_KPI.funnelTitle}</h2>
      <ol className="pt-3">
        {funnelRows(funnel).map((row) => (
          <li key={row.step} className="py-2">
            <p className="flex justify-between gap-3 text-body-sm text-fg">
              <span>{row.label}</span>
              <span>
                <span className="font-bold">{ADMIN_KPI.people(row.count)}</span>
                {row.rate && (
                  <span className="pl-2 text-fg-muted">{ADMIN_KPI.funnelRate(row.rate)}</span>
                )}
              </span>
            </p>
            <div className="mt-1 h-3 rounded-full bg-field">
              <div
                className="h-3 rounded-full bg-brand-green"
                style={{ width: `${row.share * PERCENT}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function OpsMetrics({ ops }: { ops: Kpi['ops'] }) {
  const sessions = ops.referral_avg_sessions;
  const text = (value: number | null | undefined, format: (value: number) => string) =>
    value === null || value === undefined ? ADMIN_KPI.none : format(value);
  const rows = [
    {
      label: ADMIN_KPI.ops.referralAvgSessions,
      value: text(sessions, (value) => ADMIN_KPI.units.sessions(String(value))),
    },
    {
      label: ADMIN_KPI.ops.referralGenP50,
      value: text(ops.referral_gen_p50_seconds, formatSeconds),
    },
    {
      label: ADMIN_KPI.ops.referralGenP90,
      value: text(ops.referral_gen_p90_seconds, formatSeconds),
    },
    { label: ADMIN_KPI.ops.rebookRate, value: text(ops.rebook_rate, formatRate) },
  ];

  return (
    <section className="border-t border-line py-6">
      <h2 className="text-heading font-bold text-fg">{ADMIN_KPI.opsTitle}</h2>
      <dl className="grid grid-cols-4 gap-4 pt-3">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-body-sm text-fg-muted">{row.label}</dt>
            <dd className="pt-1 text-body font-bold text-fg">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** M-01 KPI 대시보드 (KPI-01). 한 번 불러 모든 영역을 그리고 60초마다 새로 부른다 */
export function M01KpiPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preset = parsePreset(searchParams.get(RANGE_PARAM));
  const custom = {
    from: searchParams.get(FROM_PARAM) ?? '',
    to: searchParams.get(TO_PARAM) ?? '',
  };
  const range = kpiRange(preset, custom);
  const kpi = useQuery({
    queryKey: queryKeys.adminKpi(range ? `${range.from}_${range.to}` : 'none'),
    queryFn: range ? () => getKpi(range) : skipToken,
    refetchInterval: REFRESH_MS,
  });
  const data = kpi.data;

  // 기간은 URL 에 두어 새로고침하거나 주소를 공유해도 그대로다
  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  return (
    <>
      <h1 className="text-title-sm font-bold text-fg">{ADMIN_KPI.title}</h1>
      <div className="flex flex-wrap items-end gap-3 pt-6">
        <div role="group" aria-label={ADMIN_KPI.rangeLabel} className="flex gap-1.5">
          {KPI_PRESETS.map((option) => (
            <Chip
              key={option}
              selected={preset === option}
              onClick={() => setParam(RANGE_PARAM, option)}
            >
              {ADMIN_KPI.presets[option]}
            </Chip>
          ))}
        </div>
        {preset === 'custom' && (
          <>
            <TextField
              label={ADMIN_KPI.from}
              type="date"
              value={custom.from}
              max={custom.to || undefined}
              onChange={(event) => setParam(FROM_PARAM, event.target.value)}
            />
            <TextField
              label={ADMIN_KPI.to}
              type="date"
              value={custom.to}
              min={custom.from || undefined}
              onChange={(event) => setParam(TO_PARAM, event.target.value)}
            />
          </>
        )}
        <p className="pb-3 text-micro text-fg-muted">{ADMIN_KPI.refreshNote}</p>
      </div>

      {!range && <p className="pt-8 text-body-sm text-fg-muted">{ADMIN_KPI.customInvalid}</p>}
      {range && kpi.isPending && <Skeleton lines={8} className="pt-6" />}
      {kpi.isError && (
        <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void kpi.refetch()} />
      )}

      {data && (
        <>
          <NorthStar northStar={data.north_star} />
          <div className="grid grid-cols-3 gap-4 py-6 xl:grid-cols-4">
            {ADMIN_KPI.groups.map((group) => (
              <section key={group.title} className="rounded-md border border-line p-4">
                <h2 className="pb-2 text-body font-bold text-fg">{group.title}</h2>
                <dl>
                  {group.keys.map((metricKey) => (
                    <Metric key={metricKey} metricKey={metricKey} value={data.metrics[metricKey]} />
                  ))}
                </dl>
              </section>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-10 border-t border-line py-6">
            <Funnel funnel={data.funnel} />
            <section>
              <h2 className="pb-3 text-heading font-bold text-fg">{ADMIN_KPI.trendTitle}</h2>
              <KpiTrendChart daily={data.daily} />
            </section>
          </div>
          <OpsMetrics ops={data.ops} />
        </>
      )}
    </>
  );
}
