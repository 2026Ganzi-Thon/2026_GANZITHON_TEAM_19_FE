import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router';

import { LEAVE } from '@/copy/client';

import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmLeaveModalProps {
  /** 작성 중이면 true. 이동하는 순간의 값을 봐야 하면 함수를 넘긴다 */
  when: boolean | (() => boolean);
}

/** 작성 중인 화면을 떠날 때 확인한다: 라우터 이동과 새로고침·탭 닫기 (TRD 17-7). */
export function ConfirmLeaveModal({ when }: ConfirmLeaveModalProps) {
  const latestWhen = useRef(when);

  useEffect(() => {
    latestWhen.current = when;
  });

  function shouldBlock(): boolean {
    const current = latestWhen.current;
    return typeof current === 'function' ? current() : current;
  }

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      currentLocation.pathname !== nextLocation.pathname && shouldBlock(),
  );

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      const current = latestWhen.current;
      if (typeof current === 'function' ? current() : current) event.preventDefault();
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const blocked = blocker.state === 'blocked';

  return (
    <Modal
      open={blocked}
      title={LEAVE.title}
      onClose={() => blocker.reset?.()}
      footer={
        <>
          <Button block size="md" variant="secondary" onClick={() => blocker.reset?.()}>
            {LEAVE.stay}
          </Button>
          <Button block size="md" onClick={() => blocker.proceed?.()}>
            {LEAVE.leave}
          </Button>
        </>
      }
    >
      <p className="text-body-sm text-fg-muted">{LEAVE.description}</p>
    </Modal>
  );
}
