import { describe, expect, it } from 'vitest';

import type { RiskEvent } from '@/api/pendingAdmin';

import { splitMaskTokens } from './masking';
import { elapsedMs, sortRiskEvents } from './risks';

function event(partial: Partial<RiskEvent>): RiskEvent {
  return {
    id: 'risk',
    level: 'high',
    source: 'session',
    status: 'open',
    client_nickname: '따뜻한구름',
    created_at: '2026-11-14T03:00:00Z',
    elapsed_seconds: 0,
    provider_acked: false,
    evidence: '',
    context: [],
    detector: 'rule',
    timeline: [],
    ...partial,
  };
}

describe('sortRiskEvents', () => {
  it('긴급한 것부터, 같은 수준이면 오래 기다린 것부터 놓는다', () => {
    const sorted = sortRiskEvents([
      event({ id: 'high-new', level: 'high', elapsed_seconds: 30 }),
      event({ id: 'critical', level: 'critical', elapsed_seconds: 10 }),
      event({ id: 'high-old', level: 'high', elapsed_seconds: 900 }),
      event({ id: 'medium', level: 'medium', elapsed_seconds: 5000 }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(['critical', 'high-old', 'high-new', 'medium']);
  });
});

describe('elapsedMs', () => {
  it('받은 뒤 흐른 시간을 더한다', () => {
    expect(elapsedMs(event({ elapsed_seconds: 60 }), 1_000, 6_000)).toBe(65_000);
  });

  it('종결된 건은 더 늘지 않는다', () => {
    expect(elapsedMs(event({ elapsed_seconds: 60, status: 'resolved' }), 1_000, 6_000)).toBe(
      60_000,
    );
  });
});

describe('splitMaskTokens', () => {
  it('치환 표시와 나머지 글을 나눈다', () => {
    expect(splitMaskTokens('[이름1] 님이 [지명2] 모임에 나오래요')).toEqual([
      { text: '[이름1]', token: true },
      { text: ' 님이 ', token: false },
      { text: '[지명2]', token: true },
      { text: ' 모임에 나오래요', token: false },
    ]);
  });

  it('치환 표시가 없으면 글 하나로 돌려준다', () => {
    expect(splitMaskTokens('[메모] 평범한 글')).toEqual([
      { text: '[메모] 평범한 글', token: false },
    ]);
  });
});
