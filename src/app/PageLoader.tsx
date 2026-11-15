import { Spinner } from '@/components/ui/Spinner';
import { COMMON } from '@/copy/fixed';

export function PageLoader() {
  return (
    <div className="flex min-h-40 grow items-center justify-center text-fg-muted">
      <Spinner className="size-6" label={COMMON.loading} />
    </div>
  );
}
