import { describe, expect, it } from 'vitest';

import {
  containsContact,
  countChars,
  countCharsWithoutSpaces,
  looksLikePersonalInfo,
} from './text';

describe('countChars', () => {
  it('counts an emoji made of a surrogate pair as one character', () => {
    expect(countChars('가😀b')).toBe(3);
  });

  it('ignores whitespace only when asked to', () => {
    expect(countChars('가 나\n다')).toBe(5);
    expect(countCharsWithoutSpaces('가 나\n다')).toBe(3);
  });
});

describe('containsContact', () => {
  it.each([
    '제 번호는 010-1234-5678 이에요',
    '01012345678로 연락 주세요',
    'mail me at someone@example.com',
    '카톡 아이디 warm_cloud 로 주세요',
    '인스타 @warm.cloud',
  ])('flags "%s"', (text) => {
    expect(containsContact(text)).toBe(true);
  });

  it.each([
    '요즘 잠을 3시간밖에 못 자요',
    '2026년 11월 3일 19:00에 만나요',
    '이직 방법을 알아보고 있어요',
  ])('does not flag "%s"', (text) => {
    expect(containsContact(text)).toBe(false);
  });
});

describe('looksLikePersonalInfo', () => {
  it('warns about long digit runs and at-signs', () => {
    expect(looksLikePersonalInfo('01012345678')).toBe(true);
    expect(looksLikePersonalInfo('me@home')).toBe(true);
  });

  it('accepts an ordinary nickname with a short number', () => {
    expect(looksLikePersonalInfo('따뜻한구름123')).toBe(false);
  });
});
