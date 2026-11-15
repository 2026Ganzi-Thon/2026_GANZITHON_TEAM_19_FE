import { useQuery } from '@tanstack/react-query';

import { listSettings } from '@/api/endpoints/admin';
import { queryKeys } from '@/api/queryKeys';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ADMIN_SETTINGS } from '@/copy/admin';
import { COMMON } from '@/copy/fixed';

import { SettingEditor } from './SettingEditor';

const STALE_MS = 15_000;

/** M-10 운영 설정 (ADM-06, ADM-07) */
export function M10SettingsPage() {
  const settings = useQuery({
    queryKey: queryKeys.admin('settings', {}),
    queryFn: listSettings,
    staleTime: STALE_MS,
  });

  return (
    <>
      <h1 className="text-title-sm font-bold text-fg">{ADMIN_SETTINGS.title}</h1>
      <p className="pt-2 text-body-sm text-fg-muted">{ADMIN_SETTINGS.description}</p>
      {settings.isPending && <Skeleton lines={8} className="pt-6" />}
      {settings.isError && (
        <ErrorState title={COMMON.serverErrorTitle} onRetry={() => void settings.refetch()} />
      )}
      <ul>
        {(settings.data ?? []).map((setting) => (
          // 저장한 뒤에는 서버 값으로 입력란을 다시 채운다
          <SettingEditor key={`${setting.key}-${setting.updated_at}`} setting={setting} />
        ))}
      </ul>
    </>
  );
}
