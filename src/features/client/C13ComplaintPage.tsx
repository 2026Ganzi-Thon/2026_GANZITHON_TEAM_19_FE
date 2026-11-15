import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router';

import { createComplaint } from '@/api/endpoints/complaints';
import { isApiError } from '@/api/errors';
import { NotFoundPage } from '@/app/ErrorPages';
import { Screen } from '@/app/layouts/Screen';
import { PageLoader } from '@/app/PageLoader';
import { CrisisButton } from '@/components/crisis/CrisisButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Chip } from '@/components/ui/Chip';
import { ConfirmLeaveModal } from '@/components/ui/ConfirmLeaveModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextArea } from '@/components/ui/TextArea';
import { errorCopy } from '@/copy/errorMessages';
import { COMMON } from '@/copy/fixed';
import { COMPLAINT } from '@/copy/referral';
import { useAppConfig, useFeatureFlag } from '@/hooks/useAppConfig';
import { useNow } from '@/hooks/useNow';
import { formatKST } from '@/lib/date';
import { countChars } from '@/lib/text';
import { showToast } from '@/stores/uiStore';

import { useProviderName, useSession } from './queries';
import {
  COMPLAINT_MAX_CHARS,
  COMPLAINT_MIN_CHARS,
  type ComplaintForm,
  complaintSchema,
} from './schemas';
import { isComplaintOpen, trackLabel } from './sessions';

function ComplaintFormView({ sessionId }: { sessionId: string }) {
  const now = useNow();
  const session = useSession(sessionId);
  const providerName = useProviderName(session.data?.provider_id);
  // 접수가 끝났거나 이미 접수된 세션이면 안내 문구를 보여 준다
  const [result, setResult] = useState<string | null>(null);
  const submitted = useRef(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ComplaintForm>({
    resolver: zodResolver(complaintSchema),
    defaultValues: { description: '' },
  });
  const category = watch('category');
  const length = countChars(watch('description').trim());

  const complaint = useMutation({
    mutationFn: (values: ComplaintForm) =>
      createComplaint({
        session_id: sessionId,
        category: values.category,
        description: values.description.trim(),
      }),
    onSuccess: () => {
      submitted.current = true;
      setResult(COMPLAINT.doneBody);
    },
    onError: (error) => {
      if (isApiError(error, 'COMPLAINT_EXISTS')) {
        submitted.current = true;
        setResult(errorCopy(error.code).message);
      } else {
        showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
      }
    },
  });

  if (result) {
    return (
      <div role="status" className="flex grow flex-col">
        <h1 className="pt-10 text-title-sm font-bold text-fg">{COMPLAINT.doneTitle}</h1>
        <p className="pt-4 text-body-sm text-fg-muted">{result}</p>
        <div className="mt-auto pb-10 pt-8">
          <ButtonLink to="/c">{COMMON.home}</ButtonLink>
        </div>
      </div>
    );
  }

  const data = session.data;
  const open = data !== undefined && isComplaintOpen(data, now);

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => complaint.mutate(values))}
      className="flex grow flex-col"
    >
      <h1 className="pt-6.5 text-title-sm font-bold text-fg">{COMPLAINT.title}</h1>
      {session.isPending && <Skeleton lines={2} className="pt-4" />}
      {data && (
        <div className="mt-4 border-b border-line pb-3 pt-2.5 text-body-sm">
          <p className="font-bold text-fg">
            {[providerName, trackLabel(data)].filter(Boolean).join(' · ')}
          </p>
          {data.scheduled_start && (
            <p className="pt-1 text-fg-muted">{formatKST(data.scheduled_start)}</p>
          )}
        </div>
      )}
      {data && !open && (
        <p role="status" className="pt-4 text-body-sm text-danger">
          {COMPLAINT.closed}
        </p>
      )}

      <fieldset className="pt-4">
        <legend className="text-body-sm font-bold text-fg">{COMPLAINT.categoryLabel}</legend>
        <div className="flex flex-wrap gap-1.5 pt-3">
          {COMPLAINT.categories.map((option) => (
            <Chip
              key={option.value}
              selected={category === option.value}
              onClick={() => setValue('category', option.value, { shouldValidate: true })}
            >
              {option.label}
            </Chip>
          ))}
        </div>
        {errors.category && (
          <p role="alert" className="pt-2 text-caption text-danger">
            {COMPLAINT.categoryRequired}
          </p>
        )}
      </fieldset>

      <TextArea
        className="pt-6"
        label={COMPLAINT.descriptionLabel}
        rows={5}
        minLength={COMPLAINT_MIN_CHARS}
        maxLength={COMPLAINT_MAX_CHARS}
        length={length}
        showCount
        error={errors.description?.message}
        {...register('description')}
      />
      <p className="pt-3 text-micro text-fg-muted">{COMPLAINT.notice}</p>

      <div className="mt-auto pb-10 pt-8">
        <Button
          block
          type="submit"
          disabled={!open || length < COMPLAINT_MIN_CHARS}
          loading={complaint.isPending}
        >
          {COMPLAINT.submit}
        </Button>
      </div>
      <ConfirmLeaveModal when={() => !submitted.current && length > 0} />
    </form>
  );
}

/** C-13 민원 제기 (P1). 기능 플래그가 꺼져 있으면 없는 화면으로 본다 (TRD 17-8) */
export function C13ComplaintPage() {
  const { id: sessionId = '' } = useParams();
  const config = useAppConfig();
  const enabled = useFeatureFlag('p1_complaints');

  if (config.isPending) return <PageLoader />;
  if (!enabled) return <NotFoundPage />;

  return (
    <Screen>
      <ScreenHeader right={<CrisisButton />} />
      <ComplaintFormView sessionId={sessionId} />
    </Screen>
  );
}
