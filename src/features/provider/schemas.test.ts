import { describe, expect, it } from 'vitest';

import { profileSchema } from './schemas';

const valid = {
  displayName: '하늘',
  realName: '김하늘',
  serviceLabel: 'coaching',
  specialties: ['번아웃'],
  bio: '가'.repeat(50),
  school: '',
  career: [],
  acceptsSupervision: false,
};

function issuePaths(value: unknown): string[] {
  const result = profileSchema.safeParse(value);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('profileSchema', () => {
  it('accepts a complete profile', () => {
    expect(issuePaths(valid)).toEqual([]);
  });

  it('keeps the public name between two and twelve characters', () => {
    expect(issuePaths({ ...valid, displayName: '하' })).toEqual(['displayName']);
    expect(issuePaths({ ...valid, displayName: '가'.repeat(13) })).toEqual(['displayName']);
  });

  it('needs one to five specialties', () => {
    expect(issuePaths({ ...valid, specialties: [] })).toEqual(['specialties']);
    expect(issuePaths({ ...valid, specialties: ['a', 'b', 'c', 'd', 'e', 'f'] })).toEqual([
      'specialties',
    ]);
  });

  it('needs an introduction of fifty to five hundred characters', () => {
    expect(issuePaths({ ...valid, bio: '가'.repeat(49) })).toEqual(['bio']);
    expect(issuePaths({ ...valid, bio: '가'.repeat(501) })).toEqual(['bio']);
  });

  it('checks the year-month format of career entries and lets the end stay open', () => {
    const career = [{ org: '마음센터', from: '2020-03', to: '' }];

    expect(issuePaths({ ...valid, career })).toEqual([]);
    expect(
      issuePaths({ ...valid, career: [{ org: '마음센터', from: '2020-13', to: '' }] }),
    ).toEqual(['career.0.from']);
  });
});
