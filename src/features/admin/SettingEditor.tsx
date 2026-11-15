import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';

import { type Setting, updateSetting } from '@/api/endpoints/admin';
import { queryKeys } from '@/api/queryKeys';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import { ADMIN_SETTINGS } from '@/copy/admin';
import { COMMON } from '@/copy/fixed';
import { formatKST } from '@/lib/date';
import { showToast } from '@/stores/uiStore';

import {
  hasInvalidNumber,
  isFieldMap,
  isPrimitive,
  type ParsedValue,
  parseJson,
  type Primitive,
  sameValue,
  settingMode,
} from './settingValue';
import { toastApiError } from './toastError';

const INDENT = 2;
const MAX_ROWS = 12;
const REASON_MAX = 500;
const IMMEDIATE_KEYS: readonly string[] = ADMIN_SETTINGS.immediateKeys;

interface ValueFieldProps {
  label: string;
  value: Primitive;
  onChange: (value: Primitive) => void;
}

/** 값의 종류에 맞는 입력란: 켜기·끄기, 숫자, 글 */
function ValueField({ label, value, onChange }: ValueFieldProps) {
  if (typeof value === 'boolean') {
    return (
      <Checkbox
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
        label={label}
      />
    );
  }
  if (typeof value === 'number') {
    return (
      <TextField
        label={label}
        type="number"
        step="any"
        value={Number.isNaN(value) ? '' : value}
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
    );
  }
  return (
    <TextField label={label} value={value} onChange={(event) => onChange(event.target.value)} />
  );
}

/** 설정 하나를 고치고 저장한다 (ADM-07) */
export function SettingEditor({ setting }: { setting: Setting }) {
  const queryClient = useQueryClient();
  const titleId = useId();
  const key = setting.key ?? '';
  const initial: unknown = setting.value ?? null;
  const mode = settingMode(initial);
  const [draft, setDraft] = useState<unknown>(initial);
  const [text, setText] = useState(() => JSON.stringify(initial, null, INDENT));
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);

  const fromFields: ParsedValue = hasInvalidNumber(draft)
    ? { ok: false }
    : { ok: true, value: draft };
  const next = mode === 'json' ? parseJson(text) : fromFields;
  const changed = next.ok && !sameValue(next.value, initial);

  const save = useMutation({
    mutationFn: (value: unknown) => updateSetting(key, value, reason.trim()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      // 기능 플래그와 점검 모드는 화면에 바로 반영되게 한다 (TRD 공통 7-8)
      void queryClient.invalidateQueries({ queryKey: queryKeys.appConfig });
      showToast(ADMIN_SETTINGS.saved, 'success');
      setReason('');
      setConfirming(false);
    },
    onError: (error) => {
      toastApiError(error);
      setConfirming(false);
    },
  });

  function submit() {
    if (!next.ok) return;
    if (IMMEDIATE_KEYS.includes(key)) setConfirming(true);
    else save.mutate(next.value);
  }

  return (
    <li className="flex max-w-2xl flex-col gap-3 border-b border-line py-6">
      <div>
        <h2 id={titleId} className="text-body font-bold text-fg">
          {ADMIN_SETTINGS.labels[key] ?? key}
        </h2>
        <p className="pt-1 text-micro text-fg-muted">
          {[key, setting.updated_at && ADMIN_SETTINGS.updatedAt(formatKST(setting.updated_at))]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      {mode === 'primitive' && isPrimitive(draft) && (
        <ValueField label={ADMIN_SETTINGS.valueLabel} value={draft} onChange={setDraft} />
      )}
      {mode === 'fields' && isFieldMap(draft) && (
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(draft).map(([field, value]) => (
            <ValueField
              key={field}
              label={ADMIN_SETTINGS.fields[field] ?? field}
              value={value}
              onChange={(changedValue) => setDraft({ ...draft, [field]: changedValue })}
            />
          ))}
        </div>
      )}
      {mode === 'json' && (
        <>
          <textarea
            aria-labelledby={titleId}
            rows={Math.min(MAX_ROWS, text.split('\n').length + 1)}
            spellCheck={false}
            value={text}
            aria-invalid={next.ok ? undefined : true}
            onChange={(event) => setText(event.target.value)}
            className="w-full rounded-sm border border-border bg-field px-3 py-2 font-mono text-body-sm text-fg focus:border-brand-green focus:outline-none"
          />
          <p className="text-micro text-fg-muted">{ADMIN_SETTINGS.jsonHint}</p>
        </>
      )}
      {!next.ok && (
        <p role="alert" className="text-caption text-danger">
          {mode === 'json' ? ADMIN_SETTINGS.jsonInvalid : ADMIN_SETTINGS.numberRequired}
        </p>
      )}

      <div className="flex items-end gap-2">
        <TextField
          className="grow"
          label={ADMIN_SETTINGS.reasonLabel}
          maxLength={REASON_MAX}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <Button size="md" disabled={!changed} loading={save.isPending} onClick={submit}>
          {ADMIN_SETTINGS.save}
        </Button>
      </div>

      <Modal
        open={confirming}
        title={ADMIN_SETTINGS.confirmTitle}
        onClose={() => setConfirming(false)}
        footer={
          <>
            <Button block size="md" variant="secondary" onClick={() => setConfirming(false)}>
              {COMMON.cancel}
            </Button>
            <Button
              block
              size="md"
              loading={save.isPending}
              onClick={() => next.ok && save.mutate(next.value)}
            >
              {ADMIN_SETTINGS.save}
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-fg-muted">{ADMIN_SETTINGS.confirmBody}</p>
      </Modal>
    </li>
  );
}
