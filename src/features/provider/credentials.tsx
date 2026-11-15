import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type Credential, listCredentials, submitCredentials } from '@/api/endpoints/credentials';
import { isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { errorCopy } from '@/copy/errorMessages';
import { COMMON } from '@/copy/fixed';
import { CREDENTIALS } from '@/copy/provider';
import { cx } from '@/lib/cx';
import { formatKST } from '@/lib/date';
import { refreshSession } from '@/lib/session';
import { showToast } from '@/stores/uiStore';

const STALE_MS = 30_000;
export const UPLOAD_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export function toastApiError(error: unknown): void {
  showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
}

/** CRD-03 내가 등록한 서류·자격 */
export function useCredentials() {
  return useQuery({
    queryKey: queryKeys.credentials,
    queryFn: listCredentials,
    staleTime: STALE_MS,
  });
}

/** 제출 → 심사 중 → 결과. 지금 단계까지 진하게 보인다 */
function StatusTimeline({ status }: { status: Credential['status'] }) {
  const reached = status === 'draft' || !status ? 0 : status === 'submitted' ? 2 : 3;
  return (
    <ol className="flex gap-2 pt-2 text-micro">
      {CREDENTIALS.timeline.map((label, index) => (
        <li
          key={label}
          aria-current={index + 1 === reached ? 'step' : undefined}
          className={cx(
            'rounded-md px-2 py-1',
            index < reached ? 'bg-brand-yellow font-bold text-fg' : 'bg-chip text-fg-muted',
          )}
        >
          {label}
        </li>
      ))}
    </ol>
  );
}

function CredentialItem({ credential }: { credential: Credential }) {
  const status = credential.status ?? 'draft';
  const facts = [
    credential.kind && CREDENTIALS.kinds[credential.kind],
    credential.issued_on && formatKST(credential.issued_on, 'YYYY년 M월 D일'),
    CREDENTIALS.status[status],
    credential.user_corrected && CREDENTIALS.corrected,
  ].filter(Boolean);

  return (
    <li className="border-b border-line pb-3 pt-2.5 text-body-sm">
      <p className="font-bold text-fg">{credential.cert_name}</p>
      <p className="pt-1 text-fg-muted">{facts.join(' · ')}</p>
      {credential.verify_result && credential.verify_result !== 'none' && (
        <p className="pt-1 text-fg-muted">
          {CREDENTIALS.verifyResult(CREDENTIALS.verify[credential.verify_result])}
        </p>
      )}
      <StatusTimeline status={credential.status} />
      {status === 'rejected' && credential.reject_reason && (
        <p role="status" className="pt-2 text-caption text-danger">
          {CREDENTIALS.rejectReason(credential.reject_reason)}
        </p>
      )}
    </li>
  );
}

/** 등록한 서류 목록과 심사 요청 (CRD-03, CRD-04). 수련생·전문가 화면이 함께 쓴다 */
export function CredentialList() {
  const queryClient = useQueryClient();
  const credentials = useCredentials();
  const items = credentials.data ?? [];
  const hasDraft = items.some((item) => item.status === 'draft' || item.status === 'rejected');
  const rejected = items.some((item) => item.status === 'rejected');

  const submission = useMutation({
    mutationFn: submitCredentials,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.credentials }),
        refreshSession(queryClient),
      ]);
      showToast(CREDENTIALS.submitted, 'success');
    },
    onError: toastApiError,
  });

  return (
    <section aria-labelledby="credential-list" className="pt-8">
      <h2 id="credential-list" className="text-body-sm font-bold text-fg">
        {CREDENTIALS.listTitle}
      </h2>
      {credentials.isPending && <Skeleton lines={3} className="pt-4" />}
      {credentials.isError && (
        <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void credentials.refetch()} />
      )}
      {credentials.data && items.length === 0 && (
        <p className="pt-3 text-body-sm text-fg-muted">{CREDENTIALS.empty}</p>
      )}
      <ul>
        {items.map((item) => (
          <CredentialItem key={item.id} credential={item} />
        ))}
      </ul>
      <div className="pb-10 pt-6">
        <Button
          block
          disabled={!hasDraft}
          loading={submission.isPending}
          onClick={() => submission.mutate()}
        >
          {rejected ? CREDENTIALS.resubmit : CREDENTIALS.submit}
        </Button>
      </div>
    </section>
  );
}
