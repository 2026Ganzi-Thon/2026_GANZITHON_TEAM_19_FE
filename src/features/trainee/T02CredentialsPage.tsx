import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { type CredentialCreate, createCredential } from '@/api/endpoints/credentials';
import { queryKeys } from '@/api/queryKeys';
import { Screen } from '@/app/layouts/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { FileUploader } from '@/components/ui/FileUploader';
import { TextField } from '@/components/ui/TextField';
import { CREDENTIALS } from '@/copy/provider';
import {
  CredentialList,
  toastApiError,
  UPLOAD_MAX_BYTES,
  UPLOAD_TYPES,
} from '@/features/provider/credentials';
import { showToast } from '@/stores/uiStore';

type TraineeKind = Extract<CredentialCreate['kind'], 'enrollment' | 'completion'>;

const KINDS: readonly TraineeKind[] = ['enrollment', 'completion'];
const NAME_MAX = 100;

/** T-02 재학·수료 서류 제출·심사 상태 */
export function T02CredentialsPage() {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<TraineeKind>('enrollment');
  const [name, setName] = useState('');
  const [fileKey, setFileKey] = useState<string | null>(null);
  // 등록이 끝나면 파일 입력을 비운다
  const [formVersion, setFormVersion] = useState(0);

  const registration = useMutation({
    mutationFn: (key: string) => createCredential({ kind, cert_name: name.trim(), file_key: key }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.credentials });
      showToast(CREDENTIALS.added, 'success');
      setName('');
      setFileKey(null);
      setFormVersion((version) => version + 1);
    },
    onError: toastApiError,
  });

  return (
    <Screen>
      <ScreenHeader />
      <h1 className="pt-6.5 text-title-sm font-bold text-fg">{CREDENTIALS.traineeTitle}</h1>

      <fieldset className="pt-6">
        <legend className="text-body-sm font-bold text-fg">{CREDENTIALS.kindLabel}</legend>
        <div className="flex flex-wrap gap-1.5 pt-3">
          {KINDS.map((option) => (
            <Chip key={option} selected={kind === option} onClick={() => setKind(option)}>
              {CREDENTIALS.kinds[option]}
            </Chip>
          ))}
        </div>
      </fieldset>

      <TextField
        className="pt-6"
        label={CREDENTIALS.schoolCourse}
        placeholder={CREDENTIALS.schoolCoursePlaceholder}
        maxLength={NAME_MAX}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <div className="pt-6">
        <FileUploader
          key={formVersion}
          label={CREDENTIALS.fileLabel}
          accept={UPLOAD_TYPES}
          maxBytes={UPLOAD_MAX_BYTES}
          onUploaded={setFileKey}
        />
      </div>
      <Button
        block
        variant="secondary"
        className="mt-6"
        disabled={!fileKey || name.trim().length === 0}
        loading={registration.isPending}
        onClick={() => fileKey && registration.mutate(fileKey)}
      >
        {CREDENTIALS.add}
      </Button>

      <CredentialList />
    </Screen>
  );
}
