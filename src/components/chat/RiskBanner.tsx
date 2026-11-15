import { ROOM } from '@/copy/client';
import { CRISIS } from '@/copy/fixed';
import { useCrisisStore } from '@/stores/crisisStore';

interface RiskBannerProps {
  sessionId: string;
}

/**
 * 내담자 상담방 위쪽의 위기 안내 (TRD C-09). risk:alert 가 high 이상이면 뜬다.
 * 상담은 끊지 않고, 전화 버튼과 닫기만 둔다.
 */
export function RiskBanner({ sessionId }: RiskBannerProps) {
  const risk = useCrisisStore((state) => state.sessionRisk);
  const dismiss = useCrisisStore((state) => state.dismissRisk);

  if (!risk || risk.sessionId !== sessionId) return null;

  return (
    <div role="alert" aria-live="assertive" className="shrink-0 border-b border-line pb-3 pt-2.5">
      <p className="text-body-sm font-bold text-fg">{ROOM.riskTitle}</p>
      <p className="pt-1 text-body-sm text-fg-muted">{ROOM.riskBody}</p>
      <div className="flex items-center gap-5">
        <a
          href={`tel:${ROOM.riskNumber}`}
          className="flex min-h-(--size-touch) items-center text-body-sm font-bold text-fg underline"
        >
          {ROOM.riskCall}
        </a>
        <button
          type="button"
          onClick={dismiss}
          className="min-h-(--size-touch) text-body-sm text-fg-muted"
        >
          {CRISIS.close}
        </button>
      </div>
    </div>
  );
}
