import { type InputHTMLAttributes, type Ref, useId } from 'react';

import { cx } from '@/lib/cx';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** 작성 조건·안내. 입력 박스 밖에 둔다 (새 디자인 시스템 06) */
  hint?: string;
  error?: string;
  ref?: Ref<HTMLInputElement>;
}

export function TextField({ label, hint, error, className, id, ref, ...rest }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-body-sm font-bold text-fg">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-micro text-fg-muted">
          {hint}
        </p>
      )}
      <input
        id={inputId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          'min-h-(--size-touch) w-full rounded-sm border bg-field px-3 py-3 text-input text-fg placeholder:text-fg-muted focus:border-brand-green focus:outline-none',
          error ? 'border-danger' : 'border-border',
        )}
        {...rest}
      />
      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1 text-caption text-danger">
          <span aria-hidden="true">!</span>
          {error}
        </p>
      )}
    </div>
  );
}
