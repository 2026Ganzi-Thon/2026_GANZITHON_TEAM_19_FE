import { describe, expect, it } from 'vitest';

import {
  gapMs,
  PET_ACTIONS,
  PET_FIRST_GAP_MS,
  PET_GAP_MS,
  pickAction,
  type PetAction,
} from './petBehavior';
import { PET_FRAMES } from './petFrames';

const ACTION_NAMES = Object.keys(PET_ACTIONS) as PetAction[];
const ROLLS = Array.from({ length: 1000 }, (_, index) => index / 1000);

describe('pickAction', () => {
  it('reaches every action for some roll', () => {
    const picks = new Set(ROLLS.map((roll) => pickAction(roll)));

    expect([...picks].sort()).toEqual([...ACTION_NAMES].sort());
  });

  it('picks actions in proportion to their weight', () => {
    const total = ACTION_NAMES.reduce((sum, name) => sum + PET_ACTIONS[name].weight, 0);
    const nods = ROLLS.filter((roll) => pickAction(roll) === 'nod').length;

    expect(nods / ROLLS.length).toBeCloseTo(PET_ACTIONS.nod.weight / total, 2);
  });

  it('still returns an action when the roll is exactly 1', () => {
    expect(ACTION_NAMES).toContain(pickAction(1));
  });

  it('treats an out-of-range roll as the nearest end', () => {
    expect(pickAction(-1)).toBe(pickAction(0));
    expect(pickAction(2)).toBe(pickAction(1));
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

  it('leaves at least a few seconds of stillness between moves', () => {
    expect(PET_GAP_MS.min).toBeGreaterThanOrEqual(3000);
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
});
