import { api, idempotencyHeader } from '@/api/client';
import type { Schema } from '@/api/types';

export type IdentityVerify = Schema<'IdentityVerifyRequest'>;
export type PaymentPrepared = Schema<'PaymentPrepareResponse'>;
export type PaymentConfirmed = Schema<'PaymentConfirmResponse'>;

/** PAY-01. 결제용 본인인증. 응답에 개인정보는 없다 */
export async function verifyIdentity(body: IdentityVerify): Promise<void> {
  await api.post('/identity/verify', body);
}

/** PAY-02. 주문을 만든다. 본인인증 전이면 409, 홀드가 끝났으면 410 */
export async function preparePayment(
  body: Schema<'PaymentPrepareRequest'>,
  idempotencyKey: string,
): Promise<PaymentPrepared> {
  const { data } = await api.post<PaymentPrepared>('/payments/prepare', body, {
    headers: idempotencyHeader(idempotencyKey),
  });
  return data;
}

/** PAY-03. 결제를 확정한다. 성공하면 세션이 예약 확정이 된다 */
export async function confirmPayment(
  body: Schema<'PaymentConfirmRequest'>,
  idempotencyKey: string,
): Promise<PaymentConfirmed> {
  const { data } = await api.post<PaymentConfirmed>('/payments/confirm', body, {
    headers: idempotencyHeader(idempotencyKey),
  });
  return data;
}
