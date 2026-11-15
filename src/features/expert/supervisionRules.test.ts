import { describe, expect, it } from 'vitest';

import { EXPERT_SUPERVISION } from '@/copy/expertSupervision';

import {
  EMPTY_FORM,
  fromSaved,
  missingItems,
  type SupervisionForm,
  toWrite,
} from './supervisionRules';

const complete: SupervisionForm = {
  wellDone: '가'.repeat(100),
  blindSpot: '가'.repeat(150),
  alternatives: [{ sessionId: 's1', quote: '그래도 쉬셔야죠.', suggestion: '가'.repeat(10) }],
  riskRating: 'appropriate',
  riskComment: '가'.repeat(50),
  nextAction: '가'.repeat(50),
  scores: { rapport: 4, empathy: 4, risk: 5, structure: 3 },
};

describe('missingItems', () => {
  it('lists every item for an empty form', () => {
    expect(missingItems(EMPTY_FORM)).toEqual([
      EXPERT_SUPERVISION.wellDone,
      EXPERT_SUPERVISION.blindSpot,
      EXPERT_SUPERVISION.alternatives,
      EXPERT_SUPERVISION.risk,
      EXPERT_SUPERVISION.nextAction,
      EXPERT_SUPERVISION.scores,
    ]);
  });

  it('is empty once every condition is met', () => {
    expect(missingItems(complete)).toEqual([]);
  });

  it('counts characters without spaces', () => {
    const spaced = { ...complete, wellDone: `${'가 '.repeat(99)}가` };

    expect(missingItems(spaced)).toEqual([]);
    expect(missingItems({ ...complete, wellDone: `${'가'.repeat(99)}     ` })).toEqual([
      EXPERT_SUPERVISION.wellDone,
    ]);
  });

  it('needs one or two alternative responses with a quote each', () => {
    const three = Array.from({ length: 3 }, () => complete.alternatives[0]).filter(
      (item) => item !== undefined,
    );

    expect(missingItems({ ...complete, alternatives: [] })).toEqual([
      EXPERT_SUPERVISION.alternatives,
    ]);
    expect(missingItems({ ...complete, alternatives: three })).toEqual([
      EXPERT_SUPERVISION.alternatives,
    ]);
    expect(
      missingItems({ ...complete, alternatives: [{ quote: ' ', suggestion: '가'.repeat(10) }] }),
    ).toEqual([EXPERT_SUPERVISION.alternatives]);
  });

  it('reports the risk item once even when both the rating and the comment are missing', () => {
    expect(missingItems({ ...complete, riskRating: null, riskComment: '' })).toEqual([
      EXPERT_SUPERVISION.risk,
    ]);
  });

  it('needs all four scores', () => {
    expect(missingItems({ ...complete, scores: { ...complete.scores, structure: null } })).toEqual([
      EXPERT_SUPERVISION.scores,
    ]);
  });
});

describe('toWrite and fromSaved', () => {
  it('round-trips a draft without losing what was written', () => {
    const partial: SupervisionForm = {
      ...EMPTY_FORM,
      wellDone: '적는 중',
      scores: { ...EMPTY_FORM.scores, rapport: 3 },
    };

    const saved = toWrite(partial, true);

    expect(saved.draft).toBe(true);
    expect(saved.scores).toEqual({ rapport: 3 });
    expect(fromSaved(saved)).toEqual(partial);
  });

  it('starts from an empty form when nothing was saved', () => {
    expect(fromSaved(null)).toEqual(EMPTY_FORM);
  });
});
