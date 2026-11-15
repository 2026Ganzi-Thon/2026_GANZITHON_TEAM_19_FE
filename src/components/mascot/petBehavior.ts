import type { PetFrame } from './petFrames';

export type PetAction = 'nod' | 'glanceRight' | 'glanceLeft' | 'lookUp' | 'turn';

export interface PetStep {
  frame: PetFrame;
  ms: number;
}

interface PetActionSpec {
  /** 뽑힐 비중. 클수록 자주 나온다 */
  weight: number;
  steps: readonly PetStep[];
}

// 상담 화면 옆에 계속 보이므로 동작은 짧게, 동작 사이는 길게 둔다.
// 엎드린 포즈(sleep)는 여기에 넣지 않는다. 그 모습은 사용자가 눌러서 멈춘 상태만 뜻한다
export const PET_ACTIONS: Record<PetAction, PetActionSpec> = {
  nod: { weight: 36, steps: [{ frame: 'nod', ms: 240 }] },
  glanceRight: { weight: 22, steps: [{ frame: 'right', ms: 1400 }] },
  glanceLeft: { weight: 16, steps: [{ frame: 'left', ms: 1400 }] },
  lookUp: { weight: 14, steps: [{ frame: 'up', ms: 1600 }] },
  turn: { weight: 12, steps: [{ frame: 'turn', ms: 1800 }] },
};

/** 화면에 나타난 뒤(또는 다시 깨어난 뒤) 첫 동작까지의 시간. 움직이는 고양이라는 것을 바로 알 수 있게 짧다 */
export const PET_FIRST_GAP_MS = 1200;

/** 그 뒤로 동작과 동작 사이에 가만히 있는 시간 */
export const PET_GAP_MS = { min: 4000, max: 10_000 } as const;

const ACTION_NAMES = Object.keys(PET_ACTIONS) as PetAction[];
const TOTAL_WEIGHT = ACTION_NAMES.reduce((sum, name) => sum + PET_ACTIONS[name].weight, 0);

function clampRoll(roll: number): number {
  return Math.min(Math.max(roll, 0), 1);
}

/** roll(0~1)로 다음 동작을 비중에 따라 고른다 */
export function pickAction(roll: number): PetAction {
  const target = clampRoll(roll) * TOTAL_WEIGHT;

  let passed = 0;
  for (const name of ACTION_NAMES) {
    passed += PET_ACTIONS[name].weight;
    if (target < passed) return name;
  }
  // roll 이 정확히 1 이면 마지막 동작이다
  return ACTION_NAMES[ACTION_NAMES.length - 1] ?? 'nod';
}

/** roll(0~1)로 다음 동작까지 쉴 시간을 정한다 */
export function gapMs(roll: number): number {
  return Math.round(PET_GAP_MS.min + clampRoll(roll) * (PET_GAP_MS.max - PET_GAP_MS.min));
}
