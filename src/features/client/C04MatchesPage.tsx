import { skipToken, useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';

import { createIntake, getMatches, type Intake, type Match } from '@/api/endpoints/intakes';
import { isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { Screen } from '@/app/layouts/Screen';
import { CrisisButton } from '@/components/crisis/CrisisButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { MATCHES } from '@/copy/client';
import { EMPTY } from '@/copy/empty';
import { errorCopy } from '@/copy/errorMessages';
import { COMMON } from '@/copy/fixed';
import { useNow } from '@/hooks/useNow';
import { track } from '@/lib/analytics';
import { formatRelativeKST } from '@/lib/date';
import { useIntakeDraftStore } from '@/stores/intakeDraftStore';
import { showToast } from '@/stores/uiStore';

import { isProfessionalTrack, serviceLabel } from './sessions';

const PAGE_SIZE = 3;
const MAX_EMOTIONS = 5;
const MAX_DISTORTIONS = 3;
const SEPARATOR = '  ·  ';

function ids(matches: readonly Match[] | undefined): string {
  return (matches ?? []).map((match) => match.provider_id).join();
}

function AiSummary({ intake }: { intake: Intake }) {
  const emotions = (intake.ai_tags?.emotions ?? []).slice(0, MAX_EMOTIONS);
  const distortions = (intake.ai_tags?.distortions ?? []).slice(0, MAX_DISTORTIONS);
  const empty = emotions.length === 0 && distortions.length === 0;

  return (
    <section
      aria-labelledby="ai-summary-title"
      className="mt-7 rounded-sm bg-highlight px-4 py-3.5"
    >
      <h2 id="ai-summary-title" className="text-micro font-bold text-fg">
        {MATCHES.summaryTitle}
      </h2>
      {intake.ai_fallback || empty ? (
        <p className="pt-2 text-body-sm text-fg">{MATCHES.aiFallback}</p>
      ) : (
        <dl>
          {emotions.length > 0 && (
            <>
              <dt className="sr-only">{MATCHES.emotions}</dt>
              <dd className="pt-2 text-body font-medium text-fg">{emotions.join(SEPARATOR)}</dd>
            </>
          )}
          {distortions.length > 0 && (
            <div className="flex gap-2 pt-1 text-micro text-fg-muted">
              <dt>{MATCHES.distortions}</dt>
              <dd className="text-fg">{distortions.join(SEPARATOR)}</dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}

interface MatchRowProps {
  match: Match;
  intakeId: string;
  now: number;
  onSelect: () => void;
}

function MatchRow({ match, intakeId, now, onSelect }: MatchRowProps) {
  const facts = [
    match.specialties?.join(', '),
    match.earliest_slot && formatRelativeKST(match.earliest_slot, now),
    typeof match.price === 'number' && MATCHES.price(match.price),
  ].filter(Boolean);
  const reason = match.reasons?.[0];

  return (
    <li>
      <Link
        to={`/c/providers/${match.provider_id}?intake_id=${intakeId}`}
        onClick={onSelect}
        className="flex min-h-23 items-center justify-between gap-3 border-b border-line py-4"
      >
        <span className="flex flex-col gap-1.5">
          <span className="text-subheading font-bold text-fg">
            {[match.display_name, serviceLabel(match.track)].filter(Boolean).join(SEPARATOR)}
          </span>
          <span className="text-micro text-fg-muted">{facts.join('  /  ')}</span>
          {reason && <span className="text-micro text-fg-muted">{reason}</span>}
        </span>
        <span aria-hidden="true" className="text-headline text-fg-muted">
          ›
        </span>
      </Link>
    </li>
  );
}

/** C-04 매칭 결과 */
export function C04MatchesPage() {
  const { intakeId = '' } = useParams();
  const now = useNow();
  const draft = useIntakeDraftStore();
  const [page, setPage] = useState(0);
  const [checking, setChecking] = useState(false);

  // INT-01 응답(AI 태그·위험 수준)은 접수 직후에만 캐시에 있다. 새로고침하면 후보 목록만 다시 받는다
  const { data: intake } = useQuery<Intake>({
    queryKey: queryKeys.intake(intakeId),
    queryFn: skipToken,
    staleTime: Infinity,
  });
  const matches = useQuery({
    queryKey: queryKeys.intakeMatches(intakeId),
    queryFn: () => getMatches(intakeId),
    staleTime: Infinity,
  });

  useEffect(() => {
    track('match_viewed');
  }, []);

  const notify = useMutation({
    mutationFn: () =>
      createIntake({
        category: draft.category ?? 'other',
        text: draft.text,
        share_raw: draft.shareRaw,
        preferred_times: [...draft.preferredTimes],
        notify_when_available: true,
      }),
    onSuccess: () => {
      draft.reset();
      showToast(MATCHES.notifyDone, 'success');
    },
    onError: (error) => {
      showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
    },
  });

  // 위험 수준이 높으면 수련생 대신 전문가 후보만 보여 준다 (TRD C-03)
  const level = intake?.risk?.level;
  const expertsOnly = level === 'high' || level === 'critical';
  const candidates = (matches.data ?? []).filter(
    (match) => match.provider_id && (!expertsOnly || isProfessionalTrack(match.track)),
  );
  const pageCount = Math.max(1, Math.ceil(candidates.length / PAGE_SIZE));
  const start = (page % pageCount) * PAGE_SIZE;
  const visible = candidates.slice(start, start + PAGE_SIZE);
  const canNotify = draft.category !== null && draft.text.length > 0;

  async function showOthers() {
    if (pageCount > 1) {
      setPage((current) => (current + 1) % pageCount);
      return;
    }
    // 받은 후보가 한 화면 분량뿐이면 서버에 다시 물어본다
    setChecking(true);
    const before = ids(matches.data);
    const { data } = await matches.refetch();
    setChecking(false);
    if (ids(data) === before) showToast(MATCHES.noOthers);
  }

  function select(rank: number | undefined) {
    track('match_selected', { rank: rank ?? 0 });
    draft.reset();
  }

  return (
    <Screen>
      <ScreenHeader backTo="/c" right={<CrisisButton />} />
      <h1 className="whitespace-pre-line pt-8 text-headline font-bold text-fg">{MATCHES.title}</h1>
      <p className="pt-5 text-caption text-fg-muted">{MATCHES.notice}</p>

      {intake && <AiSummary intake={intake} />}

      {matches.isPending && <Skeleton lines={5} className="pt-8" />}
      {matches.isError && (
        <ErrorState
          title={COMMON.serverErrorTitle}
          description={errorCopy(isApiError(matches.error) ? matches.error.code : '').message}
          requestId={isApiError(matches.error) ? matches.error.requestId : undefined}
          onRetry={() => void matches.refetch()}
        />
      )}

      {matches.data && candidates.length === 0 && (
        <EmptyState
          title={EMPTY.matches.title}
          description={EMPTY.matches.description}
          action={
            canNotify ? (
              <Button block loading={notify.isPending} onClick={() => notify.mutate()}>
                {EMPTY.matches.action}
              </Button>
            ) : (
              <ButtonLink to="/c" variant="secondary">
                {COMMON.home}
              </ButtonLink>
            )
          }
        />
      )}

      {candidates.length > 0 && (
        <>
          <h2 className="pt-8 text-body-sm font-bold text-fg">{MATCHES.listTitle}</h2>
          <ul className="mt-3 border-t border-line">
            {visible.map((match) => (
              <MatchRow
                key={match.provider_id}
                match={match}
                intakeId={intakeId}
                now={now}
                onSelect={() => select(match.score_rank)}
              />
            ))}
          </ul>
          <div className="mt-auto pb-10 pt-8">
            <Button block variant="secondary" loading={checking} onClick={() => void showOthers()}>
              {MATCHES.others}
            </Button>
          </div>
        </>
      )}
    </Screen>
  );
}
