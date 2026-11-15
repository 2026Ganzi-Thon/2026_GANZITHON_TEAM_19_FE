import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import {
  type CredentialQueuePage,
  type CredentialReview,
  decideCredential,
  getCredentialReview,
} from '@/api/endpoints/admin';
import { isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextArea } from '@/components/ui/TextArea';
import { ADMIN, ADMIN_CREDENTIALS } from '@/copy/admin';
import { errorCopy } from '@/copy/errorMessages';
import { COMMON } from '@/copy/fixed';
import { cx } from '@/lib/cx';
import { countChars } from '@/lib/text';
import { showToast } from '@/stores/uiStore';

type CredentialItem = NonNullable<CredentialReview['credentials']>[number];

const QUEUE_PATH = '/admin/credentials';
const REASON_MAX = 500;
const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const QUARTER_TURN = 90;
const FULL_TURN = 360;

/** AI 판독값·자동 검증 응답은 모양이 정해지지 않은 JSON 이라 문자열 값만 꺼낸다 */
function read(source: unknown, key: string): string {
  if (typeof source !== 'object' || source === null) return '';
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

type FileKind = 'pdf' | 'image' | 'inline';

/**
 * 서류 주소가 열어도 되는 형식인지 보고 종류를 정한다. http(s) 주소와 이미지 data 주소만 받는다.
 * 경로가 .pdf 로 끝나면 PDF 다 (Presigned URL 뒤에는 쿼리스트링이 붙는다).
 */
function fileKind(fileUrl: string | undefined): FileKind | null {
  if (!fileUrl) return null;
  if (fileUrl.startsWith('data:image/')) return 'inline';
  try {
    const parsed = new URL(fileUrl, window.location.origin);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed.pathname.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
  } catch {
    // 주소로 읽을 수 없으면 보여 주지 않는다
    return null;
  }
}

/** ① 서류 뷰어: 이미지는 확대·축소·회전, PDF 는 브라우저 보기 창. 주소는 5분 동안만 유효하다 */
function DocumentViewer({ fileUrl }: { fileUrl: string | undefined }) {
  const [zoom, setZoom] = useState(1);
  const [turn, setTurn] = useState(0);

  const kind = fileKind(fileUrl);
  if (!fileUrl || !kind) {
    return <p className="text-body-sm text-fg-muted">{ADMIN_CREDENTIALS.noFile}</p>;
  }
  if (kind === 'pdf') {
    return (
      <div className="flex flex-col gap-3">
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-caption font-bold text-fg underline"
        >
          {ADMIN_CREDENTIALS.openFile}
        </a>
        <iframe
          src={fileUrl}
          title={ADMIN_CREDENTIALS.document}
          className="h-96 w-full rounded-sm border border-line bg-surface"
        />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setZoom((value) => Math.min(ZOOM_MAX, value + ZOOM_STEP))}
        >
          {ADMIN_CREDENTIALS.zoomIn}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setZoom((value) => Math.max(ZOOM_MIN, value - ZOOM_STEP))}
        >
          {ADMIN_CREDENTIALS.zoomOut}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setTurn((value) => (value + QUARTER_TURN) % FULL_TURN)}
        >
          {ADMIN_CREDENTIALS.rotate}
        </Button>
        {kind === 'image' && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-caption font-bold text-fg underline"
          >
            {ADMIN_CREDENTIALS.openFile}
          </a>
        )}
      </div>
      <div className="h-96 overflow-auto rounded-sm border border-line bg-surface">
        <img
          src={fileUrl}
          alt={ADMIN_CREDENTIALS.document}
          className="origin-top-left"
          style={{ transform: `scale(${zoom}) rotate(${turn}deg)` }}
        />
      </div>
    </div>
  );
}

