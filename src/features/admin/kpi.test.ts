import { describe, expect, it } from 'vitest';

import { formatMetric, funnelRows, kpiRange, northStarDelta, parsePreset } from './kpi';

// 한국 시간 2026-11-14 12:00
const NOW = Date.parse('2026-11-14T03:00:00Z');

describe('kpiRange', () => {
  it('오늘은 한국 시간 오늘 0시부터 내일 0시까지다', () => {
    expect(kpiRange('today', { from: '', to: '' }, NOW)).toEqual({
      from: '2026-11-13T15:00:00.000Z',
      to: '2026-11-14T15:00:00.000Z',
    });
  });

  it('7일은 오늘을 포함해 7일이다', () => {
    expect(kpiRange('7d', { from: '', to: '' }, NOW)?.from).toBe('2026-11-07T15:00:00.000Z');
  });

  it('사용자 지정은 종료일 하루를 모두 포함한다', () => {
    expect(kpiRange('custom', { from: '2026-11-01', to: '2026-11-03' }, NOW)).toEqual({
      from: '2026-10-31T15:00:00.000Z',
      to: '2026-11-03T15:00:00.000Z',
    });
  });

  it('사용자 지정에서 날짜가 비었거나 순서가 뒤집히면 null', () => {
    expect(kpiRange('custom', { from: '', to: '2026-11-03' }, NOW)).toBeNull();
    expect(kpiRange('custom', { from: '2026-11-05', to: '2026-11-03' }, NOW)).toBeNull();
  });
});

describe('parsePreset', () => {
  it('모르는 값이면 7일로 본다', () => {
    expect(parsePreset('30d')).toBe('30d');
    expect(parsePreset('year')).toBe('7d');
    expect(parsePreset(null)).toBe('7d');
  });
});

describe('formatMetric', () => {
  it('비율은 퍼센트로 보여 준다', () => {
    expect(formatMetric('first_session_completion_rate', 0.412)).toBe('41.2%');
  });

  it('리드타임은 분과 초로 보여 준다', () => {
    expect(formatMetric('red_flag_lead_p50', 95)).toBe('1분 35초');
    expect(formatMetric('red_flag_lead_p90', 42)).toBe('42초');
  });

  it('마음 온도 변화는 부호를 붙인다', () => {
    expect(formatMetric('mood_delta', 1.8)).toBe('+1.8점');
    expect(formatMetric('mood_delta', -0.5)).toBe('-0.5점');
  });

  it('금액과 건수는 자릿수를 나눠 보여 준다', () => {
    expect(formatMetric('cac', 12500)).toBe('12,500원');
    expect(formatMetric('high_risk_referrals', 3)).toBe('3건');
    expect(formatMetric('pro_revisit_clients', 4)).toBe('4명');
  });

  it('값이 없으면 집계 전으로 보여 준다', () => {
    expect(formatMetric('cac', null)).toBe('집계 전');
    expect(formatMetric('cac', undefined)).toBe('집계 전');
  });
});

describe('northStarDelta', () => {
  it('늘었으면 +, 줄었으면 - 를 붙인다', () => {
    expect(northStarDelta(20, 17)).toBe('전 기간 대비 +3명');
    expect(northStarDelta(15, 17)).toBe('전 기간 대비 -2명');
  });

  it('전 기간 값이 없으면 null', () => {
    expect(northStarDelta(20, null)).toBeNull();
  });
});

describe('funnelRows', () => {
  it('단계별 수와 전 단계 대비 전환율, 첫 단계 대비 비율을 만든다', () => {
    const rows = funnelRows([
      { step: 'intake_submitted', count: 200 },
      { step: 'match_viewed', count: 150 },
      { step: 'unknown_step', count: 0 },
    ]);
    expect(rows).toEqual([
      { step: 'intake_submitted', label: '인테이크', count: 200, rate: null, share: 1 },
      { step: 'match_viewed', label: '매칭 조회', count: 150, rate: '75%', share: 0.75 },
      { step: 'unknown_step', label: 'unknown_step', count: 0, rate: '0%', share: 0 },
    ]);
  });

  it('첫 단계가 0이면 막대 길이는 0이고 전환율은 없다', () => {
    const rows = funnelRows([
      { step: 'intake_submitted', count: 0 },
      { step: 'match_viewed', count: 0 },
    ]);
    expect(rows.map((row) => [row.rate, row.share])).toEqual([
      [null, 0],
      [null, 0],
    ]);
  });
});
