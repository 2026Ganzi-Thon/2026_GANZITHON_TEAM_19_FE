import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';

import { getTerms, register as registerUser, type Terms } from '@/api/endpoints/auth';
import { isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import type { Role } from '@/api/types';
import { roleHome } from '@/app/access';
import { Screen } from '@/app/layouts/Screen';
import { CrisisButton } from '@/components/crisis/CrisisButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Mascot } from '@/components/mascot/Mascot';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextField } from '@/components/ui/TextField';
import { errorCopy } from '@/copy/errorMessages';
import { COMMON, NOTICE } from '@/copy/fixed';
import { ONBOARDING } from '@/copy/screens';
import { authClient } from '@/lib/auth';
import { cx } from '@/lib/cx';
import { refreshSession } from '@/lib/session';
import { looksLikePersonalInfo } from '@/lib/text';
import { showToast } from '@/stores/uiStore';

import { randomNickname } from './nickname';
import { type NicknameForm, nicknameSchema } from './schemas';

type OnboardingRole = Exclude<Role, 'admin'>;
type PriorCounseling = 'yes' | 'no' | 'skip';

/** 가입 뒤 처음 가는 곳: 내담자는 홈, 공급자는 프로필 작성 (TRD A-03) */
const FIRST_DESTINATION: Record<OnboardingRole, string> = {
  client: roleHome('client'),
  trainee: '/t/profile',
  expert: '/e/profile',
};

const TRAINING_DATA = 'training_data';
const MARKETING = 'marketing';

interface RoleStepProps {
  role: OnboardingRole | null;
  onSelect: (role: OnboardingRole) => void;
  onNext: () => void;
}

function RoleStep({ role, onSelect, onNext }: RoleStepProps) {
  return (
    <>
      <p className="pt-7 text-caption font-medium text-fg-muted">{ONBOARDING.step(1)}</p>
      <div className="flex items-start justify-between gap-4 pt-5">
        <div>
          <h1 className="whitespace-pre-line text-title font-bold text-fg">
            {ONBOARDING.roleTitle}
          </h1>
          <p className="mt-4.5 text-body-sm text-fg-muted">{NOTICE.roleLocked}</p>
        </div>
        <Mascot pose="choose" />
      </div>

      <div
        role="radiogroup"
        aria-label={ONBOARDING.roleTitle}
        className="mt-10 border-t border-line"
      >
        {ONBOARDING.roles.map((option) => {
          const selected = role === option.value;
          return (
            <label
              key={option.value}
              className="flex min-h-24 cursor-pointer items-center justify-between gap-3 border-b border-line"
            >
              <span className="flex flex-col gap-1.5">
                <span className="text-subheading font-bold text-fg">{option.title}</span>
                <span className="text-caption text-fg-muted">{option.description}</span>
              </span>
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={selected}
                onChange={() => onSelect(option.value)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={cx(
                  'flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-green',
                  selected ? 'border-brand-green bg-brand-green' : 'border-fg-muted',
                )}
              >
                {selected && <span className="size-2 rounded-full bg-brand-yellow" />}
              </span>
            </label>
          );
        })}
      </div>

      <div className="mt-auto pb-10 pt-8">
        <Button block disabled={!role} onClick={onNext}>
          {COMMON.next}
        </Button>
      </div>
    </>
  );
}

interface NicknameStepProps {
  defaultValue: string;
  serverError: string | null;
  onNext: (nickname: string) => void;
}

function NicknameStep({ defaultValue, serverError, onNext }: NicknameStepProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NicknameForm>({
    resolver: zodResolver(nicknameSchema),
    defaultValues: { nickname: defaultValue },
  });
  const nickname = watch('nickname');

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => onNext(values.nickname))}
      className="flex grow flex-col"
    >
      <p className="pt-7 text-caption text-fg-muted">{ONBOARDING.nicknameStep}</p>
      <h1 className="pt-4 text-title-sm font-bold text-fg">{ONBOARDING.nicknameTitle}</h1>
      <p className="pt-4 text-body-sm text-fg-muted">{NOTICE.nicknameOnly}</p>

      <TextField
        className="pt-4"
        label={ONBOARDING.nicknameLabel}
        placeholder={ONBOARDING.nicknamePlaceholder}
        autoComplete="off"
        maxLength={12}
        error={errors.nickname?.message ?? serverError ?? undefined}
        {...register('nickname')}
      />
      <Button
        block
        size="md"
        variant="secondary"
        className="mt-3 border-border-strong"
        onClick={() => setValue('nickname', randomNickname(), { shouldValidate: true })}
      >
        {ONBOARDING.randomNickname}
      </Button>
      <p
        role={looksLikePersonalInfo(nickname) ? 'alert' : undefined}
        className={cx(
          'pt-4 text-micro',
          looksLikePersonalInfo(nickname) ? 'font-bold text-danger' : 'text-fg-muted',
        )}
      >
        {NOTICE.nicknamePersonalInfo}
      </p>

      <div className="mt-auto pb-10 pt-8">
        <Button block type="submit">
          {COMMON.next}
        </Button>
      </div>
    </form>
  );
}

interface TermsStepProps {
  role: OnboardingRole;
  submitting: boolean;
  onSubmit: (input: { accepted: Terms[]; priorCounseling: PriorCounseling | null }) => void;
}

