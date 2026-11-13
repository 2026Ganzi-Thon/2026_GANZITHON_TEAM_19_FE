import { Link, useRouteError } from 'react-router';

import { ErrorState } from '@/components/ui/ErrorState';
import { COMMON } from '@/copy/fixed';
import { useAuthStore } from '@/stores/authStore';

import { roleHome } from './access';

function HomeLink() {
  const role = useAuthStore((state) => state.me?.role);

  return (
    <Link to={roleHome(role)} className="text-body-sm font-bold text-fg underline">
      {COMMON.home}
    </Link>
  );
}

/** 없는 경로, 기능 플래그가 꺼진 경로 (TRD 11-3). */
export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-(--size-content)">
      <ErrorState title={COMMON.notFoundTitle} action={<HomeLink />} />
    </main>
  );
}

/** 화면 단위 렌더 오류 (TRD 18-2). 오류 내용은 화면과 콘솔에 남기지 않는다. */
export function RouteErrorPage() {
  useRouteError();

  return (
    <main className="mx-auto max-w-(--size-content)">
      <ErrorState
        title={COMMON.serverErrorTitle}
        onRetry={() => window.location.reload()}
        action={<HomeLink />}
      />
    </main>
  );
}
