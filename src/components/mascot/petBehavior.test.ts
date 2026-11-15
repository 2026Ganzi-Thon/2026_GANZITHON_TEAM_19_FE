import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  gapMs,
  PET_ACTIONS,
  PET_FIRST_GAP_MS,
  PET_GAP_MS,
  PET_HOP_MS,
  PET_MAX_SLOT,
  pickAction,
  type PetAction,
} from './petBehavior';
import { PET_FRAMES } from './petFrames';

const ACTION_NAMES = Object.keys(PET_ACTIONS) as PetAction[];
const ROLLS = Array.from({ length: 1000 }, (_, index) => index / 1000);
const MIDDLE = { slot: 1, canRoam: true };

function picksAt(context: { slot: number; canRoam: boolean }): PetAction[] {
  return ROLLS.map((roll) => pickAction(roll, context));
}

describe('pickAction', () => {
  it('reaches every action for some roll when the cat is free to move either way', () => {
    expect([...new Set(picksAt(MIDDLE))].sort()).toEqual([...ACTION_NAMES].sort());
  });

  it('picks actions in proportion to their weight', () => {
    const total = ACTION_NAMES.reduce((sum, name) => sum + PET_ACTIONS[name].weight, 0);
    const nods = picksAt(MIDDLE).filter((name) => name === 'nod').length;

    expect(nods / ROLLS.length).toBeCloseTo(PET_ACTIONS.nod.weight / total, 2);
  });

  it('never hops left from its home spot', () => {
    expect(picksAt({ slot: 0, canRoam: true })).not.toContain('hopLeft');
  });

  it('never hops right from its farthest spot', () => {
    expect(picksAt({ slot: PET_MAX_SLOT, canRoam: true })).not.toContain('hopRight');
  });

  it('stays on its spot while it is being held', () => {
    const picks = picksAt({ slot: 1, canRoam: false });

    expect(picks).not.toContain('hopLeft');
    expect(picks).not.toContain('hopRight');
  });

  it('still returns an action when the roll is exactly 1', () => {
    expect(ACTION_NAMES).toContain(pickAction(1, MIDDLE));
  });

  it('treats an out-of-range roll as the nearest end', () => {
    expect(pickAction(-1, MIDDLE)).toBe(pickAction(0, MIDDLE));
    expect(pickAction(2, MIDDLE)).toBe(pickAction(1, MIDDLE));
  });
});

describe('gapMs', () => {
  it('maps the lowest roll to the shortest gap and the highest to the longest', () => {
    expect(gapMs(0)).toBe(PET_GAP_MS.min);
    expect(gapMs(1)).toBe(PET_GAP_MS.max);
  });

  it('stays inside the gap range for any roll', () => {
    ROLLS.forEach((roll) => {
      expect(gapMs(roll)).toBeGreaterThanOrEqual(PET_GAP_MS.min);
      expect(gapMs(roll)).toBeLessThanOrEqual(PET_GAP_MS.max);
    });
  });

  it('moves often enough to feel alive, with a short pause between moves', () => {
    expect(PET_GAP_MS.min).toBeGreaterThanOrEqual(1000);
    expect(PET_GAP_MS.max).toBeLessThanOrEqual(5000);
  });

  it('makes the first move sooner than any later one', () => {
    expect(PET_FIRST_GAP_MS).toBeLessThan(PET_GAP_MS.min);
  });
});

describe('PET_ACTIONS', () => {
  it('uses only known frames with positive durations', () => {
    ACTION_NAMES.forEach((name) => {
      PET_ACTIONS[name].steps.forEach((step) => {
        expect(Object.keys(PET_FRAMES)).toContain(step.frame);
        expect(step.ms).toBeGreaterThan(0);
      });
    });
  });

  it('keeps every move under two seconds', () => {
    ACTION_NAMES.forEach((name) => {
      const total = PET_ACTIONS[name].steps.reduce((sum, step) => sum + step.ms, 0);

      expect(total).toBeLessThanOrEqual(2000);
    });
  });

  it('keeps the lying pose for the stopped state only', () => {
    const frames = ACTION_NAMES.flatMap((name) =>
      PET_ACTIONS[name].steps.map((step) => step.frame),
    );

    expect(frames).not.toContain('sleep');
  });

  it('moves one spot at a time, and only in the two sideways hops', () => {
    const shifts = ACTION_NAMES.map((name) =>
      PET_ACTIONS[name].steps.reduce((sum, step) => sum + (step.dx ?? 0), 0),
    );

    expect(PET_ACTIONS.hopRight.steps.reduce((sum, step) => sum + (step.dx ?? 0), 0)).toBe(1);
    expect(PET_ACTIONS.hopLeft.steps.reduce((sum, step) => sum + (step.dx ?? 0), 0)).toBe(-1);
    expect(shifts.filter((shift) => shift !== 0)).toHaveLength(2);
  });

  it('never repeats the same motion on back-to-back steps, so each one restarts', () => {
    ACTION_NAMES.forEach((name) => {
      const motions = PET_ACTIONS[name].steps.map((step) => step.motion);

      motions.forEach((motion, index) => {
        if (motion) expect(motions[index + 1]).not.toBe(motion);
      });
    });
  });
});

describe('animation timing', () => {
  const css = readFileSync('src/styles/index.css', 'utf8');

  function cssMs(motion: string): number {
    const match = new RegExp(`--animate-pet-${motion}: pet-${motion} ([0-9]+)ms`).exec(css);
    if (!match?.[1]) throw new Error(`no duration for ${motion} in index.css`);
    return Number(match[1]);
  }

  it('plays each whole-body motion for exactly as long as its step lasts', () => {
    ACTION_NAMES.forEach((name) => {
      PET_ACTIONS[name].steps.forEach((step) => {
        if (step.motion) expect(step.ms).toBe(cssMs(step.motion));
      });
    });
  });

  it('uses the same hop time in the stylesheet and in the code', () => {
    expect(cssMs('hop')).toBe(PET_HOP_MS);
  });
});