function TermsStep({ role, submitting, onSubmit }: TermsStepProps) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.terms,
    queryFn: getTerms,
  });
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  const [viewing, setViewing] = useState<Terms | null>(null);
  const [priorCounseling, setPriorCounseling] = useState<PriorCounseling | null>(null);

  if (isPending) return <Skeleton lines={6} className="pt-10" />;
  if (isError) return <ErrorState title={ONBOARDING.termsError} onRetry={() => void refetch()} />;

  // 수련 목적 비식별 활용 동의는 내담자에게만 묻는다 (TRD A-03 ⑤)
  const terms = data.filter(
    (item) => item.type && (role === 'client' || item.type !== TRAINING_DATA),
  );
  const requiredDone = terms.every((item) => !item.required || checked.has(item.type ?? ''));

  function toggle(type: string) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  return (
    <>
      <p className="pt-7 text-caption text-fg-muted">{ONBOARDING.termsStep}</p>
      <h1 className="pt-4 text-title-sm font-bold text-fg">{ONBOARDING.termsTitle}</h1>
      <p className="pt-4 text-body-sm text-fg-muted">{ONBOARDING.termsDescription}</p>

      <ul className="pt-3">
        {terms.map((item) => (
          <li key={item.type}>
            <Checkbox
              checked={checked.has(item.type ?? '')}
              onChange={() => toggle(item.type ?? '')}
              label={`${item.title} ${item.required ? ONBOARDING.required : ONBOARDING.optional}`}
              trailing={
                item.body_md ? (
                  <button
                    type="button"
                    onClick={() => setViewing(item)}
                    className="min-h-(--size-touch) shrink-0 text-caption text-fg-muted underline"
                  >
                    {ONBOARDING.viewTerms}
                  </button>
                ) : undefined
              }
            />
          </li>
        ))}
      </ul>

      {role === 'client' && (
        <fieldset className="pt-4">
          <legend className="text-caption text-fg-muted">{ONBOARDING.priorCounseling}</legend>
          <div className="flex flex-wrap gap-1.5 pt-3">
            {ONBOARDING.priorCounselingOptions.map((option) => (
              <label
                key={option.value}
                className={cx(
                  'cursor-pointer rounded-md px-3 py-2 text-micro text-fg has-focus-visible:outline-2 has-focus-visible:outline-brand-green',
                  priorCounseling === option.value ? 'bg-brand-yellow font-bold' : 'bg-chip',
                )}
              >
                <input
                  type="radio"
                  name="prior-counseling"
                  value={option.value}
                  checked={priorCounseling === option.value}
                  onChange={() => setPriorCounseling(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="mt-auto pb-10 pt-8">
        <Button
          block
          disabled={!requiredDone}
          loading={submitting}
          onClick={() =>
            onSubmit({
              accepted: terms.filter((item) => checked.has(item.type ?? '')),
              priorCounseling,
            })
          }
        >
          {ONBOARDING.start}
        </Button>
      </div>

      <Modal
        open={viewing !== null}
        title={viewing?.title ?? ''}
        onClose={() => setViewing(null)}
        footer={
          <Button block size="md" onClick={() => setViewing(null)}>
            {COMMON.confirm}
          </Button>
        }
      >
        {/* 약관 본문은 평문으로만 보여 준다 (TRD 18-5) */}
        <p className="whitespace-pre-wrap text-body-sm text-fg">{viewing?.body_md}</p>
      </Modal>
    </>
  );
}

/** A-03 온보딩 (역할 → 닉네임 → 약관) */
export function A03OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<OnboardingRole | null>(null);
  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState<string | null>(null);

  const registration = useMutation({
    mutationFn: registerUser,
    onSuccess: async (me) => {
      await refreshSession(queryClient);
      navigate(me.role && me.role !== 'admin' ? FIRST_DESTINATION[me.role] : '/', {
        replace: true,
      });
    },
    onError: async (error) => {
      if (isApiError(error, 'NICKNAME_TAKEN')) {
        setNicknameError(errorCopy(error.code).message);
        setStep(2);
      } else if (isApiError(error, 'ALREADY_REGISTERED')) {
        await refreshSession(queryClient);
      } else {
        showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
      }
    },
  });

  function submit(input: { accepted: Terms[]; priorCounseling: PriorCounseling | null }) {
    if (!role) return;
    const acceptedTypes = new Set(input.accepted.map((item) => item.type));
    registration.mutate({
      role,
      nickname,
      consents: input.accepted
        .filter((item) => item.required)
        .map((item) => ({ type: item.type ?? '', version: item.version ?? '' })),
      training_data_opt_in: acceptedTypes.has(TRAINING_DATA),
      marketing_opt_in: acceptedTypes.has(MARKETING),
      ...(input.priorCounseling ? { prior_counseling: input.priorCounseling } : {}),
    });
  }

  return (
    <Screen>
      <ScreenHeader
        // 첫 단계에서 뒤로 가면 로그인 화면으로 돌아간다 (가입 전이라 로그아웃된다)
        onBack={() => {
          if (step === 1) void authClient().signOut();
          else setStep(step === 3 ? 2 : 1);
        }}
        right={<CrisisButton label={COMMON.help} withIcon={false} muted />}
      />

      {step === 1 && <RoleStep role={role} onSelect={setRole} onNext={() => setStep(2)} />}
      {step === 2 && (
        <NicknameStep
          defaultValue={nickname}
          serverError={nicknameError}
          onNext={(value) => {
            setNickname(value);
            setNicknameError(null);
            setStep(3);
          }}
        />
      )}
      {step === 3 && role && (
        <TermsStep role={role} submitting={registration.isPending} onSubmit={submit} />
      )}
    </Screen>
  );
}
