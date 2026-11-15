import { useEffect, useRef, useState } from 'react';

import {
  gapMs,
  PET_ACTIONS,
  PET_FIRST_GAP_MS,
  PET_MAX_SLOT,
  pickAction,
  type PetMotion,
  type PetStep,
} from './petBehavior';
import type { PetFrame } from './petFrames';

/** 지금 화면에 보여 줄 모습 */
export interface PetPose {
  frame: PetFrame;
  motion: PetMotion | null;
  /** 집(0)에서 오른쪽으로 몇 칸 가 있는지 */
  slot: number;
}

const HOME: PetPose = { frame: 'front', motion: null, slot: 0 };

/**
 * 가만히 있다가 한 동작씩 하는 순서를 돌리고, 지금 보여 줄 모습을 돌려준다.
 * active 가 아니면 타이머를 모두 멈추고 있던 자리에서 정면을 본다.
 * canRoam 이 아니면 동작은 계속하되 자리는 옮기지 않는다.
 */
export function usePetLoop(active: boolean, canRoam: boolean, random: () => number): PetPose {
  const [pose, setPose] = useState<PetPose>(HOME);
  const latest = useRef({ random, canRoam });
  // 지금 있는 칸. 멈췄다가 다시 움직여도 있던 자리에서 이어 간다
  const slot = useRef(0);

  useEffect(() => {
    latest.current = { random, canRoam };
  });

  useEffect(() => {
    if (!active) return;
    let timer = 0;

    function rest(ms: number): void {
      timer = window.setTimeout(() => {
        const action = pickAction(latest.current.random(), {
          slot: slot.current,
          canRoam: latest.current.canRoam,
        });
        play(PET_ACTIONS[action].steps, 0);
      }, ms);
    }

    function play(steps: readonly PetStep[], index: number): void {
      const step = steps[index];
      if (!step) {
        setPose({ frame: 'front', motion: null, slot: slot.current });
        rest(gapMs(latest.current.random()));
        return;
      }
      // 뛰는 도중에 붙잡히면(마우스·포커스) 제자리에서만 뛴다
      if (step.dx && latest.current.canRoam) {
        slot.current = Math.min(Math.max(slot.current + step.dx, 0), PET_MAX_SLOT);
      }
      setPose({ frame: step.frame, motion: step.motion ?? null, slot: slot.current });
      timer = window.setTimeout(() => play(steps, index + 1), step.ms);
    }

    rest(PET_FIRST_GAP_MS);
    return () => {
      window.clearTimeout(timer);
      // 멈출 때는 있던 자리에 그대로 둔다. 누르던 버튼이 집으로 달아나면 다시 누를 수 없다
      setPose({ frame: 'front', motion: null, slot: slot.current });
    };
  }, [active]);

  return pose;
}
