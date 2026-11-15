import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';

import { confirmPayment, preparePayment, verifyIdentity } from '@/api/endpoints/payments';
import type { Session } from '@/api/endpoints/sessions';
import { isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { Screen } from '@/app/layouts/Screen';
import { CrisisButton } from '@/components/crisis/CrisisButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextField } from '@/components/ui/TextField';
import { CHECKOUT, MATCHES, PROVIDER } from '@/copy/client';
import { errorCopy } from '@/copy/errorMessages';
import { COMMON } from '@/copy/fixed';
import { track } from '@/lib/analytics';
import { formatKST, kstDateKey } from '@/lib/date';
import { useSessionFlowStore } from '@/stores/sessionFlowStore';
import { showToast } from '@/stores/uiStore';

import { useProviderName, useSession } from './queries';
import { type CheckoutForm, checkoutSchema } from './schemas';
import { sessionMinutes, trackLabel } from './sessions';

const MOCK_PROVIDER = 'mock';
const IDENTITY_FIELDS = ['name', 'birth', 'phone'] as const;

/** 서버가 모의 결제가 아닌 수단을 돌려줬을 때. 결제 위젯 연동 전이라 진행할 수 없다 */
class UnsupportedPaymentError extends Error {}

interface CheckoutProps {
  session: Session;
  sessionId: string;
}

function Checkout({ session, sessionId }: CheckoutProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const providerName = useProviderName(session.provider_id);
  const holdExpiresAt = useSessionFlowStore((state) => state.holdExpiresAt[sessionId]);
  // 결제 요청마다 멱등 키를 한 번만 만들어 재시도에도 같은 키를 쓴다 (TRD 17-7)
  const [keys] = useState(() => ({
    probe: crypto.randomUUID(),
    prepare: crypto.randomUUID(),
    confirm: crypto.randomUUID(),
  }));
  const [failed, setFailed] = useState(false);
  const paid = useRef(false);
  const waitingPayment = session.status === 'PENDING_PAYMENT';
  const providerPath = session.provider_id ? `/c/providers/${session.provider_id}` : '/c';

  // 주문을 먼저 만들어 본다. 본인인증을 한 적이 없으면 409 가 와서 인증 입력을 보여 준다 (PAY-02)
  const order = useQuery({
    queryKey: queryKeys.paymentOrder(sessionId),
    queryFn: () => preparePayment({ session_id: sessionId }, keys.probe),
    enabled: waitingPayment,
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
  });
  const needsIdentity = isApiError(order.error, 'INVALID_STATE');
  const holdExpired = isApiError(order.error, 'HOLD_EXPIRED') || session.status === 'CANCELLED';
  const orderFailed = order.isError && !needsIdentity && !holdExpired;

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { needsIdentity: false, name: '', birth: '', phone: '', refundAgreed: false },
  });

  useEffect(() => {
    setValue('needsIdentity', needsIdentity);
  }, [needsIdentity, setValue]);

  /** 홀드가 끝났다: 시간을 다시 고르게 상담사 화면으로 보낸다 (TRD C-06) */
  const expire = useCallback(() => {
    showToast(errorCopy('HOLD_EXPIRED').message, 'error');
    void queryClient.invalidateQueries({ queryKey: queryKeys.allSessions });
    navigate(providerPath, { replace: true });
  }, [navigate, providerPath, queryClient]);

  useEffect(() => {
    if (holdExpired) expire();
  }, [holdExpired, expire]);

  useEffect(() => {
    if (paid.current || waitingPayment || session.status === 'CANCELLED') return;
    showToast(CHECKOUT.alreadyConfirmed);
    navigate('/c/sessions', { replace: true });
  }, [waitingPayment, session.status, navigate]);

  const payment = useMutation({
    mutationFn: async (values: CheckoutForm) => {
      let prepared = order.data;
      if (!prepared) {
        await verifyIdentity({
          name: values.name.trim(),
          birth: values.birth,
          phone: values.phone.trim(),
        });
        prepared = await preparePayment({ session_id: sessionId }, keys.prepare);
        queryClient.setQueryData(queryKeys.paymentOrder(sessionId), prepared);
      }
      if (prepared.provider !== MOCK_PROVIDER || !prepared.order_id) {
        throw new UnsupportedPaymentError();
      }
      return confirmPayment({ order_id: prepared.order_id }, keys.confirm);
    },
    onSuccess: () => {
      paid.current = true;
      track('payment_succeeded');
      queryClient.setQueryData<Session>(queryKeys.session(sessionId), {
        ...session,
        status: 'CONFIRMED',
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.allSessions });
      showToast(CHECKOUT.confirmed, 'success');
      navigate('/c/sessions', { replace: true });
    },
    onError: (error) => {
      if (error instanceof UnsupportedPaymentError) {
        showToast(CHECKOUT.unsupported, 'error');
        return;
      }
      if (isApiError(error, 'HOLD_EXPIRED')) {
        expire();
        return;
      }
      const fields = isApiError(error, 'VALIDATION_ERROR') ? error.fields : {};
      const invalid = IDENTITY_FIELDS.filter((field) => fields[field]);
      invalid.forEach((field) => setError(field, { message: fields[field] }));
      // 그 밖의 실패는 예약을 그대로 두고 다시 시도하게 한다
      if (invalid.length === 0) setFailed(true);
    },
  });

  const minutes = sessionMinutes(session);
  const summary = [
    session.scheduled_start && formatKST(session.scheduled_start),
    minutes !== null && PROVIDER.duration(minutes),
    typeof order.data?.amount === 'number' && MATCHES.price(order.data.amount),
  ].filter(Boolean);

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => {
        setFailed(false);
        payment.mutate(values);
      })}
      className="flex grow flex-col"
    >
      <h1 className="pt-6.5 text-title-sm font-bold text-fg">{CHECKOUT.title}</h1>
      <p className="pt-4 text-body-sm text-fg-muted">
        {holdExpiresAt !== undefined && (
          <>
            {CHECKOUT.remaining}{' '}
            <CountdownTimer
              until={holdExpiresAt}
              emphasize
              onExpire={expire}
              className="font-bold"
            />
            {' · '}
          </>
        )}
        {CHECKOUT.holdNote}
      </p>

      <div className="mt-4 border-b border-line pb-3 pt-2.5 text-body-sm">
        <p className="font-bold text-fg">
          {[providerName, trackLabel(session)].filter(Boolean).join(' · ')}
        </p>
        <p className="pt-1 text-fg-muted">{summary.join(' · ')}</p>
      </div>

      {order.isLoading && <Skeleton lines={3} className="pt-6" />}
      {orderFailed && (
        <ErrorState
          title={COMMON.serverErrorTitle}
          description={errorCopy(isApiError(order.error) ? order.error.code : '').message}
          requestId={isApiError(order.error) ? order.error.requestId : undefined}
          onRetry={() => void order.refetch()}
        />
      )}

      {needsIdentity && (
        <fieldset className="flex flex-col gap-4 pt-4">
          <TextField
            label={CHECKOUT.nameLabel}
            autoComplete="name"
            error={errors.name?.message}
            {...register('name')}
          />
          <TextField
            label={CHECKOUT.birthLabel}
            type="date"
            max={kstDateKey(Date.now())}
            autoComplete="bday"
            error={errors.birth?.message}
            {...register('birth')}
          />
          <TextField
            label={CHECKOUT.phoneLabel}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={CHECKOUT.phonePlaceholder}
            error={errors.phone?.message}
            {...register('phone')}
          />
          <p className="text-micro text-fg-muted">{CHECKOUT.identityNotice}</p>
        </fieldset>
      )}
      {order.data && <p className="pt-4 text-micro text-fg-muted">{CHECKOUT.identityDone}</p>}

      <div className="pt-6 text-body-sm">
        <p className="font-bold text-fg">{CHECKOUT.methodTitle}</p>
        <p className="pt-1 text-fg-muted">{CHECKOUT.methodMock}</p>
      </div>

      <Checkbox className="pt-3" label={CHECKOUT.refundAgree} {...register('refundAgreed')} />
      <p className="text-micro text-fg-muted">{CHECKOUT.refundPolicy}</p>
      {errors.refundAgreed && (
        <p role="alert" className="pt-1 text-caption text-danger">
          {errors.refundAgreed.message}
        </p>
      )}
      {failed && (
        <p role="alert" className="pt-4 text-body-sm text-danger">
          {CHECKOUT.failed}
        </p>
      )}

      <div className="mt-auto pb-10 pt-8">
        <Button
          block
          type="submit"
          loading={payment.isPending}
          disabled={!waitingPayment || (!order.data && !needsIdentity)}
        >
          {CHECKOUT.submitMock}
        </Button>
      </div>
    </form>
  );
}

/** C-06 본인인증·결제 */
export function C06CheckoutPage() {
  const { sessionId = '' } = useParams();
  const session = useSession(sessionId);

  useEffect(() => {
    track('checkout_started');
  }, []);

  return (
    <Screen>
      <ScreenHeader right={<CrisisButton />} />
      {session.isPending && <Skeleton lines={6} className="pt-8" />}
      {session.isError && (
        <ErrorState
          title={COMMON.serverErrorTitle}
          description={errorCopy(isApiError(session.error) ? session.error.code : '').message}
          requestId={isApiError(session.error) ? session.error.requestId : undefined}
          onRetry={() => void session.refetch()}
        />
      )}
      {session.data && <Checkout session={session.data} sessionId={sessionId} />}
    </Screen>
  );
}
