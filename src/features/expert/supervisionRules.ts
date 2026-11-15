import { z } from 'zod';

import type { RiskRating, SupervisionScores, SupervisionWrite } from '@/api/pendingProvider';
import { EXPERT_SUPERVISION } from '@/copy/expertSupervision';
import { countCharsWithoutSpaces } from '@/lib/text';

// 작성 조건 (TRD E-08 표, 백엔드 15-5). 글자 수는 공백을 빼고 센다.
export const LIMITS = {
  wellDone: { min: 100, max: 2000 },
  blindSpot: { min: 150, max: 2000 },
  suggestion: { min: 10, max: 500 },
  riskComment: { min: 50, max: 1000 },
  nextAction: { min: 50, max: 500 },
} as const;
export const MIN_ALTERNATIVES = 1;
export const MAX_ALTERNATIVES = 2;
const MIN_SCORE = 1;
const MAX_SCORE = 5;

export const SCORE_KEYS: ReadonlyArray<keyof SupervisionScores> = [
  'rapport',
  'empathy',
  'risk',
  'structure',
];

export interface SupervisionForm {
  wellDone: string;
  blindSpot: string;
  alternatives: Array<{ sessionId?: string; quote: string; suggestion: string }>;
  riskRating: RiskRating | null;
  riskComment: string;
  nextAction: string;
  scores: Record<keyof SupervisionScores, number | null>;
}

export const EMPTY_FORM: SupervisionForm = {
  wellDone: '',
  blindSpot: '',
  alternatives: [{ quote: '', suggestion: '' }],
  riskRating: null,
  riskComment: '',
  nextAction: '',
  scores: { rapport: null, empathy: null, risk: null, structure: null },
};

function within(limit: { min: number; max: number }) {
  return z.string().refine((value) => {
    const length = countCharsWithoutSpaces(value);
    return length >= limit.min && length <= limit.max;
  });
}

const score = z.number().int().min(MIN_SCORE).max(MAX_SCORE);

const supervisionSchema = z.object({
  wellDone: within(LIMITS.wellDone),
  blindSpot: within(LIMITS.blindSpot),
  alternatives: z
    .array(
      z.object({
        quote: z.string().trim().min(1),
        suggestion: within(LIMITS.suggestion),
      }),
    )
    .min(MIN_ALTERNATIVES)
    .max(MAX_ALTERNATIVES),
  riskRating: z.enum(['appropriate', 'underestimated', 'overestimated']),
  riskComment: within(LIMITS.riskComment),
  nextAction: within(LIMITS.nextAction),
  scores: z.object({ rapport: score, empathy: score, risk: score, structure: score }),
});

const FIELD_LABEL: Record<string, string> = {
  wellDone: EXPERT_SUPERVISION.wellDone,
  blindSpot: EXPERT_SUPERVISION.blindSpot,
  alternatives: EXPERT_SUPERVISION.alternatives,
  riskRating: EXPERT_SUPERVISION.risk,
  riskComment: EXPERT_SUPERVISION.risk,
  nextAction: EXPERT_SUPERVISION.nextAction,
  scores: EXPERT_SUPERVISION.scores,
};

/** 아직 조건을 채우지 못한 항목의 이름. 비어 있으면 제출할 수 있다 */
export function missingItems(form: SupervisionForm): string[] {
  const result = supervisionSchema.safeParse(form);
  if (result.success) return [];
  const labels = result.error.issues.map((issue) => FIELD_LABEL[String(issue.path[0])] ?? '');
  return [...new Set(labels.filter(Boolean))];
}

/** 서버로 보낼 모양 (SUP-03) */
export function toWrite(form: SupervisionForm, draft: boolean): SupervisionWrite {
  const scores = Object.fromEntries(
    SCORE_KEYS.filter((key) => form.scores[key] !== null).map((key) => [key, form.scores[key]]),
  ) as Partial<SupervisionScores>;
  return {
    draft,
    well_done: form.wellDone,
    blind_spot: form.blindSpot,
    alternative_responses: form.alternatives.map((item) => ({
      session_id: item.sessionId,
      quote: item.quote,
      suggestion: item.suggestion,
    })),
    risk_rating: form.riskRating ?? undefined,
    risk_comment: form.riskComment,
    next_action: form.nextAction,
    scores,
  };
}

/** 임시저장한 내용을 폼으로 되돌린다 */
export function fromSaved(saved: SupervisionWrite | null | undefined): SupervisionForm {
  if (!saved) return EMPTY_FORM;
  return {
    wellDone: saved.well_done,
    blindSpot: saved.blind_spot,
    alternatives:
      saved.alternative_responses.length > 0
        ? saved.alternative_responses.map((item) => ({
            sessionId: item.session_id,
            quote: item.quote,
            suggestion: item.suggestion,
          }))
        : EMPTY_FORM.alternatives,
    riskRating: saved.risk_rating ?? null,
    riskComment: saved.risk_comment,
    nextAction: saved.next_action,
    scores: {
      rapport: saved.scores.rapport ?? null,
      empathy: saved.scores.empathy ?? null,
      risk: saved.scores.risk ?? null,
      structure: saved.scores.structure ?? null,
    },
  };
}
