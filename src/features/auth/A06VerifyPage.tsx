import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';

import { verifyCertificate } from '@/api/endpoints/certificates';
import { Screen } from '@/app/layouts/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { VERIFY } from '@/copy/account';
import { SERVICE } from '@/copy/fixed';
import { cx } from '@/lib/cx';
import { formatKST } from '@/lib/date';

/** A-06 증빙서 진위 확인. 로그인 없이 볼 수 있다 */
export function A06VerifyPage() {
  const { code = '' } = useParams();
  const certificate = useQuery({
    queryKey: ['certificate-verify', code],
    queryFn: () => verifyCertificate(code),
    retry: false,
  });
  const data = certificate.data;

  return (
    <Screen>
      <ScreenHeader title={SERVICE.name} />
      <h1 className="pt-6.5 text-title-sm font-bold text-fg">{VERIFY.title}</h1>
      {certificate.isPending && <Skeleton lines={5} className="pt-6" />}
      {/* 없는 코드와 조회 실패를 가리지 않고 같은 안내를 준다 */}
      {certificate.isError && <ErrorState title={VERIFY.notFound} />}

      {data && (
        <>
          <p
            className={cx(
              'mt-6 self-start rounded-md px-3 py-1.5 text-body-sm font-bold',
              data.valid ? 'bg-success-bg text-fg' : 'bg-danger-bg text-danger',
            )}
          >
            {data.valid ? VERIFY.valid : VERIFY.invalid}
          </p>
          <dl className="pt-4 text-body-sm">
            <div className="border-b border-line pb-3 pt-2.5">
              <dt className="font-bold text-fg">{VERIFY.code}</dt>
              <dd className="pt-1 text-fg-muted">{code}</dd>
            </div>
            <div className="border-b border-line pb-3 pt-2.5">
              <dt className="font-bold text-fg">{VERIFY.trainee}</dt>
              <dd className="pt-1 text-fg-muted">{data.trainee_name_masked}</dd>
            </div>
            <div className="border-b border-line pb-3 pt-2.5">
              <dt className="font-bold text-fg">{VERIFY.issuedAt}</dt>
              <dd className="pt-1 text-fg-muted">{formatKST(data.issued_at, 'YYYY년 M월 D일')}</dd>
            </div>
            <div className="border-b border-line pb-3 pt-2.5">
              <dt className="font-bold text-fg">{VERIFY.record}</dt>
              <dd className="pt-1 text-fg-muted">
                {[
                  VERIFY.hours(data.hours),
                  VERIFY.sessions(data.session_count),
                  VERIFY.supervisions(data.supervision_count),
                ].join(' · ')}
              </dd>
            </div>
          </dl>
        </>
      )}
    </Screen>
  );
}
