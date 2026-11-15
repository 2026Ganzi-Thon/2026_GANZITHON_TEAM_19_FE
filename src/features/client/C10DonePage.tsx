import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';

import { reviewSession, submitMood } from '@/api/endpoints/sessions';
import { isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { Screen } from '@/app/layouts/Screen';
import { CrisisButton } from '@/components/crisis/CrisisButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Mascot } from '@/components/mascot/Mascot';
import { Button } from '@/components/ui/Button';
import { MOOD_DEFAULT, MoodSlider } from '@/components/ui/MoodSlider';
import { StarRating } from '@/components/ui/StarRating';
import { TextArea } from '@/components/ui/TextArea';
import { DONE } from '@/copy/client';
import { errorCopy } from '@/copy/errorMessages';
import { COMPLAINT } from '@/copy/referral';
import { useFeatureFlag } from '@/hooks/useAppConfig';
import { track } from '@/lib/analytics';
import { countChars } from '@/lib/text';
import { useSessionFlowStore } from '@/stores/sessionFlowStore';
import { showToast } from '@/stores/uiStore';

import { useSession } from './queries';
import { REVIEW_MAX_CHARS, type ReviewForm, reviewSchema } from './schemas';
import { isCoaching } from './sessions';

/** 이미 낸 기록(409)은 넘어가고, 그 밖의 실패만 올린다 */
function ignoreAlreadySubmitted(error: unknown): void {
  if (!isApiError(error, 'ALREADY_SUBMITTED')) throw error;
}

/** C-10 상담 종료 */
export function C10DonePage() {
  const { id: sessionId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useSession(sessionId);
  const complaintsEnabled = useFeatureFlag('p1_complaints');
  const moodBefore = useSessionFlowStore((state) => state.moodBefore[sessionId]);
  const [score, setScore] = useState(moodBefore ?? MOOD_DEFAULT);
  const [rating, setRating] = useState<number | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { text: '' },
  });
  const reviewLength = countChars(watch('text').trim());

  const submission = useMutation({
    mutationFn: async (values: ReviewForm) => {
      await submitMood(sessionId, { phase: 'after', score }).catch(ignoreAlreadySubmitted);
      const text = values.text.trim();
      // 후기는 선택이다. 별점이나 글이 있을 때만 보낸다 (SES-07)
      if (rating !== null || text) {
        await reviewSession(sessionId, { rating: rating ?? undefined, text: text || undefined });
      }
    },
    onSuccess: () => {
      track('mood_after_submitted');
      void queryClient.invalidateQueries({ queryKey: queryKeys.allSessions });
      showToast(DONE.submitted, 'success');
      navigate('/c', { replace: true });
    },
    onError: (error) => {
      showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
    },
  });

  return (
    <Screen>
      <ScreenHeader backTo="/c" right={<CrisisButton />} />
      <form
        noValidate
        onSubmit={handleSubmit((values) => submission.mutate(values))}
        className="flex grow flex-col"
      >
        <h1 className="pt-6.5 text-title-sm font-bold text-fg">{DONE.title}</h1>
        <p className="pt-4 text-body-sm text-fg-muted">{DONE.description}</p>

        <section className="mt-4 border-b border-line pb-3 pt-2.5">
          <h2 className="pb-2 text-body-sm font-bold text-fg">{DONE.moodTitle}</h2>
          <MoodSlider
            label={DONE.moodTitle}
            value={score}
            onChange={setScore}
            compareTo={moodBefore}
          />
        </section>

        <h2 className="pt-4 text-heading font-bold text-fg">{DONE.ratingTitle}</h2>
        <StarRating
          label={DONE.ratingTitle}
          itemLabel={DONE.ratingLabel}
          value={rating}
          onChange={setRating}
        />
        <TextArea
          className="pt-2"
          label={DONE.reviewLabel}
          placeholder={DONE.reviewPlaceholder}
          rows={3}
          maxLength={REVIEW_MAX_CHARS}
          length={reviewLength}
          showCount
          error={errors.text?.message}
          {...register('text')}
        />
        {session.data && isCoaching(session.data) && (
          <p className="pt-4 text-micro text-fg-muted">{DONE.reportNotice}</p>
        )}
        {complaintsEnabled && (
          <Link
            to={`/c/sessions/${sessionId}/complaint`}
            className="flex min-h-(--size-touch) items-center self-start text-caption text-fg-muted underline"
          >
            {COMPLAINT.link}
          </Link>
        )}

        <div className="mt-auto flex justify-end pt-8">
          <Mascot pose="rest" />
        </div>
        <div className="pb-10 pt-4">
          <Button block type="submit" loading={submission.isPending}>
            {DONE.submit}
          </Button>
        </div>
      </form>
    </Screen>
  );
}
