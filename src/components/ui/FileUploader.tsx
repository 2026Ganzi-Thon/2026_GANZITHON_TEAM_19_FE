import { type ChangeEvent, useId, useState } from 'react';

import { requestUploadUrl } from '@/api/endpoints/credentials';
import { COMMON } from '@/copy/fixed';
import { UPLOAD } from '@/copy/provider';
import { putFile } from '@/lib/upload';

const PERCENT = 100;

interface FileUploaderProps {
  label: string;
  /** 허용하는 MIME 형식 */
  accept: readonly string[];
  maxBytes: number;
  /** 올리기가 끝나면 서버가 준 파일 키를 넘긴다 */
  onUploaded: (fileKey: string, fileName: string) => void;
}

type UploadState =
  | { phase: 'idle' }
  | { phase: 'uploading'; ratio: number }
  | { phase: 'done'; fileName: string }
  | { phase: 'error'; message: string; file?: File };

/** 증빙 파일 올리기 (TRD 18-1): 형식·크기를 먼저 보고, 받은 주소로 바로 올리며 진행률을 보여 준다. */
export function FileUploader({ label, accept, maxBytes, onUploaded }: FileUploaderProps) {
  const inputId = useId();
  const [state, setState] = useState<UploadState>({ phase: 'idle' });

  async function upload(file: File) {
    // 형식·크기가 맞지 않으면 올리기 전에 막는다
    if (!accept.includes(file.type)) {
      setState({ phase: 'error', message: UPLOAD.wrongType });
      return;
    }
    if (file.size > maxBytes) {
      setState({ phase: 'error', message: UPLOAD.tooLarge });
      return;
    }
    setState({ phase: 'uploading', ratio: 0 });
    try {
      const target = await requestUploadUrl({ content_type: file.type, size: file.size });
      if (!target.upload_url || !target.file_key) throw new Error('no upload url');
      await putFile(target.upload_url, file, (ratio) => setState({ phase: 'uploading', ratio }));
      setState({ phase: 'done', fileName: file.name });
      onUploaded(target.file_key, file.name);
    } catch {
      // 올리기 실패는 같은 파일로 다시 시도할 수 있게 둔다
      setState({ phase: 'error', message: UPLOAD.failed, file });
    }
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void upload(file);
  }

  const retryFile = state.phase === 'error' ? state.file : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-body-sm font-bold text-fg">
        {label}
      </label>
      <p className="text-micro text-fg-muted">{UPLOAD.rule}</p>
      <input
        id={inputId}
        type="file"
        accept={accept.join(',')}
        disabled={state.phase === 'uploading'}
        onChange={onChange}
        className="min-h-(--size-touch) w-full rounded-sm border border-border bg-field px-3 py-2.5 text-body-sm text-fg file:mr-3 file:border-0 file:bg-transparent file:font-bold file:text-fg"
      />
      {state.phase === 'uploading' && (
        <p role="status" className="text-caption text-fg-muted">
          {UPLOAD.progress(Math.round(state.ratio * PERCENT))}
        </p>
      )}
      {state.phase === 'done' && (
        <p role="status" className="text-caption text-fg">
          {UPLOAD.done(state.fileName)}
        </p>
      )}
      {state.phase === 'error' && (
        <p role="alert" className="flex items-center gap-3 text-caption text-danger">
          {state.message}
          {retryFile && (
            <button
              type="button"
              onClick={() => void upload(retryFile)}
              className="min-h-(--size-touch) font-bold text-fg underline"
            >
              {COMMON.retry}
            </button>
          )}
        </p>
      )}
    </div>
  );
}
