import { useEffect, useRef, useState } from 'react';

import { CRISIS } from '@/copy/fixed';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useCrisisStore } from '@/stores/crisisStore';

import { useCrisisContacts } from './useCrisisContacts';

/** 자동으로 열렸을 때 닫기를 막는 시간 (TRD 17-5) */
export const AUTO_LOCK_MS = 3000;

function useRemainingLock(openedAt: number | null, locked: boolean): number {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!locked || openedAt === null) {
      setRemaining(0);
      return;
    }
    const tick = () => setRemaining(Math.max(0, AUTO_LOCK_MS - (Date.now() - openedAt)));
    tick();
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [locked, openedAt]);

  return remaining;
}

/**
 * 위기 자원 안내 (TRD 17-5, 18-1).
 * 수동으로 열면 바로 닫을 수 있고, risk:alert 로 열리면 3초 뒤에 닫을 수 있다.
 * 연락처가 내장돼 있어 오프라인에서도 열린다.
 */
export function CrisisModal() {
  const { open, trigger, openedAt, close } = useCrisisStore();
  const contacts = useCrisisContacts();
  const panel = useRef<HTMLDivElement>(null);
  const remaining = useRemainingLock(openedAt, trigger?.source === 'auto');
  const locked = remaining > 0;
  useFocusTrap(panel, open);

  useEffect(() => {
    if (!open || locked) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, locked, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-5 md:items-center">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-overlay"
        onClick={locked ? undefined : close}
      />
      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-live="assertive"
        aria-labelledby="crisis-title"
        aria-describedby="crisis-description"
        tabIndex={-1}
        className="relative flex w-full max-w-sm flex-col gap-2.5 rounded-lg border border-border-strong bg-bg p-5"
      >
        <h2 id="crisis-title" className="text-heading font-bold text-fg">
          {CRISIS.title}
        </h2>
        <p id="crisis-description" className="text-body-sm text-fg">
          {CRISIS.description}
        </p>
        <ul className="flex flex-col gap-2.5">
          {contacts.map((contact) => (
            <li key={contact.number}>
              <a
                href={`tel:${contact.number}`}
                className="flex min-h-(--size-touch) items-center gap-2 rounded-lg bg-surface p-3 text-body-sm font-bold text-fg"
              >
                <span>{contact.number}</span>
                <span>{contact.name}</span>
              </a>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={locked}
          onClick={close}
          className="min-h-(--size-touch) rounded-md bg-action p-3 text-body-sm font-bold text-fg-inverse disabled:bg-action-disabled"
        >
          {trigger?.sessionId ? CRISIS.continue : CRISIS.close}
        </button>
        {locked && (
          <p className="text-center text-micro text-fg-muted">
            {CRISIS.waitToClose(Math.ceil(remaining / 1000))}
          </p>
        )}
      </div>
    </div>
  );
}
