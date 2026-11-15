import { describe, expect, it } from 'vitest';

import { hasInvalidNumber, parseJson, sameValue, settingMode } from './settingValue';

describe('settingMode', () => {
  it('값 하나는 입력란 하나로 고친다', () => {
    expect(settingMode(48)).toBe('primitive');
    expect(settingMode('안내')).toBe('primitive');
  });

  it('한 겹 묶음은 항목별 입력란으로 고친다', () => {
    expect(settingMode({ price: 15000, duration_min: 30, fee_rate: 0.2 })).toBe('fields');
    expect(settingMode({ on: false, message: '' })).toBe('fields');
  });

  it('목록이나 여러 겹 값은 JSON 으로 고친다', () => {
    expect(settingMode([{ name: '자살예방상담', number: '109' }])).toBe('json');
    expect(settingMode({ nested: { a: 1 } })).toBe('json');
    expect(settingMode({})).toBe('json');
    expect(settingMode(null)).toBe('json');
  });
});

describe('hasInvalidNumber', () => {
  it('비운 숫자 입력란이 있으면 true', () => {
    expect(hasInvalidNumber(Number.NaN)).toBe(true);
    expect(hasInvalidNumber({ price: Number.NaN, duration_min: 30 })).toBe(true);
  });

  it('숫자가 모두 채워져 있으면 false', () => {
    expect(hasInvalidNumber({ price: 0, on: true, message: '' })).toBe(false);
  });
});

describe('sameValue · parseJson', () => {
  it('내용이 같으면 바뀌지 않은 것으로 본다', () => {
    expect(sameValue({ price: 1 }, { price: 1 })).toBe(true);
    expect(sameValue({ price: 1 }, { price: 2 })).toBe(false);
  });

  it('틀린 JSON 은 ok: false 로 돌려준다', () => {
    expect(parseJson('[1, 2')).toEqual({ ok: false });
    expect(parseJson('[1, 2]')).toEqual({ ok: true, value: [1, 2] });
  });
});
