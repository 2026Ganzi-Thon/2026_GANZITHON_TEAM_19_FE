import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router';

import { completeEthicsTraining, type Me } from '@/api/endpoints/me';
import { roleHome } from '@/app/access';
import { Screen } from '@/app/layouts/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { COMMON } from '@/copy/fixed';
import { STATUS } from '@/copy/screens';
import { authClient } from '@/lib/auth';
import { formatKSTDate } from '@/lib/date';
import { refreshSession } from '@/lib/session';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/stores/uiStore';

const LINK_BUTTON =
  'flex min-h-(--size-button) items-center justify-center rounded-sm border border-brand-green bg-surface px-4 text-body font-bold text-fg';

function providerBase(me: Me): string {
  return me.role === 'expert' ? '/e' : '/t';
}

function SuspendedActions() {
  const queryClient = useQueryClient();
  const training = useMutation({
    mutationFn: completeEthicsTraining,
    onSuccess: async () => {
      showToast(STATUS.suspended.trainingDone, 'success');
      await refreshSession(queryClient);
    },
  });

  return (
    <Button block loading={training.isPending} onClick={() => training.mutate()}>
      {STATUS.suspended.confirmTraining}
    </Button>
  );
}

/** A-04 계정 상태 안내 */
export function A04StatusPage() {
  const me = useAuthStore((state) => state.me);
  if (!me || me.status === 'active') return <Navigate to={roleHome(me?.role)} replace />;

  let title: string;
  let description: string;
  let actions: React.ReactNode;

  switch (me.status) {
    case 'pending_review':
      title = STATUS.pending.title;
      description = STATUS.pending.description;
      actions = (
        <>
          <Link to={`${providerBase(me)}/profile`} className={LINK_BUTTON}>
            {STATUS.pending.editProfile}
          </Link>
          <Link to={`${providerBase(me)}/credentials`} className={LINK_BUTTON}>
            {STATUS.pending.viewDocuments}
          </Link>
        </>
      );
      break;
    case 'rejected':
      title = STATUS.rejected.title;
      description = STATUS.rejected.description;
      actions = (
        <Link to={`${providerBase(me)}/credentials`} className={LINK_BUTTON}>
          {STATUS.rejected.resubmit}
        </Link>
      );
      break;
    case 'suspended':
      title = STATUS.suspended.title(me.suspended_until ? formatKSTDate(me.suspended_until) : '');
      description = STATUS.suspended.description;
      actions = me.ethics_training_required ? <SuspendedActions /> : null;
      break;
    case 'restricted':
      title = STATUS.restricted.title;
      description = STATUS.restricted.until(
        me.restricted_until ? formatKSTDate(me.restricted_until) : '',
      );
      actions = (
        <Link to={roleHome(me.role)} className={LINK_BUTTON}>
          {COMMON.home}
        </Link>
      );
      break;
    default:
      title = STATUS.banned.title;
      description = STATUS.banned.description;
      actions = null;
  }

  return (
    <Screen>
      <ScreenHeader hideBack />
      <h1 className="pt-10 text-title-sm font-bold text-fg">{title}</h1>
      <p className="pt-4 text-body text-fg-muted">{description}</p>
      <div className="mt-auto flex flex-col gap-2 pb-10 pt-8">
        {actions}
        <Button block variant="ghost" onClick={() => void authClient().signOut()}>
          {COMMON.logout}
        </Button>
      </div>
    </Screen>
  );
}
