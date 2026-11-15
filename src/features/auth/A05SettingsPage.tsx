import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { updateNickname, withdraw } from '@/api/endpoints/me';
import { isApiError } from '@/api/errors';
import type { Role } from '@/api/types';
import { Screen } from '@/app/layouts/Screen';
import { CrisisButton } from '@/components/crisis/CrisisButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/ListRow';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import { SETTINGS } from '@/copy/account';
import { errorCopy } from '@/copy/errorMessages';
import { COMMON } from '@/copy/fixed';
import { type FeatureFlag, useFeatureFlag } from '@/hooks/useAppConfig';
import { authClient } from '@/lib/auth';
import { enablePush, type PushResult } from '@/lib/push';
import { refreshSession } from '@/lib/session';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/stores/uiStore';

import { type NicknameForm, nicknameSchema } from './schemas';

interface MenuLink {
  to: string;
  title: string;
  flag?: FeatureFlag;
}

const MENU: Record<Role, readonly MenuLink[]> = {
  client: [{ to: '/c/consents', title: SETTINGS.consents }],
  trainee: [
    { to: '/t/profile', title: SETTINGS.profile },
    { to: '/t/credentials', title: SETTINGS.traineeCredentials },
    { to: '/t/availability', title: SETTINGS.availability },
    { to: '/t/growth', title: SETTINGS.growth, flag: 'p1_certificates' },
    {
      to: '/t/supervision-requests',
      title: SETTINGS.supervisionRequests,
      flag: 'p1_supervision_requests',
    },
    { to: '/t/settlements', title: SETTINGS.settlements },
  ],
  expert: [
    { to: '/e/profile', title: SETTINGS.profile },
    { to: '/e/credentials', title: SETTINGS.expertCredentials },
    { to: '/e/availability', title: SETTINGS.availability },
    { to: '/e/settlements', title: SETTINGS.settlements },
  ],
  admin: [],
};

function MenuRow({ link }: { link: MenuLink }) {
  // 꺼진 기능은 메뉴에서 숨긴다 (TRD 17-8). 플래그가 없는 항목은 언제나 보인다
  const enabled = useFeatureFlag(link.flag ?? 'p1_complaints');
  if (link.flag && !enabled) return null;
  return <ListRow to={link.to} title={link.title} />;
}

function NicknameSection({ nickname }: { nickname: string }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<NicknameForm>({
    resolver: zodResolver(nicknameSchema),
    defaultValues: { nickname },
  });

  const change = useMutation({
    mutationFn: (values: NicknameForm) => updateNickname(values),
    onSuccess: async () => {
      await refreshSession(queryClient);
      showToast(SETTINGS.nicknameSaved, 'success');
    },
    onError: (error) => {
      if (isApiError(error, 'NICKNAME_TAKEN')) {
        setError('nickname', { message: errorCopy(error.code).message });
      } else {
        showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
      }
    },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => change.mutate(values))}
      className="flex flex-col gap-3 border-b border-line pb-6 pt-6"
    >
      <TextField
        label={SETTINGS.nicknameLabel}
        autoComplete="off"
        maxLength={12}
        error={errors.nickname?.message}
        {...register('nickname')}
      />
      <Button
        type="submit"
        size="md"
        variant="secondary"
        disabled={!isDirty}
        loading={change.isPending}
      >
        {SETTINGS.nicknameSave}
      </Button>
    </form>
  );
}

function PushSection() {
  const [result, setResult] = useState<PushResult | null>(null);
  const push = useMutation({
    mutationFn: enablePush,
    onSuccess: setResult,
    onError: () => setResult('unavailable'),
  });

  return (
    <section className="border-b border-line pb-6 pt-6">
      <h2 className="text-body-sm font-bold text-fg">{SETTINGS.pushTitle}</h2>
      <p className="pt-1 text-body-sm text-fg-muted">{SETTINGS.pushDescription}</p>
      <p className="pt-1 text-micro text-fg-muted">{SETTINGS.pushIosNotice}</p>
      <Button
        size="md"
        variant="secondary"
        className="mt-3"
        loading={push.isPending}
        onClick={() => push.mutate()}
      >
        {SETTINGS.pushEnable}
      </Button>
      {result && (
        <p role="status" className="pt-2 text-caption text-fg">
          {SETTINGS.pushResult[result]}
        </p>
      )}
    </section>
  );
}

/** A-05 설정 */
export function A05SettingsPage() {
  const me = useAuthStore((state) => state.me);
  const [confirming, setConfirming] = useState(false);

  const withdrawal = useMutation({
    mutationFn: withdraw,
    onSuccess: async () => {
      showToast(SETTINGS.withdrawn, 'success');
      await authClient().signOut();
    },
    onError: (error) => {
      // 예정되거나 진행 중인 상담이 있으면 탈퇴할 수 없다 (409 ACTIVE_SESSIONS_EXIST)
      showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
      setConfirming(false);
    },
  });

  return (
    <Screen>
      <ScreenHeader hideBack right={me?.role === 'client' ? <CrisisButton /> : undefined} />
      <h1 className="pt-6.5 text-title-sm font-bold text-fg">{SETTINGS.title}</h1>
      {/* 닉네임이 바뀌면 입력란의 기본값도 새 값으로 다시 잡는다 */}
      <NicknameSection key={me?.nickname} nickname={me?.nickname ?? ''} />

      {me?.role && MENU[me.role].length > 0 && (
        <nav aria-label={SETTINGS.menuTitle}>
          {MENU[me.role].map((link) => (
            <MenuRow key={link.to} link={link} />
          ))}
        </nav>
      )}

      <PushSection />

      <div className="flex flex-col gap-2 pb-10 pt-6">
        <Button block variant="secondary" onClick={() => void authClient().signOut()}>
          {SETTINGS.logout}
        </Button>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="min-h-(--size-touch) self-center text-caption text-fg-muted underline"
        >
          {SETTINGS.withdraw}
        </button>
      </div>

      <Modal
        open={confirming}
        title={SETTINGS.withdrawTitle}
        onClose={() => setConfirming(false)}
        footer={
          <>
            <Button block size="md" variant="secondary" onClick={() => setConfirming(false)}>
              {COMMON.cancel}
            </Button>
            <Button
              block
              size="md"
              variant="danger"
              loading={withdrawal.isPending}
              onClick={() => withdrawal.mutate()}
            >
              {SETTINGS.withdrawConfirm}
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-fg-muted">{SETTINGS.withdrawBody}</p>
      </Modal>
    </Screen>
  );
}