/** ② 입력값 · AI 판독값 · 자동 검증 응답을 나란히 본다. 서로 다른 칸은 강조한다 */
function CompareTable({ credential }: { credential: CredentialItem }) {
  const rows = [
    { label: ADMIN_CREDENTIALS.fieldCertName, key: 'cert_name', input: credential.cert_name },
    { label: ADMIN_CREDENTIALS.fieldCertNumber, key: 'cert_number', input: credential.cert_number },
    { label: ADMIN_CREDENTIALS.fieldIssuedOn, key: 'issued_on', input: credential.issued_on },
  ];
  const differs = (value: string, input: string | undefined) => value !== '' && value !== input;

  return (
    <table className="w-full border-collapse text-left text-body-sm">
      <caption className="pb-2 text-left font-bold text-fg">
        {ADMIN_CREDENTIALS.compareTitle}
      </caption>
      <thead>
        <tr className="border-b border-border-strong text-fg-muted">
          <th scope="col" className="px-2 py-2 font-medium">
            {ADMIN_CREDENTIALS.field}
          </th>
          <th scope="col" className="px-2 py-2 font-medium">
            {ADMIN_CREDENTIALS.input}
          </th>
          <th scope="col" className="px-2 py-2 font-medium">
            {ADMIN_CREDENTIALS.ocr}
          </th>
          <th scope="col" className="px-2 py-2 font-medium">
            {ADMIN_CREDENTIALS.verified}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const ocr = read(credential.ocr_result, row.key);
          const verified = read(credential.verify_raw, row.key);
          return (
            <tr key={row.key} className="border-b border-line">
              <th scope="row" className="px-2 py-2 font-medium text-fg">
                {row.label}
              </th>
              <td className="px-2 py-2 text-fg">{row.input}</td>
              <td
                className={cx(
                  'px-2 py-2',
                  differs(ocr, row.input) ? 'bg-danger-bg font-bold text-danger' : 'text-fg',
                )}
              >
                {ocr}
              </td>
              <td
                className={cx(
                  'px-2 py-2',
                  differs(verified, row.input) ? 'bg-danger-bg font-bold text-danger' : 'text-fg',
                )}
              >
                {verified}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** M-03 자격 심사 상세 (ADM-02, ADM-03) */
export function M03CredentialDetailPage() {
  const { id: userId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [goNext, setGoNext] = useState(true);
  const review = useQuery({
    queryKey: queryKeys.admin('credential-review', { userId }),
    queryFn: () => getCredentialReview(userId),
  });
  const data = review.data;

  /** 결정이 끝나면 대기열의 다음 신청으로 간다 (선택했을 때) */
  function leave() {
    const queue = queryClient.getQueryData<CredentialQueuePage>(queryKeys.admin('credentials', {}));
    const next = queue?.items?.find((item) => item.user_id && item.user_id !== userId);
    void queryClient.invalidateQueries({ queryKey: ['admin', 'credentials'] });
    navigate(goNext && next?.user_id ? `${QUEUE_PATH}/${next.user_id}` : QUEUE_PATH);
  }

  const decision = useMutation({
    mutationFn: (approve: boolean) =>
      decideCredential(
        userId,
        approve ? { decision: 'approve' } : { decision: 'reject', reason: reason.trim() },
      ),
    onSuccess: (_result, approve) => {
      showToast(approve ? ADMIN_CREDENTIALS.approved : ADMIN_CREDENTIALS.rejected, 'success');
      setRejecting(false);
      setReason('');
      leave();
    },
    onError: (error) => {
      showToast(errorCopy(isApiError(error) ? error.code : '').message, 'error');
    },
  });

  return (
    <>
      <Link to={QUEUE_PATH} className="text-body-sm font-bold text-fg underline">
        {ADMIN_CREDENTIALS.title}
      </Link>
      <h1 className="pt-4 text-title-sm font-bold text-fg">{ADMIN_CREDENTIALS.detailTitle}</h1>
      {review.isPending && <Skeleton lines={8} className="pt-6" />}
      {review.isError && (
        <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void review.refetch()} />
      )}

      {data && (
        <div className="flex flex-col gap-8 pt-6">
          <section className="text-body-sm">
            <p className="font-bold text-fg">
              {[data.profile?.display_name ?? data.nickname, data.role && ADMIN.role[data.role]]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <p className="pt-1 text-fg">
              {ADMIN_CREDENTIALS.realName(data.profile?.real_name ?? '')}
            </p>
            <p className="pt-1 text-micro text-fg-muted">{ADMIN_CREDENTIALS.realNameNotice}</p>
          </section>

          {(data.credentials ?? []).map((credential) => (
            <section
              key={credential.id}
              className="grid grid-cols-2 gap-8 border-t border-line pt-6"
            >
              <DocumentViewer fileUrl={credential.file_url} />
              <div className="flex flex-col gap-3">
                <CompareTable credential={credential} />
                <p className="text-body-sm text-fg-muted">
                  {[
                    `${ADMIN_CREDENTIALS.verifyResult}: ${ADMIN.verify[credential.verify_result ?? 'none']}`,
                    credential.user_corrected && ADMIN_CREDENTIALS.userCorrected,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </section>
          ))}

          <section className="flex flex-col gap-4 border-t border-line pt-6">
            <Checkbox
              checked={goNext}
              onChange={(event) => setGoNext(event.target.checked)}
              label={ADMIN_CREDENTIALS.goNext}
            />
            {rejecting && (
              <div className="flex max-w-xl flex-col gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {ADMIN_CREDENTIALS.rejectReasons.map((option) => (
                    <Chip
                      key={option}
                      selected={reason === option}
                      onClick={() => setReason(option)}
                    >
                      {option}
                    </Chip>
                  ))}
                </div>
                <TextArea
                  label={ADMIN_CREDENTIALS.rejectDetail}
                  rows={3}
                  maxLength={REASON_MAX}
                  length={countChars(reason)}
                  showCount
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button
                disabled={rejecting}
                loading={decision.isPending && decision.variables === true}
                onClick={() => decision.mutate(true)}
              >
                {ADMIN_CREDENTIALS.approve}
              </Button>
              {rejecting ? (
                <Button
                  variant="danger"
                  disabled={reason.trim().length === 0 || countChars(reason) > REASON_MAX}
                  loading={decision.isPending && decision.variables === false}
                  onClick={() => decision.mutate(false)}
                >
                  {ADMIN_CREDENTIALS.reject}
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setRejecting(true)}>
                  {ADMIN_CREDENTIALS.reject}
                </Button>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
