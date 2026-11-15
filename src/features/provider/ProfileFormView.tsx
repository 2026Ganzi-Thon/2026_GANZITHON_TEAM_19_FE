import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';

import { saveProviderProfile } from '@/api/endpoints/providers';
import { isApiError } from '@/api/errors';
import { Screen } from '@/app/layouts/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Chip } from '@/components/ui/Chip';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { errorCopy } from '@/copy/errorMessages';
import { PROFILE } from '@/copy/provider';
import { refreshSession } from '@/lib/session';
import { countChars } from '@/lib/text';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/stores/uiStore';

import {
  BIO_MAX_CHARS,
  BIO_MIN_CHARS,
  MAX_SPECIALTIES,
  type ProfileForm,
  profileSchema,
} from './schemas';

interface ProfileFormViewProps {
  role: 'trainee' | 'expert';
}

type ProfileTextField = 'displayName' | 'realName' | 'bio' | 'school';

// 서버 검증 오류(422)의 필드 이름을 폼 필드 이름으로 옮긴다
const SERVER_FIELD: Record<string, ProfileTextField> = {
  display_name: 'displayName',
  real_name: 'realName',
  bio: 'bio',
  school: 'school',
};

/** T-01 수련생 프로필, E-01 전문가 프로필이 함께 쓰는 폼 (USR-06) */
export function ProfileFormView({ role }: ProfileFormViewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.me?.provider_profile);
  const firstTime = !profile?.display_name;
  const trainee = role === 'trainee';
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile?.display_name ?? '',
      realName: profile?.real_name ?? '',
      serviceLabel: profile?.service_label ?? 'coaching',
      specialties: profile?.specialties ?? [],
      bio: profile?.bio ?? '',
      school: profile?.school ?? '',
      career: (profile?.career ?? []).map((item) => ({
        org: item.org ?? '',
        from: item.from ?? '',
        to: item.to ?? '',
      })),
      acceptsSupervision: profile?.accepts_supervision ?? false,
    },
  });
  const career = useFieldArray({ control, name: 'career' });
  const values = watch();
  const bioLength = countChars(values.bio.trim());

  const save = useMutation({
    mutationFn: (form: ProfileForm) =>
      saveProviderProfile({
        display_name: form.displayName,
        real_name: form.realName,
        service_label: trainee ? form.serviceLabel : undefined,
        specialties: form.specialties,
        bio: form.bio.trim(),
        school: trainee && form.school ? form.school : undefined,
        career: trainee
          ? undefined
          : form.career.map((item) => ({
              org: item.org,
              from: item.from,
              to: item.to || undefined,
            })),
        accepts_supervision: trainee ? undefined : form.acceptsSupervision,
      }),
    onSuccess: async () => {
      await refreshSession(queryClient);
      showToast(PROFILE.saved, 'success');
      // 처음 작성했으면 서류·자격 등록으로 이어 간다 (TRD T-01, E-01)
      if (firstTime) navigate(trainee ? '/t/credentials' : '/e/credentials');
    },
    onError: (error) => {
      const fields = isApiError(error, 'VALIDATION_ERROR') ? error.fields : {};
      const known = Object.entries(fields).filter(([name]) => SERVER_FIELD[name]);
      known.forEach(([name, message]) => {
        const field = SERVER_FIELD[name];
        if (field) setError(field, { message });
      });
      if (known.length === 0) {
        showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
      }
    },
  });

  function toggleSpecialty(tag: string) {
    const selected = values.specialties.includes(tag);
    if (!selected && values.specialties.length >= MAX_SPECIALTIES) return;
    setValue(
      'specialties',
      selected ? values.specialties.filter((item) => item !== tag) : [...values.specialties, tag],
      { shouldValidate: true },
    );
  }

  const serviceName = PROFILE.serviceLabels.find((item) => item.value === values.serviceLabel);

  return (
    <Screen>
      <ScreenHeader />
      <form
        noValidate
        onSubmit={handleSubmit((form) => save.mutate(form))}
        className="flex grow flex-col gap-6 pt-6.5"
      >
        <h1 className="text-title-sm font-bold text-fg">{PROFILE.title}</h1>
        <TextField
          label={PROFILE.displayName}
          hint={PROFILE.displayNameHint}
          autoComplete="off"
          error={errors.displayName?.message}
          {...register('displayName')}
        />
        <TextField
          label={PROFILE.realName}
          hint={PROFILE.realNameHint}
          autoComplete="name"
          error={errors.realName?.message}
          {...register('realName')}
        />

        {trainee && (
          <fieldset>
            <legend className="text-body-sm font-bold text-fg">{PROFILE.serviceLabel}</legend>
            <div className="flex flex-wrap gap-1.5 pt-3">
              {PROFILE.serviceLabels.map((option) => (
                <Chip
                  key={option.value}
                  selected={values.serviceLabel === option.value}
                  onClick={() => setValue('serviceLabel', option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className="text-body-sm font-bold text-fg">
            {trainee ? PROFILE.specialties : PROFILE.expertSpecialties}
          </legend>
          <p className="pt-1 text-micro text-fg-muted">
            {trainee
              ? `${PROFILE.specialtiesHint} · ${PROFILE.matchingNotice}`
              : PROFILE.specialtiesHint}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-3">
            {PROFILE.tags.map((tag) => (
              <Chip
                key={tag}
                selected={values.specialties.includes(tag)}
                onClick={() => toggleSpecialty(tag)}
              >
                {tag}
              </Chip>
            ))}
          </div>
          {errors.specialties && (
            <p role="alert" className="pt-2 text-caption text-danger">
              {PROFILE.specialtiesRule}
            </p>
          )}
        </fieldset>

        <TextArea
          label={PROFILE.bio}
          rows={4}
          minLength={BIO_MIN_CHARS}
          maxLength={BIO_MAX_CHARS}
          length={bioLength}
          showCount
          error={bioLength > BIO_MAX_CHARS ? PROFILE.bioTooLong : undefined}
          {...register('bio')}
        />

        {trainee ? (
          <TextField
            label={PROFILE.school}
            hint={PROFILE.schoolHint}
            error={errors.school?.message}
            {...register('school')}
          />
        ) : (
          <>
            <fieldset>
              <legend className="text-body-sm font-bold text-fg">{PROFILE.career}</legend>
              <ul className="flex flex-col gap-4 pt-3">
                {career.fields.map((field, index) => (
                  <li key={field.id} className="flex flex-col gap-2 border-b border-line pb-4">
                    <TextField
                      label={PROFILE.careerOrg}
                      error={errors.career?.[index]?.org?.message}
                      {...register(`career.${index}.org`)}
                    />
                    <TextField
                      label={PROFILE.careerFrom}
                      placeholder="2020-03"
                      inputMode="numeric"
                      error={errors.career?.[index]?.from?.message}
                      {...register(`career.${index}.from`)}
                    />
                    <TextField
                      label={PROFILE.careerTo}
                      placeholder="2023-02"
                      inputMode="numeric"
                      error={errors.career?.[index]?.to?.message}
                      {...register(`career.${index}.to`)}
                    />
                    <button
                      type="button"
                      onClick={() => career.remove(index)}
                      className="min-h-(--size-touch) self-start text-caption text-fg-muted underline"
                    >
                      {PROFILE.careerRemove}
                    </button>
                  </li>
                ))}
              </ul>
              <Button
                size="md"
                variant="secondary"
                className="mt-3"
                onClick={() => career.append({ org: '', from: '', to: '' })}
              >
                {PROFILE.careerAdd}
              </Button>
            </fieldset>
            <Checkbox label={PROFILE.acceptsSupervision} {...register('acceptsSupervision')} />
          </>
        )}

        <section
          aria-labelledby="profile-preview"
          className="rounded-sm bg-highlight px-4 py-3.5 text-body-sm"
        >
          <h2 id="profile-preview" className="text-micro font-bold text-fg">
            {PROFILE.previewTitle}
          </h2>
          <p className="pt-2 font-bold text-fg">
            {[values.displayName, trainee ? serviceName?.label : undefined]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className="pt-1 text-fg-muted">{values.specialties.join(' · ')}</p>
          <p className="whitespace-pre-line pt-1 text-fg-muted">{values.bio}</p>
        </section>

        <div className="mt-auto pb-10">
          <Button
            block
            type="submit"
            loading={save.isPending}
            disabled={bioLength < BIO_MIN_CHARS || bioLength > BIO_MAX_CHARS}
          >
            {PROFILE.save}
          </Button>
        </div>
      </form>
    </Screen>
  );
}
