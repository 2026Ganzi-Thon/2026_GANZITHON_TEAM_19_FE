import { type Ref, type TextareaHTMLAttributes, useId } from 'react';

import { TEXT_COUNT } from '@/copy/client';
import { cx } from '@/lib/cx';

interface TextAreaProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'minLength' | 'maxLength'
> {
  label: string;
  hint?: string;
  error?: string;
  /** 최소 글자 수. 모자라면 "n자 더 적어주세요" 를 보여 준다 */
  minLength?: number;
  maxLength?: number;
  /** 지금 글자 수. 코드 포인트 기준이라 lib/text.ts 의 countChars 로 센 값을 넘긴다 */
  length?: number;
  showCount?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

export function TextArea({
  label,
  hint,
  error,
  minLength,
  maxLength,
  length = 0,
  showCount = false,
  className,
  id,
  ref,
  ...rest
}: TextAreaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const countId = `${inputId}-count`;
  const errorId = `${inputId}-error`;
  const missing = minLength === undefined ? 0 : Math.max(0, minLength - length);
  const hasCountRow = missing > 0 || (showCount && maxLength !== undefined);
  const describedBy =
    [hint && hintId, hasCountRow && countId, error && errorId].filter(Boolean).join(' ') ||
    undefined;

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
      <div
        className={cx(
          'flex flex-col rounded-sm border bg-field focus-within:border-brand-green',
          error ? 'border-danger' : 'border-transparent',
        )}
      >
        <textarea
          id={inputId}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="w-full resize-none bg-transparent px-4 pt-3.5 text-body text-fg placeholder:text-fg-muted focus:outline-none"
          {...rest}
        />
        <p
          id={countId}
          className="flex min-h-7 justify-between gap-3 px-4 pb-2.5 text-micro text-fg-muted"
        >
          <span>{missing > 0 ? TEXT_COUNT.moreNeeded(missing) : ''}</span>
          {showCount && maxLength !== undefined && (
            <span>{TEXT_COUNT.progress(length, maxLength)}</span>
          )}
        </p>
      </div>
      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1 text-caption text-danger">
          <span aria-hidden="true">!</span>
          {error}
        </p>
      )}
    </div>
  );
}
