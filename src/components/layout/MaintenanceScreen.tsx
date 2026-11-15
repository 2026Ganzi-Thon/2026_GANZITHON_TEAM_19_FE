import { COMMON, CRISIS, DEFAULT_CRISIS_CONTACTS } from '@/copy/fixed';
import { formatKST } from '@/lib/date';

interface MaintenanceScreenProps {
  message?: string | null;
  until?: string | null;
}

/** 점검 모드 전체 화면. 위기 연락처는 내장 기본값으로 항상 보인다 (TRD 17-8, 18-1). */
export function MaintenanceScreen({ message, until }: MaintenanceScreenProps) {
  return (
    <main className="mx-auto flex w-full max-w-(--size-content) grow flex-col justify-center gap-4 px-6 py-10">
      <h1 className="text-title font-bold text-fg">{message || COMMON.maintenanceTitle}</h1>
      {until && (
        <p className="text-body text-fg-muted">{COMMON.maintenanceUntil(formatKST(until))}</p>
      )}
      <section aria-label={CRISIS.button} className="mt-6 flex flex-col gap-2.5">
        <h2 className="text-subheading font-bold text-fg">{CRISIS.title}</h2>
        {DEFAULT_CRISIS_CONTACTS.map((contact) => (
          <a
            key={contact.number}
            href={`tel:${contact.number}`}
            className="flex min-h-(--size-touch) items-center gap-2 rounded-lg bg-surface p-3 text-body-sm font-bold text-fg"
          >
            <span>{contact.number}</span>
            <span>{contact.name}</span>
          </a>
        ))}
      </section>
    </main>
  );
}
