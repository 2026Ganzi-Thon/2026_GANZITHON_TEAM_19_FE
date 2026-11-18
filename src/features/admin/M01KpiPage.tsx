import { skipToken, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import { getKpi } from '@/api/endpoints/admin';
import { queryKeys } from '@/api/queryKeys';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextField } from '@/components/ui/TextField';
import { ADMIN_KPI } from '@/copy/adminOps';
import { COMMON } from '@/copy/fixed';

import { KPI_PRESETS, kpiRange, parsePreset } from './kpi';

const REFRESH_MS = 60_000;
const RANGE_PARAM = 'range';
const FROM_PARAM = 'from';
const TO_PARAM = 'to';

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
        // shortcut: 서버가 이벤트 5가지 건수만 준다. TRD의 지표·퍼널·추이는 서버가 값을 주면 다시 그린다
        <dl className="grid grid-cols-3 gap-4 py-6 xl:grid-cols-5">
          {Object.entries(data.counts ?? {}).map(([name, count]) => (
            <div key={name} className="rounded-md border border-line p-4">
              <dt className="text-body-sm text-fg-muted">{ADMIN_KPI.counts[name] ?? name}</dt>
              <dd className="pt-1 text-title-sm font-bold text-fg">
                {count.toLocaleString('ko-KR')}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}
