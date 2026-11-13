import { COMMON } from '@/copy/fixed';
import { isOutdated, useAppConfig } from '@/hooks/useAppConfig';
import { useOnline } from '@/hooks/useOnline';
import { env } from '@/lib/env';

/** 상단 고정 1줄 배너: 오프라인, 새 버전 (TRD 18-1). */
export function StatusBanners() {
  const online = useOnline();
  const { data: config } = useAppConfig();
  const outdated = isOutdated(env.version, config?.min_client_version);

  return (
    <>
      {!online && (
        <div role="status" className="bg-danger-bg px-6 py-2 text-center text-caption text-danger">
          {COMMON.offline}
        </div>
      )}
      {outdated && (
        <div
          role="status"
          className="flex items-center justify-center gap-3 bg-highlight px-6 py-2 text-caption text-fg"
        >
          {COMMON.update}
          <button
            type="button"
            className="font-bold underline"
            onClick={() => window.location.reload()}
          >
            {COMMON.refresh}
          </button>
        </div>
      )}
    </>
  );
}
