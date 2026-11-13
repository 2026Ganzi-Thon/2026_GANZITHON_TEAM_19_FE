import { Navigate, useNavigate } from 'react-router';

import { roleHome } from '@/app/access';
import { Screen } from '@/app/layouts/Screen';
import { CrisisButton } from '@/components/crisis/CrisisButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Mascot } from '@/components/mascot/Mascot';
import { Button } from '@/components/ui/Button';
import { COMMON, NOTICE, SERVICE } from '@/copy/fixed';
import { LANDING } from '@/copy/screens';
import { useAuthStore } from '@/stores/authStore';

const TRACKS = [
  { title: SERVICE.coaching, summary: SERVICE.coachingSummary },
  { title: SERVICE.professional, summary: SERVICE.professionalSummary },
] as const;

/** A-01 랜딩 */
export function A01LandingPage() {
  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.me?.role);

  // 이미 로그인된 상태면 역할 홈으로 바로 이동한다
  if (status === 'ready') return <Navigate to={roleHome(role)} replace />;
  if (status === 'unregistered') return <Navigate to="/onboarding" replace />;

  return (
    <Screen>
      <ScreenHeader
        title={LANDING.headerTitle}
        right={<CrisisButton label={COMMON.help} withIcon={false} muted />}
      />

      <section className="flex items-start justify-between gap-4 pt-11">
        <div>
          <h1 className="whitespace-pre-line text-display font-bold text-fg">{LANDING.headline}</h1>
          <p className="mt-6 whitespace-pre-line text-body text-fg-muted">{LANDING.sub}</p>
        </div>
        <Mascot pose="welcome" className="mt-8" />
      </section>

      <section className="mt-11 border-t border-line pt-6">
        <h2 className="text-caption font-medium text-fg-muted">{LANDING.tracksLabel}</h2>
        <ul>
          {TRACKS.map((track) => (
            <li key={track.title} className="border-b border-line pb-6 pt-4.5 last:border-b-0">
              <p className="text-heading font-bold text-fg">{track.title}</p>
              <p className="mt-1 whitespace-pre text-caption text-fg-muted">{track.summary}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-auto flex flex-col gap-2 pb-10 pt-8">
        <Button block onClick={() => navigate('/login')}>
          {LANDING.start}
        </Button>
        <Button block variant="secondary" onClick={() => navigate('/login?tab=signup')}>
          {LANDING.joinAsProvider}
        </Button>
        <p className="pt-6 text-micro text-fg-muted">{NOTICE.notMedical}</p>
      </div>
    </Screen>
  );
}
