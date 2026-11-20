import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';

import { getMatches } from '@/api/endpoints/intakes';
import { listOpenSlots, type OpenSlot } from '@/api/endpoints/providers';
import { createSession } from '@/api/endpoints/sessions';
import { isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { Screen } from '@/app/layouts/Screen';
import { CrisisButton } from '@/components/crisis/CrisisButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { MATCHES, PROVIDER } from '@/copy/client';
import { errorCopy } from '@/copy/errorMessages';
import { COMMON } from '@/copy/fixed';
import { cx } from '@/lib/cx';
import { formatKSTShortDate, formatKSTTime, kstDateKey, kstToUtcIso } from '@/lib/date';
import { useSessionFlowStore } from '@/stores/sessionFlowStore';
import { showToast } from '@/stores/uiStore';

import {
  BOOKING_DAYS,
  bookingDates,
  defaultMinutes,
  groupSlotsByDate,
  HOLD_MS,
  slotMinutes,
} from './booking';
import { useProvider } from './queries';
import { isProfessionalTrack, serviceLabel } from './sessions';

const SLOTS_STALE_MS = 30_000;
const DAY_MS = 24 * 60 * 60_000;
const NOON = '12:00';

/** 조회 기간. 화면에 들어온 시점부터 14일로 고정해 캐시 키가 흔들리지 않게 한다 */
function createRange() {
  const from = Date.now();
  return {
    from: new Date(from).toISOString(),
    to: new Date(from + BOOKING_DAYS * DAY_MS).toISOString(),
    dates: bookingDates(from),
    key: kstDateKey(from),
  };
}

/** C-05 상담사 상세·시간 선택 */
export function C05ProviderPage() {
  const { providerId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const intakeId = searchParams.get('intake_id') ?? undefined;
  const rebookOf = searchParams.get('rebook_of') ?? undefined;
  const referralId = searchParams.get('referral_id') ?? undefined;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setHold = useSessionFlowStore((state) => state.setHold);
  const [range] = useState(createRange);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  // 같은 시간을 다시 누르면 같은 멱등 키로 보낸다 (TRD 17-7)
  const bookingKeys = useRef(new Map<string, string>());

  const provider = useProvider(providerId);
  const slots = useQuery({
    queryKey: queryKeys.slots(providerId, range.key),
    queryFn: () => listOpenSlots(providerId, { from: range.from, to: range.to }),
    staleTime: SLOTS_STALE_MS,
  });
  // 가격은 매칭 결과에만 있다. 재예약처럼 매칭을 거치지 않으면 결제 화면에서 금액을 본다
  const matches = useQuery({
    queryKey: queryKeys.intakeMatches(intakeId ?? ''),
    queryFn: () => getMatches(intakeId ?? ''),
    enabled: Boolean(intakeId),
    staleTime: Infinity,
  });

  const booking = useMutation({
    mutationFn: (slot: OpenSlot) => {
      const id = slot.id ?? '';
      const key = bookingKeys.current.get(id) ?? crypto.randomUUID();
      bookingKeys.current.set(id, key);
      return createSession(
        { slot_id: id, intake_id: intakeId, rebook_of: rebookOf, referral_id: referralId },
        key,
      );
    },
    onSuccess: (session) => {
      const sessionId = session.session_id;
      if (!sessionId) {
        showToast(errorCopy('').message, 'error');
        return;
      }
      // 서버가 홀드 만료 시각을 주면 그것을 쓴다
      const holdUntil = session.hold_expires_at ? Date.parse(session.hold_expires_at) : NaN;
      setHold(sessionId, Number.isNaN(holdUntil) ? Date.now() + HOLD_MS : holdUntil);
      queryClient.setQueryData(queryKeys.session(sessionId), session);
      void queryClient.invalidateQueries({ queryKey: queryKeys.allSessions });
      navigate(`/c/checkout/${sessionId}`);
    },
    onError: (error, slot) => {
      bookingKeys.current.delete(slot.id ?? '');
      if (isApiError(error, 'SLOT_TAKEN')) {
        setSlotId(null);
        void slots.refetch();
      }
      // 예약 제한(CLIENT_RESTRICTED)은 AppShell 이 계정 상태 안내로 보낸다
      if (!isApiError(error, 'CLIENT_RESTRICTED')) {
        showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
      }
    },
  });

  if (provider.isError) {
    return (
      <Screen>
        <ScreenHeader right={<CrisisButton />} />
        <EmptyState
          title={PROVIDER.unavailable}
          action={<ButtonLink to="/c/intake">{PROVIDER.newIntake}</ButtonLink>}
        />
      </Screen>
    );
  }

  const profile = provider.data;
  const professional = isProfessionalTrack(profile?.track);
  const groups = groupSlotsByDate(slots.data ?? []);
  const firstOpenDate = range.dates.find((key) => (groups[key]?.length ?? 0) > 0);
  const date = pickedDate ?? firstOpenDate ?? range.dates[0] ?? range.key;
  const daySlots = groups[date] ?? [];
  const slot = daySlots.find((item) => item.id === slotId);
  const minutes = slotMinutes(slot ?? daySlots[0], defaultMinutes(professional));
  const price = matches.data?.find((match) => match.provider_id === providerId)?.price;
  const about = [
    profile?.bio,
    profile?.cert_names?.join(' · '),
    profile?.rating_count && profile.rating_avg !== undefined
      ? PROVIDER.rating(profile.rating_avg.toFixed(1), profile.rating_count)
      : undefined,
  ].filter(Boolean);

  return (
    <Screen>
      <ScreenHeader right={<CrisisButton />} />
      {provider.isPending ? (
        <Skeleton lines={4} className="pt-6.5" />
      ) : (
        <>
          <h1 className="pt-6.5 text-title-sm font-bold text-fg">
            {PROVIDER.title(profile?.display_name ?? '')}
          </h1>
          <p className="pt-4 text-body-sm text-fg-muted">
            {[
              serviceLabel(profile?.track),
              profile?.specialties?.length
                ? PROVIDER.specialties(profile.specialties.join(', '))
                : undefined,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <section
            aria-labelledby="about-title"
            className="mt-4 border-b border-line pb-3 pt-2.5 text-body-sm"
          >
            <h2 id="about-title" className="font-bold text-fg">
              {PROVIDER.aboutTitle}
            </h2>
            {about.map((line) => (
              <p key={line} className="whitespace-pre-line pt-1 text-fg-muted">
                {line}
              </p>
            ))}
          </section>
        </>
      )}

      <h2 className="pt-4 text-heading font-bold text-fg">{PROVIDER.dateTitle}</h2>
      {slots.isPending ? (
        <Skeleton lines={3} className="pt-4" />
      ) : slots.isError ? (
        <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void slots.refetch()} />
      ) : firstOpenDate === undefined ? (
        <p className="pt-4 text-body-sm text-fg-muted">{PROVIDER.noSlots}</p>
      ) : (
        <>
          <div
            role="group"
            aria-label={PROVIDER.dateTitle}
            className="-mx-6 mt-2.5 flex gap-1.5 overflow-x-auto px-6 py-1.5 [scrollbar-width:thin]"
          >
            {range.dates.map((key) => {
              const open = (groups[key]?.length ?? 0) > 0;
              return (
                <Chip
                  key={key}
                  selected={key === date}
                  disabled={!open}
                  onClick={() => {
                    setPickedDate(key);
                    setSlotId(null);
                  }}
                  className={cx('shrink-0', !open && 'opacity-50')}
                >
                  {formatKSTShortDate(kstToUtcIso(key, NOON))}
                </Chip>
              );
            })}
          </div>

          <h2 className="pt-4 text-heading font-bold text-fg">{PROVIDER.timeTitle}</h2>
          {daySlots.length === 0 ? (
            <p className="pt-4 text-body-sm text-fg-muted">{PROVIDER.noSlotsOnDate}</p>
          ) : (
            <div
              role="group"
              aria-label={PROVIDER.timeTitle}
              className="flex flex-wrap gap-1.5 pt-4"
            >
              {daySlots.map((item) => (
                <Chip
                  key={item.id}
                  selected={item.id === slotId}
                  onClick={() => setSlotId(item.id ?? null)}
                >
                  {item.start_at ? formatKSTTime(item.start_at) : ''}
                </Chip>
              ))}
            </div>
          )}

          <div className="mt-4 border-b border-line pb-3 pt-2.5 text-body-sm">
            <p className="font-bold text-fg">
              {[PROVIDER.duration(minutes), typeof price === 'number' && MATCHES.price(price)]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <p className="pt-1 text-fg-muted">{PROVIDER.holdNote}</p>
          </div>
        </>
      )}

      <div className="mt-auto pb-10 pt-8">
        <Button
          block
          disabled={!slot}
          loading={booking.isPending}
          onClick={() => slot && booking.mutate(slot)}
        >
          {PROVIDER.book}
        </Button>
      </div>
    </Screen>
  );
}
