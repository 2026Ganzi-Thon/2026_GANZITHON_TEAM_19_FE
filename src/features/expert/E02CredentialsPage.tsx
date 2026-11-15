import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { type Credential, createCredential, updateCredential } from '@/api/endpoints/credentials';
import { isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { Screen } from '@/app/layouts/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { FileUploader } from '@/components/ui/FileUploader';
import { TextField } from '@/components/ui/TextField';
import { errorCopy } from '@/copy/errorMessages';
import { CREDENTIALS } from '@/copy/provider';
import {
  CredentialList,
  toastApiError,
  UPLOAD_MAX_BYTES,
  UPLOAD_TYPES,
} from '@/features/provider/credentials';
import { kstDateKey } from '@/lib/date';
import { showToast } from '@/stores/uiStore';

type Tab = 'national' | 'society';

const NAME_MAX = 100;
const NUMBER_MAX = 50;

/** 탭 1 국가자격: 자격 종류·번호·취득일을 넣고 진위 확인과 함께 등록한다 (CRD-02 verify) */
function NationalForm() {
  const queryClient = useQueryClient();
  const [certName, setCertName] = useState<string>(CREDENTIALS.nationalCerts[0]);
  const [certNumber, setCertNumber] = useState('');
  const [issuedOn, setIssuedOn] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const verification = useMutation({
    mutationFn: () =>
      createCredential({
        kind: 'national',
        cert_name: certName,
        cert_number: certNumber.trim(),
        issued_on: issuedOn,
        verify: true,
      }),
    onSuccess: (credential) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.credentials });
      setMessage(CREDENTIALS.verifyResult(CREDENTIALS.verify[credential.verify_result ?? 'none']));
      setCertNumber('');
    },
    onError: (error) => {
      // 불일치(422)와 확인 서비스 장애(503)는 안내 문구를 입력란 아래에 보여 준다
      const code = isApiError(error) ? error.code : '';
      const hint = code === 'VERIFIER_UNAVAILABLE' ? ` ${CREDENTIALS.uploadInstead}` : '';
      setMessage(`${errorCopy(code).message}${hint}`);
    },
  });

  return (
    <div className="flex flex-col gap-4 pt-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="national-cert" className="text-body-sm font-bold text-fg">
          {CREDENTIALS.certName}
        </label>
        <select
          id="national-cert"
          value={certName}
          onChange={(event) => setCertName(event.target.value)}
          className="min-h-(--size-touch) rounded-sm border border-border bg-field px-3 text-input text-fg"
        >
          {CREDENTIALS.nationalCerts.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <TextField
        label={CREDENTIALS.certNumber}
        maxLength={NUMBER_MAX}
        autoComplete="off"
        value={certNumber}
        onChange={(event) => setCertNumber(event.target.value)}
      />
      <TextField
        label={CREDENTIALS.issuedOn}
        type="date"
        max={kstDateKey(Date.now())}
        value={issuedOn}
        onChange={(event) => setIssuedOn(event.target.value)}
      />
      <Button
        block
        variant="secondary"
        disabled={certNumber.trim().length === 0 || issuedOn === ''}
        loading={verification.isPending}
        onClick={() => verification.mutate()}
      >
        {CREDENTIALS.verifyButton}
      </Button>
      {message && (
        <p role="status" className="text-body-sm text-fg">
          {message}
        </p>
      )}
      <p className="text-micro text-fg-muted">{CREDENTIALS.finalApprovalNotice}</p>
    </div>
  );
}

/** AI 판독 결과를 보여 주고 틀린 값을 고치게 한다 (CRD-05) */
function OcrReview({ credential }: { credential: Credential }) {
  const queryClient = useQueryClient();
  const [certName, setCertName] = useState(credential.cert_name ?? '');
  const [certNumber, setCertNumber] = useState('');
  const [issuedOn, setIssuedOn] = useState(credential.issued_on ?? '');

  const correction = useMutation({
    mutationFn: () =>
      updateCredential(credential.id ?? '', {
        cert_name: certName.trim() || undefined,
        cert_number: certNumber.trim() || undefined,
        issued_on: issuedOn || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.credentials });
      showToast(CREDENTIALS.ocrSaved, 'success');
    },
    onError: toastApiError,
  });

  return (
    <section
      aria-labelledby="ocr-title"
      className="flex flex-col gap-4 rounded-sm bg-highlight p-4"
    >
      <div>
        <h2 id="ocr-title" className="text-body-sm font-bold text-fg">
          {CREDENTIALS.ocrTitle}
        </h2>
        <p className="pt-1 text-micro text-fg-muted">{CREDENTIALS.ocrHint}</p>
      </div>
      <TextField
        label={CREDENTIALS.societyName}
        maxLength={NAME_MAX}
        value={certName}
        onChange={(event) => setCertName(event.target.value)}
      />
      <TextField
        label={CREDENTIALS.certNumber}
        maxLength={NUMBER_MAX}
        placeholder={credential.cert_number_masked}
        value={certNumber}
        onChange={(event) => setCertNumber(event.target.value)}
      />
      <TextField
        label={CREDENTIALS.issuedOn}
        type="date"
        value={issuedOn}
        onChange={(event) => setIssuedOn(event.target.value)}
      />
      <Button
        size="md"
        variant="secondary"
        loading={correction.isPending}
        onClick={() => correction.mutate()}
      >
        {CREDENTIALS.ocrSave}
      </Button>
    </section>
  );
}

/** 탭 2 학회자격: 증명서를 올리면 AI 가 판독한다 (CRD-01 → CRD-02) */
function SocietyForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [fileKey, setFileKey] = useState<string | null>(null);
  const [created, setCreated] = useState<Credential | null>(null);

  const registration = useMutation({
    mutationFn: (key: string) =>
      createCredential({ kind: 'society', cert_name: name.trim(), file_key: key }),
    onSuccess: (credential) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.credentials });
      showToast(CREDENTIALS.added, 'success');
      setCreated(credential);
      setFileKey(null);
    },
    onError: toastApiError,
  });

  return (
    <div className="flex flex-col gap-6 pt-6">
      <TextField
        label={CREDENTIALS.societyName}
        maxLength={NAME_MAX}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <FileUploader
        key={created?.id ?? 'new'}
        label={CREDENTIALS.fileLabel}
        accept={UPLOAD_TYPES}
        maxBytes={UPLOAD_MAX_BYTES}
        onUploaded={setFileKey}
      />
      <Button
        block
        variant="secondary"
        disabled={!fileKey || name.trim().length === 0}
        loading={registration.isPending}
        onClick={() => fileKey && registration.mutate(fileKey)}
      >
        {CREDENTIALS.add}
      </Button>
      {created && <OcrReview key={created.id} credential={created} />}
    </div>
  );
}

/** E-02 자격 등록·검증 상태 */
export function E02CredentialsPage() {
  const [tab, setTab] = useState<Tab>('national');

  return (
    <Screen>
      <ScreenHeader />
      <h1 className="pt-6.5 text-title-sm font-bold text-fg">{CREDENTIALS.expertTitle}</h1>
      <div role="group" aria-label={CREDENTIALS.tabsLabel} className="flex gap-1.5 pt-4">
        <Chip selected={tab === 'national'} onClick={() => setTab('national')}>
          {CREDENTIALS.tabNational}
        </Chip>
        <Chip selected={tab === 'society'} onClick={() => setTab('society')}>
          {CREDENTIALS.tabSociety}
        </Chip>
      </div>
      {tab === 'national' ? <NationalForm /> : <SocietyForm />}
      <CredentialList />
    </Screen>
  );
}
