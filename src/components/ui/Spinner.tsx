import { cx } from '@/lib/cx';

interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cx(
        'inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent',
        className,
      )}
    />
  );
}
