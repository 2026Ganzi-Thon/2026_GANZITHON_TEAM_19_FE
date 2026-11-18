import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import type { Settlement } from '@/api/endpoints/settlements';
import { Screen } from '@/app/layouts/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { MATCHES } from '@/copy/client';
import { COMMON } from '@/copy/fixed';
import { COMPLAINT } from '@/copy/referral';
import { SETTLEMENTS } from '@/copy/work';
import { cx } from '@/lib/cx';
import { formatKST } from '@/lib/date';
import { SERVER_HAS } from '@/lib/serverFeatures';

import { currentMonth, useMySettlements, useMyStrikes } from './queries';

const TAB_PARAM = 'tab';

function kindLabel(item: Settlement, expert: boolean): string {
  if (item.kind === 'supervision') return SETTLEMENTS.kind.supervision;
  return expert ? SETTLEMENTS.professionalSession : SETTLEMENTS.kind.session;
}

function SettlementList({ expert }: { expert: boolean }) {
  const [month, setMonth] = useState(() => currentMonth());
  const settlements = useMySettlements(month);
  const items = settlements.data?.items ?? [];
  const total = items.reduce((sum, item) => sum + (item.net ?? 0), 0);

  return (
    <>
      <div className="flex flex-col gap-1.5 pt-4">
        <label htmlFor="settlement-month" className="text-body-sm font-bold text-fg">
          {SETTLEMENTS.monthLabel}
        </label>
        <input
          id="settlement-month"
          type="month"
          value={month}
          max={currentMonth()}
          onChange={(event) => setMonth(event.target.value || currentMonth())}
          className="min-h-(--size-touch) rounded-sm border border-border bg-field px-3 text-input text-fg"
        />
      </div>

      {settlements.isPending && <Skeleton lines={4} className="pt-6" />}
      {settlements.isError && (
        <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void settlements.refetch()} />
      )}
      {settlements.data && items.length === 0 && (
        <p className="pt-8 text-body-sm text-fg-muted">{SETTLEMENTS.empty}</p>
      )}
      <ul className="pt-2">
        {items.map((item) => (
          <li key={item.id} className="border-b border-line pb-3 pt-2.5 text-body-sm">
            <p className="flex justify-between gap-3 font-bold text-fg">
              <span>{kindLabel(item, expert)}</span>
              <span>{MATCHES.price(item.net ?? 0)}</span>
            </p>
            <p className="pt-1 text-fg-muted">
              {[
                item.status && SETTLEMENTS.status[item.status],
                item.created_at && formatKST(item.created_at, 'M월 D일'),
                item.status_reason,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {item.status === 'locked' && (
              <p className="pt-1 text-micro text-fg-muted">
                {SETTLEMENTS.lockedHint}
                {SERVER_HAS.expertInbox && item.supervision_id && (
                  <>
                    {' '}
                    <Link
                      to={`/e/supervisions/${item.supervision_id}/write`}
                      className="font-bold text-fg underline"
                    >
                      {SETTLEMENTS.writeSupervision}
                    </Link>
                  </>
                )}
              </p>
            )}
          </li>
        ))}
      </ul>
      {items.length > 0 && (
        <p className="flex justify-between gap-3 pb-10 pt-4 text-body font-bold text-fg">
          <span>{SETTLEMENTS.total}</span>
          <span>{MATCHES.price(total)}</span>
        </p>
      )}
    </>
  );
}

function StrikeList() {
  const strikes = useMyStrikes();
  const data = strikes.data;

  if (strikes.isPending) return <Skeleton lines={4} className="pt-6" />;
  if (!data) {
    return <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void strikes.refetch()} />;
  }
  return (
    <div className="pb-10 pt-4 text-body-sm">
      <p className={cx('text-body font-bold', data.count > 0 ? 'text-danger' : 'text-fg')}>
        {SETTLEMENTS.strikeCount(data.count, data.limit)}
      </p>
      {data.next_action && <p className="pt-1 text-fg-muted">{data.next_action}</p>}
      {data.items.length === 0 && <p className="pt-6 text-fg-muted">{SETTLEMENTS.strikeEmpty}</p>}
      <ul className="pt-2">
        {data.items.map((item) => (
          <li key={item.id} className="border-b border-line pb-3 pt-2.5">
            <p className="font-bold text-fg">
              {COMPLAINT.categories.find((category) => category.value === item.category)?.label ??
                item.category}
            </p>
            <p className="pt-1 text-fg-muted">
              {[
                formatKST(item.created_at, 'YYYY년 M월 D일'),
                item.action,
                item.revoked_at && SETTLEMENTS.revoked,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** T-10 정산·스트라이크 내역, E-09 정산 내역 (STL-01, CMP-05) */
export function SettlementView({ expert }: { expert: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const showStrikes = !expert && SERVER_HAS.strikes;
  const strikesTab = showStrikes && searchParams.get(TAB_PARAM) === 'strikes';

  return (
    <Screen>
      <ScreenHeader backTo={expert ? '/e' : '/t'} />
      <h1 className="pt-6.5 text-title-sm font-bold text-fg">{SETTLEMENTS.title}</h1>
      {showStrikes && (
        <div role="group" aria-label={SETTLEMENTS.tabsLabel} className="flex gap-1.5 pt-4">
          <Chip selected={!strikesTab} onClick={() => setSearchParams({}, { replace: true })}>
            {SETTLEMENTS.tabSettlements}
          </Chip>
          <Chip
            selected={strikesTab}
            onClick={() => setSearchParams({ [TAB_PARAM]: 'strikes' }, { replace: true })}
          >
            {SETTLEMENTS.tabStrikes}
          </Chip>
        </div>
      )}
      {strikesTab ? <StrikeList /> : <SettlementList expert={expert} />}
    </Screen>
  );
}
