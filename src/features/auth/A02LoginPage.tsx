import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useSearchParams } from 'react-router';

import { roleHome, safeNextPath } from '@/app/access';
import { Screen } from '@/app/layouts/Screen';
import { CrisisButton } from '@/components/crisis/CrisisButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { authErrorMessage } from '@/copy/errorMessages';
import { COMMON, NOTICE } from '@/copy/fixed';
import { LOGIN } from '@/copy/screens';
import { authClient, authErrorCode } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/stores/uiStore';

import { type Credentials, credentialsSchema } from './schemas';

type Tab = 'login' | 'signup';

/** A-02 로그인·가입 */
export function A02LoginPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(searchParams.get('tab') === 'signup' ? 'signup' : 'login');
  const [googlePending, setGooglePending] = useState(false);
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.me?.role);
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>({ resolver: zodResolver(credentialsSchema) });

  // 로그인되면 GET /v1/me 결과에 따라 온보딩 또는 역할 홈으로 간다
  if (status === 'unregistered') return <Navigate to="/onboarding" replace />;
  if (status === 'ready') {
    return <Navigate to={safeNextPath(searchParams.get('next')) ?? roleHome(role)} replace />;
  }

  function showAuthError(error: unknown) {
    const message = authErrorMessage(authErrorCode(error));
    if (message) setError('root', { message });
  }

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      if (tab === 'login') await authClient().signInWithEmail(email, password);
      else await authClient().signUpWithEmail(email, password);
    } catch (error) {
      showAuthError(error);
    }
  });

  async function onGoogle() {
    setGooglePending(true);
    try {
      await authClient().signInWithGoogle();
    } catch (error) {
      showAuthError(error);
    } finally {
      setGooglePending(false);
    }
  }

  async function onResetPassword() {
    if (!(await trigger('email'))) return;
    try {
      await authClient().sendPasswordReset(getValues('email'));
      showToast(LOGIN.resetSent, 'success');
    } catch (error) {
      showAuthError(error);
    }
  }

  return (
    <Screen>
      <ScreenHeader
        backTo="/"
        right={<CrisisButton label={COMMON.help} withIcon={false} muted />}
      />

      <form noValidate onSubmit={onSubmit} className="flex grow flex-col gap-4 pt-6">
        <h1 className="text-title-sm font-bold text-fg">
          {tab === 'login' ? LOGIN.titleLogin : LOGIN.titleSignup}
        </h1>
        <p className="text-body-sm text-fg-muted">{NOTICE.emailPrivate}</p>

        <div
          role="group"
          aria-label={`${LOGIN.tabLogin} / ${LOGIN.tabSignup}`}
          className="flex gap-1.5"
        >
          <Chip selected={tab === 'login'} onClick={() => setTab('login')}>
            {LOGIN.tabLogin}
          </Chip>
          <Chip selected={tab === 'signup'} onClick={() => setTab('signup')}>
            {LOGIN.tabSignup}
          </Chip>
        </div>

        <Button
          block
          size="md"
          variant="secondary"
          className="border-border-strong"
          loading={googlePending}
          onClick={onGoogle}
        >
          {LOGIN.google}
        </Button>

        <TextField
          label={LOGIN.email}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={LOGIN.emailPlaceholder}
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label={LOGIN.password}
          hint={LOGIN.passwordHint}
          type="password"
          autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
          placeholder={LOGIN.passwordPlaceholder}
          error={errors.password?.message}
          {...register('password')}
        />

        {errors.root?.message && (
          <p role="alert" className="text-caption text-danger">
            {errors.root.message}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-3 pb-10 pt-6">
          <Button block type="submit" loading={isSubmitting}>
            {tab === 'login' ? LOGIN.submitLogin : LOGIN.submitSignup}
          </Button>
          <p className="text-micro text-fg-muted">
            {LOGIN.forgot}
            {' · '}
            <button type="button" onClick={onResetPassword} className="font-bold underline">
              {LOGIN.reset}
            </button>
          </p>
        </div>
      </form>
    </Screen>
  );
}
