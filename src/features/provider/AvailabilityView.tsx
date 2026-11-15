import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { createSlots, deleteSlot, listMySlots, type MySlot } from '@/api/endpoints/slots';
import { isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { Screen } from '@/app/layouts/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { WeekGrid } from '@/components/ui/WeekGrid';
import { errorCopy } from '@/copy/errorMessages';
import { COMMON } from '@/copy/fixed';
import { AVAILABILITY } from '@/copy/work';
import { useNow } from '@/hooks/useNow';
import { kstToUtcIso } from '@/lib/date';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/stores/uiStore';

import { MAX_REPEAT_WEEKS, stepMinutes, weekDays } from './availability';

const SLOTS_STALE_MS = 30_000;
const WEEK_MS = 7 * 24 * 60 * 60_000;
const REPEAT_OPTIONS = Array.from({ length: MAX_REPEAT_WEEKS + 1 }, (_, weeks) => weeks);

function toastError(error: unknown): void {
  showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
}

interface AvailabilityViewProps {
  professional: boolean;
}

/** T-04, E-04 가용 시간 관리 (SLT-01·02·04) */
export function AvailabilityView({ professional }: AvailabilityViewProps) {
  const queryClient = useQueryClient();
  const now = useNow();
  const suspended = useAuthStore((state) => state.me?.status === 'suspended');
  const [anchor] = useState(() => Date.now());
  const [weekOffset, setWeekOffset] = useState(0);
  const [repeatWeeks, setRepeatWeeks] = useState(0);

  const days = weekDays(anchor + weekOffset * WEEK_MS);
  const from = kstToUtcIso(days[0] ?? '');
  const to = new Date(Date.parse(from) + WEEK_MS).toISOString();
  const slots = useQuery({
    queryKey: queryKeys.mySlots(from, to),
    queryFn: () => listMySlots({ from, to }),
    staleTime: SLOTS_STALE_MS,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['my-slots'] });

  const creation = useMutation({
    mutationFn: (starts: string[]) => createSlots({ starts, repeat_weeks: repeatWeeks }),
    onSuccess: () => {
      void refresh();
      showToast(AVAILABILITY.created, 'success');
    },
    // 지난 시간·겹치는 시간(422 SLOT_OVERLAP), 정지 계정은 문구로 알려 준다
    onError: toastError,
  });
  const removal = useMutation({
    mutationFn: (slot: MySlot) => deleteSlot(slot.id ?? ''),
    onSuccess: () => {
      void refresh();
      showToast(AVAILABILITY.deleted);
    },
    onError: (error) => {
      // 그 사이 예약된 시간이면(409 SLOT_BOOKED) 목록을 다시 받아 잠금으로 보여 준다
      toastError(error);
      void refresh();
    },
  });

  return (
    <Screen>
      <ScreenHeader />
      <h1 className="pt-6.5 text-title-sm font-bold text-fg">{AVAILABILITY.title}</h1>
      <p className="pt-4 text-body-sm text-fg-muted">
        {professional ? AVAILABILITY.professionalRule : AVAILABILITY.coachingRule}
      </p>
      {suspended && (
        <p role="status" className="pt-3 text-body-sm text-danger">
          {AVAILABILITY.suspended}
        </p>
      )}

      <div className="flex gap-2 pt-4">
        <Button
          size="md"
          variant="secondary"
          disabled={weekOffset === 0}
          onClick={() => setWeekOffset((offset) => offset - 1)}
        >
          {AVAILABILITY.prevWeek}
        </Button>
        <Button size="md" variant="secondary" onClick={() => setWeekOffset((offset) => offset + 1)}>
          {AVAILABILITY.nextWeek}
        </Button>
      </div>

      <fieldset className="pt-4">
        <legend className="text-body-sm font-bold text-fg">{AVAILABILITY.repeatLabel}</legend>
        <p className="pt-1 text-micro text-fg-muted">{AVAILABILITY.repeatHint}</p>
        <div className="flex flex-wrap gap-1.5 pt-3">
          {REPEAT_OPTIONS.map((weeks) => (
            <Chip
              key={weeks}
              selected={repeatWeeks === weeks}
              onClick={() => setRepeatWeeks(weeks)}
            >
              {weeks === 0 ? AVAILABILITY.repeatNone : AVAILABILITY.repeatWeeks(weeks)}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="pb-10 pt-4">
        {slots.isPending && <Skeleton lines={6} />}
        {slots.isError && (
          <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void slots.refetch()} />
        )}
        {slots.data && (
          <WeekGrid
            key={days[0]}
            days={days}
            slots={slots.data}
            slotMinutes={stepMinutes(professional)}
            now={now}
            onCreate={(starts) => creation.mutate(starts)}
            onDelete={(slot) => removal.mutate(slot)}
            disabled={suspended}
            busy={creation.isPending || removal.isPending}
          />
        )}
      </div>
    </Screen>
  );
}
