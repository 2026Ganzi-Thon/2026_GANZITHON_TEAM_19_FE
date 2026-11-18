import { describe, expect, it } from 'vitest';

import { parseSummary } from './reports';

describe('parseSummary', () => {
  it('reads the AI summary the server sends as JSON text', () => {
    const summary = {
      chief_complaint: '취업 걱정',
      thinking_patterns: '',
      triggers: '',
      coping: '',
      safety_check: '',
    };

    expect(parseSummary(JSON.stringify(summary))).toEqual(summary);
  });

  it('keeps a plain sentence as it is', () => {
    expect(parseSummary('지친 마음을 이야기했어요.')).toBe('지친 마음을 이야기했어요.');
  });

  it('keeps a missing summary missing', () => {
    expect(parseSummary(null)).toBeNull();
    expect(parseSummary(undefined)).toBeNull();
  });
});
