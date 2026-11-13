import { env } from '@/lib/env';

/** prod 가 아닌 환경에서만 보이는 배지 (TRD 7-2, 10-2). */
export function EnvBadge() {
  if (env.appEnv === 'prod') return null;

  return (
    <div className="pointer-events-none fixed left-1/2 top-1 z-50 -translate-x-1/2 rounded-full bg-brand-yellow px-2 py-0.5 text-micro font-bold uppercase text-fg">
      {env.apiMock ? `${env.appEnv} · mock` : env.appEnv}
    </div>
  );
}
