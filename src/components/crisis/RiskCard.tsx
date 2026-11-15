import { PROVIDER_ROOM } from '@/copy/room';

export interface RiskCardEvent {
  riskEventId?: string;
  evidence?: string;
  script: readonly string[];
}

interface RiskCardProps {
  event: RiskCardEvent;
  /** 대응 문장을 누르면 입력창에 넣는다 */
  onPickScript: (text: string) => void;
  onCallOncall: () => void;
  onShareResources: () => void;
  onAcknowledge: () => void;
  busy?: boolean;
}

const ACTION =
  'min-h-(--size-touch) rounded-sm border border-danger px-3 text-caption font-bold text-danger disabled:opacity-50';

/** 상담사에게 보이는 위기 대응 카드 (TRD T-06, 18-1): 근거 문장, 대응 문장, 당직 호출, 위기 자원 보내기 */
export function RiskCard({
  event,
  onPickScript,
  onCallOncall,
  onShareResources,
  onAcknowledge,
  busy = false,
}: RiskCardProps) {
  return (
    <section
      role="alert"
      aria-live="assertive"
      className="shrink-0 rounded-sm border border-danger bg-danger-bg p-3 text-body-sm"
    >
      <h2 className="font-bold text-danger">{PROVIDER_ROOM.riskTitle}</h2>
      {event.evidence && (
        <p className="pt-2 text-fg">
          <span className="text-micro text-fg-muted">{PROVIDER_ROOM.riskEvidence}</span>
          <br />
          <mark className="bg-highlight text-fg">{event.evidence}</mark>
        </p>
      )}
      {event.script.length > 0 && (
        <>
          <p className="pt-2 text-micro text-fg-muted">{PROVIDER_ROOM.riskScripts}</p>
          <ul>
            {event.script.map((line) => (
              <li key={line}>
                <button
                  type="button"
                  onClick={() => onPickScript(line)}
                  className="min-h-(--size-touch) text-left text-fg underline"
                >
                  {line}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="flex flex-wrap gap-2 pt-2">
        <button type="button" disabled={busy} onClick={onCallOncall} className={ACTION}>
          {PROVIDER_ROOM.riskCallOncall}
        </button>
        <button type="button" disabled={busy} onClick={onShareResources} className={ACTION}>
          {PROVIDER_ROOM.riskShare}
        </button>
        <button
          type="button"
          onClick={onAcknowledge}
          className="min-h-(--size-touch) px-2 text-caption text-fg-muted underline"
        >
          {PROVIDER_ROOM.riskAck}
        </button>
      </div>
    </section>
  );
}
