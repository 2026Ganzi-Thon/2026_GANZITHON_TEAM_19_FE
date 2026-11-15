import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router';

import { createIntake, type IntakeCategory } from '@/api/endpoints/intakes';
import { isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { Screen } from '@/app/layouts/Screen';
import { CrisisButton } from '@/components/crisis/CrisisButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmLeaveModal } from '@/components/ui/ConfirmLeaveModal';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import { INTAKE } from '@/copy/client';
import { errorCopy } from '@/copy/errorMessages';
import { track } from '@/lib/analytics';
import { cx } from '@/lib/cx';
import { countChars } from '@/lib/text';
import { useCrisisStore } from '@/stores/crisisStore';
import { useIntakeDraftStore } from '@/stores/intakeDraftStore';
import { showToast } from '@/stores/uiStore';

import { INTAKE_MAX_CHARS, INTAKE_MIN_CHARS, type IntakeForm, intakeSchema } from './schemas';

const LOADING_STEP_MS = 2500;

/** 분석을 기다리는 동안 단계 문구를 번갈아 보여 준다 (TRD C-03) */
function Analyzing() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setStep((current) => (current + 1) % INTAKE.loadingSteps.length),
      LOADING_STEP_MS,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex grow flex-col items-center justify-center gap-4 text-fg"
    >
      <Spinner className="size-6" />
      <p className="text-subheading font-bold">{INTAKE.loadingSteps[step]}</p>
    </div>
  );
}

function WriteForm({ category }: { category: IntakeCategory }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const keepSubmitted = useIntakeDraftStore((state) => state.keepSubmitted);
  const showCrisis = useCrisisStore((state) => state.show);
  // 분석이 끝나 다음 화면으로 넘어갈 때는 이탈 확인을 띄우지 않는다
  const submitted = useRef(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<IntakeForm>({
    resolver: zodResolver(intakeSchema),
    defaultValues: { text: '', shareRaw: false, preferredTimes: [] },
  });
  const text = watch('text');
  const preferredTimes = watch('preferredTimes');
  const length = countChars(text.trim());
  const tooLong = length > INTAKE_MAX_CHARS;

  const analysis = useMutation({
    mutationFn: (values: IntakeForm) =>
      createIntake({
        category,
        text: values.text.trim(),
        share_raw: values.shareRaw,
        preferred_times: values.preferredTimes,
      }),
    onSuccess: (intake, values) => {
      const intakeId = intake.intake_id;
      if (!intakeId) {
        showToast(errorCopy('').message, 'error');
        return;
      }
      queryClient.setQueryData(queryKeys.intake(intakeId), intake);
      queryClient.setQueryData(queryKeys.intakeMatches(intakeId), intake.matches ?? []);
      keepSubmitted({
        text: values.text.trim(),
        shareRaw: values.shareRaw,
        preferredTimes: values.preferredTimes,
      });
      track('intake_submitted');
      // 위기 수준이면 위기 안내를 먼저 띄운다. 후보는 서버가 전문가만 돌려준다
      if (intake.risk?.level === 'critical') {
        showCrisis({ source: 'auto', level: 'critical' });
        track('crisis_modal_opened', { source: 'auto' });
      }
      submitted.current = true;
      navigate(`/c/intake/${intakeId}/matches`, { replace: true });
    },
    onError: (error) => {
      if (isApiError(error, 'VALIDATION_ERROR') && error.fields.text) {
        setError('text', { message: error.fields.text });
      } else {
        showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
      }
    },
  });

  function toggleTime(value: IntakeForm['preferredTimes'][number]) {
    const next = preferredTimes.includes(value)
      ? preferredTimes.filter((item) => item !== value)
      : [...preferredTimes, value];
    setValue('preferredTimes', next, { shouldDirty: true });
  }

  return (
    <>
      {analysis.isPending && <Analyzing />}
      {/* 분석 중에도 폼은 남겨 둔다. 실패하면 적은 글이 그대로 있어야 한다 */}
      <form
        noValidate
        hidden={analysis.isPending}
        onSubmit={handleSubmit((values) => analysis.mutate(values))}
        className="flex grow flex-col"
      >
        <p className="pt-6 text-caption font-medium text-fg-muted">{INTAKE.writeStep}</p>
        <h1 className="whitespace-pre-line pt-4 text-headline font-bold text-fg">
          {INTAKE.writeTitle}
        </h1>
        <p className="pt-4 text-body-sm text-fg-muted">{INTAKE.writeGuide}</p>

        <TextArea
          className="pt-7"
          label={INTAKE.textLabel}
          rows={5}
          minLength={INTAKE_MIN_CHARS}
          maxLength={INTAKE_MAX_CHARS}
          length={length}
          showCount
          error={errors.text?.message ?? (tooLong ? INTAKE.textTooLong : undefined)}
          {...register('text')}
        />

        <Checkbox className="pt-3" label={INTAKE.shareRaw} {...register('shareRaw')} />
        <p className="pl-6.5 text-micro text-fg-muted">{INTAKE.shareRawHint}</p>

        <fieldset className="pt-8">
          <legend className="text-body-sm font-bold text-fg">{INTAKE.timesLabel}</legend>
          <div className="grid grid-cols-4 gap-2 pt-3">
            {INTAKE.times.map((option) => {
              const selected = preferredTimes.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleTime(option.value)}
                  className={cx(
                    'min-h-(--size-touch) rounded-sm border text-micro text-fg',
                    selected
                      ? 'border-brand-yellow bg-brand-yellow font-bold'
                      : 'border-line bg-surface font-medium',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-auto pb-10 pt-8">
          <Button block type="submit" disabled={length < INTAKE_MIN_CHARS || tooLong}>
            {INTAKE.submit}
          </Button>
        </div>
      </form>
      <ConfirmLeaveModal when={() => !submitted.current && length > 0} />
    </>
  );
}

/** C-03 인테이크 2: 고민 입력·분석 */
export function C03IntakeWritePage() {
  const category = useIntakeDraftStore((state) => state.category);

  // 카테고리는 메모리에만 있어서 새로고침하면 사라진다. 그때는 1단계부터 다시 한다
  if (!category) return <Navigate to="/c/intake" replace />;

  return (
    <Screen>
      <ScreenHeader backTo="/c/intake" right={<CrisisButton />} />
      <WriteForm category={category} />
    </Screen>
  );
}
