import { useEffect, useRef, useState } from 'react';

import { gapMs, PET_ACTIONS, PET_FIRST_GAP_MS, pickAction, type PetStep } from './petBehavior';
import type { PetFrame } from './petFrames';

/**
 * 가만히 있다가 가끔 한 동작씩 하는 순서를 돌리고, 지금 보여 줄 프레임을 돌려준다.
 * active 가 아니면 타이머를 모두 멈추고 정면으로 돌아간다.
 */
export function usePetLoop(active: boolean, random: () => number): PetFrame {
  const [frame, setFrame] = useState<PetFrame>('front');
  const latestRandom = useRef(random);

  useEffect(() => {
    latestRandom.current = random;
  });

  useEffect(() => {
    if (!active) return;
    let timer = 0;

    function rest(ms: number): void {
      timer = window.setTimeout(() => {
        play(PET_ACTIONS[pickAction(latestRandom.current())].steps, 0);
      }, ms);
    }

    function play(steps: readonly PetStep[], index: number): void {
      const step = steps[index];
      if (!step) {
        setFrame('front');
        rest(gapMs(latestRandom.current()));
        return;
      }
      setFrame(step.frame);
      timer = window.setTimeout(() => play(steps, index + 1), step.ms);
    }

    rest(PET_FIRST_GAP_MS);
    return () => {
      window.clearTimeout(timer);
      setFrame('front');
    };
  }, [active]);

  return frame;
}
