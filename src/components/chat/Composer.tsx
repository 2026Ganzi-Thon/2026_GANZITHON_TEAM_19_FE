import { type FormEvent, type KeyboardEvent, useId, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ROOM } from '@/copy/client';
import { containsContact, countChars } from '@/lib/text';

export const MAX_MESSAGE_CHARS = 1000;

interface ComposerProps {
  onSend: (body: string) => void;
  /** 글자를 입력할 때마다 불린다. 얼마나 자주 보낼지는 받는 쪽이 정한다 */
  onTyping?: () => void;
  disabled?: boolean;
  /** 입력창에 미리 넣을 글 (위기 대응 문장) */
  initialValue?: string;
  /** 연락처로 보이는 글을 보낼 때의 경고 문구. 없으면 내담자용 문구를 쓴다 */
  contactWarning?: string;
}

function clamp(value: string): string {
  return countChars(value) > MAX_MESSAGE_CHARS
    ? Array.from(value).slice(0, MAX_MESSAGE_CHARS).join('')
    : value;
}

/**
 * 메시지 입력창 (TRD C-09, 18-1). Enter 전송, Shift+Enter 줄바꿈.
 * 한글 조합 중 Enter 는 무시하고, 연락처로 보이는 내용은 보내기 전에 한 번 묻는다.
 */
export function Composer({
  onSend,
  onTyping,
  disabled = false,
  initialValue = '',
  contactWarning = ROOM.contactBody,
}: ComposerProps) {
  const inputId = useId();
  const [value, setValue] = useState(initialValue);
  const [warning, setWarning] = useState(false);
  const body = value.trim();

  function sendNow() {
    onSend(body);
    setValue('');
    setWarning(false);
  }

  function submit() {
    if (!body || disabled) return;
    if (containsContact(body)) setWarning(true);
    else sendNow();
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit();
  }

  return (
    <form onSubmit={onSubmit} className="flex shrink-0 items-end gap-2 pb-6 pt-2 safe-bottom">
      <label htmlFor={inputId} className="sr-only">
        {ROOM.messageLabel}
      </label>
      <textarea
        id={inputId}
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={ROOM.placeholder}
        enterKeyHint="send"
        onChange={(event) => {
          setValue(clamp(event.target.value));
          onTyping?.();
        }}
        onKeyDown={onKeyDown}
        className="field-sizing-content max-h-32 min-h-(--size-button) min-w-0 grow resize-none rounded-sm border border-line bg-surface px-4 py-3.5 text-input text-fg placeholder:text-fg-muted focus:border-brand-green focus:outline-none disabled:bg-field"
      />
      <Button type="submit" disabled={disabled || !body} className="shrink-0 px-5 text-caption">
        {ROOM.send}
      </Button>

      <Modal
        open={warning}
        title={ROOM.contactTitle}
        onClose={() => setWarning(false)}
        footer={
          <>
            <Button block size="md" variant="secondary" onClick={() => setWarning(false)}>
              {ROOM.contactEdit}
            </Button>
            <Button block size="md" onClick={sendNow}>
              {ROOM.contactSend}
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-fg-muted">{contactWarning}</p>
      </Modal>
    </form>
  );
}
