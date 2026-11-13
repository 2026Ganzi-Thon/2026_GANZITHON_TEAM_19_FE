import { type InputHTMLAttributes, type ReactNode, useId } from 'react';

import { cx } from '@/lib/cx';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  /** 체크박스 줄 오른쪽에 붙는 보조 동작 (예: 내용 보기) */
  trailing?: ReactNode;
}

export function Checkbox({ label, trailing, className, id, ...rest }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cx('flex min-h-(--size-touch) items-center gap-2', className)}>
      <input
        id={inputId}
        type="checkbox"
        className="size-4.5 shrink-0 rounded-sm accent-brand-green"
        {...rest}
      />
      <label htmlFor={inputId} className="grow py-2 text-body-sm text-fg">
        {label}
      </label>
      {trailing}
    </div>
  );
}
