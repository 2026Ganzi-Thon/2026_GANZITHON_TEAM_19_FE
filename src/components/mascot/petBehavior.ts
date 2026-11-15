import type { PetFrame } from './petFrames';

export type PetAction =
  | 'nod'
  | 'lookAround'
  | 'glanceRight'
  | 'glanceLeft'
  | 'stretch'
  | 'tilt'
  | 'wiggle'
  | 'hop'
  | 'hopRight'
  | 'hopLeft';

/** 몸 전체로 하는 움직임. styles/index.css 의 animate-pet-* 와 짝이다 */
export type PetMotion = 'hop' | 'tilt' | 'wiggle' | 'stretch';

export interface PetStep {
  frame: PetFrame;
  ms: number;
  motion?: PetMotion;
  /** 옆 칸으로 옮겨 간다 (+1 오른쪽, -1 왼쪽) */
  dx?: 1 | -1;
}

interface PetActionSpec {
  /** 뽑힐 비중. 클수록 자주 나온다 */
  weight: number;
  steps: readonly PetStep[];
}

/** 지금 고양이가 놓인 상황 */
export interface PetSituation {
  /** 집(0)에서 오른쪽으로 몇 칸 가 있는지 */
  slot: number;
  /** 자리를 옮겨도 되는지. 마우스가 올라와 있거나 키보드 포커스가 있으면 안 된다 */
  canRoam: boolean;
}

/** 폴짝 뛰는 시간. styles/index.css 의 --animate-pet-hop, 버튼이 옆으로 미끄러지는 시간과 같다 */
export const PET_HOP_MS = 520;
/** 옆으로 한 번 뛸 때 옮겨 가는 거리(px) */
export const PET_STEP_PX = 36;
/** 집에서 가장 멀리 가는 칸 */
export const PET_MAX_SLOT = 2;

// motion 이 있는 단계의 시간은 styles/index.css 의 애니메이션 시간과 같게 둔다.
// 같은 motion 을 이어서 쓰려면 사이에 motion 없는 단계를 끼운다 (그래야 애니메이션이 다시 시작한다).
// 엎드린 포즈(sleep)는 넣지 않는다. 그 모습은 사용자가 눌러서 멈춘 상태만 뜻한다
export const PET_ACTIONS: Record<PetAction, PetActionSpec> = {
  nod: {
    weight: 15,
    steps: [
      { frame: 'nod', ms: 200 },
      { frame: 'front', ms: 150 },
      { frame: 'nod', ms: 200 },
    ],
  },
  lookAround: {
    weight: 13,
    steps: [
      { frame: 'left', ms: 520 },
      { frame: 'front', ms: 160 },
      { frame: 'right', ms: 520 },
    ],
  },
  glanceRight: { weight: 9, steps: [{ frame: 'right', ms: 1000 }] },
  glanceLeft: { weight: 7, steps: [{ frame: 'left', ms: 1000 }] },
  stretch: { weight: 9, steps: [{ frame: 'up', ms: 1300, motion: 'stretch' }] },
  tilt: { weight: 12, steps: [{ frame: 'front', ms: 1100, motion: 'tilt' }] },
  wiggle: { weight: 9, steps: [{ frame: 'turn', ms: 900, motion: 'wiggle' }] },
  hop: {
    weight: 8,
    steps: [
      { frame: 'front', ms: PET_HOP_MS, motion: 'hop' },
      { frame: 'front', ms: 100 },
      { frame: 'front', ms: PET_HOP_MS, motion: 'hop' },
    ],
  },
  // 왼쪽으로 돌아오는 쪽을 조금 더 자주 골라서 집 근처에 머문다
  hopRight: {
    weight: 9,
    steps: [
      { frame: 'right', ms: 240 },
      { frame: 'right', ms: PET_HOP_MS, motion: 'hop', dx: 1 },
      { frame: 'front', ms: 160 },
    ],
  },
  hopLeft: {
    weight: 12,
    steps: [
      { frame: 'left', ms: 240 },
      { frame: 'left', ms: PET_HOP_MS, motion: 'hop', dx: -1 },
      { frame: 'front', ms: 160 },
    ],
  },
};

/** 화면에 나타난 뒤(또는 다시 깨어난 뒤) 첫 동작까지의 시간. 움직이는 고양이라는 것을 바로 알 수 있게 짧다 */
export const PET_FIRST_GAP_MS = 900;

/** 그 뒤로 동작과 동작 사이에 가만히 있는 시간 */
export const PET_GAP_MS = { min: 1600, max: 4200 } as const;

const ACTION_NAMES = Object.keys(PET_ACTIONS) as PetAction[];

function clampRoll(roll: number): number {
  return Math.min(Math.max(roll, 0), 1);
}

function isAllowed(action: PetAction, { slot, canRoam }: PetSituation): boolean {
  if (action === 'hopRight') return canRoam && slot < PET_MAX_SLOT;
  if (action === 'hopLeft') return canRoam && slot > 0;
  return true;
}

/** roll(0~1)로 지금 할 수 있는 동작 가운데 하나를 비중에 따라 고른다 */
export function pickAction(roll: number, situation: PetSituation): PetAction {
  const candidates = ACTION_NAMES.filter((name) => isAllowed(name, situation));
  const total = candidates.reduce((sum, name) => sum + PET_ACTIONS[name].weight, 0);
  const target = clampRoll(roll) * total;

  let passed = 0;
  for (const name of candidates) {
    passed += PET_ACTIONS[name].weight;
    if (target < passed) return name;
  }
  // roll 이 정확히 1 이면 마지막 동작이다
  return candidates[candidates.length - 1] ?? 'nod';
}

/** roll(0~1)로 다음 동작까지 쉴 시간을 정한다 */
export function gapMs(roll: number): number {
  return Math.round(PET_GAP_MS.min + clampRoll(roll) * (PET_GAP_MS.max - PET_GAP_MS.min));
}
