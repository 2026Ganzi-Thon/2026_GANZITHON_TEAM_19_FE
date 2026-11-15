import { describe, expect, it } from 'vitest';

import { checkoutSchema, complaintSchema, intakeSchema, reviewSchema } from './schemas';

const intake = { shareRaw: false, preferredTimes: [] };

describe('intakeSchema', () => {
  it('needs at least twenty characters', () => {
    expect(intakeSchema.safeParse({ ...intake, text: '가'.repeat(19) }).success).toBe(false);
    expect(intakeSchema.safeParse({ ...intake, text: '가'.repeat(20) }).success).toBe(true);
  });

  it('does not count padding spaces', () => {
    const padded = `   ${'가'.repeat(19)}   `;

    expect(intakeSchema.safeParse({ ...intake, text: padded }).success).toBe(false);
  });

  it('counts an emoji as one character like the server does', () => {
    expect(intakeSchema.safeParse({ ...intake, text: '😢'.repeat(20) }).success).toBe(true);
  });

  it('stops at two thousand characters', () => {
    expect(intakeSchema.safeParse({ ...intake, text: '가'.repeat(2000) }).success).toBe(true);
    expect(intakeSchema.safeParse({ ...intake, text: '가'.repeat(2001) }).success).toBe(false);
  });

  it('accepts only the known times of day', () => {
    const text = '가'.repeat(20);

    expect(
      intakeSchema.safeParse({ text, shareRaw: true, preferredTimes: ['evening', 'night'] })
        .success,
    ).toBe(true);
    expect(intakeSchema.safeParse({ text, shareRaw: true, preferredTimes: ['noon'] }).success).toBe(
      false,
    );
  });
});

describe('checkoutSchema', () => {
  const blank = { needsIdentity: false, name: '', birth: '', phone: '', refundAgreed: true };

  function issuePaths(value: unknown): string[] {
    const result = checkoutSchema.safeParse(value);
    return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
  }

  it('asks only for the refund agreement once identity was verified', () => {
    expect(issuePaths(blank)).toEqual([]);
    expect(issuePaths({ ...blank, refundAgreed: false })).toEqual(['refundAgreed']);
  });

  it('checks name, birth date and phone when identity is still needed', () => {
    expect(issuePaths({ ...blank, needsIdentity: true })).toEqual(['name', 'birth', 'phone']);
  });

  it('accepts a phone number with or without hyphens', () => {
    const filled = { ...blank, needsIdentity: true, name: '김마음', birth: '1998-03-02' };

    expect(issuePaths({ ...filled, phone: '010-1234-5678' })).toEqual([]);
    expect(issuePaths({ ...filled, phone: '01012345678' })).toEqual([]);
    expect(issuePaths({ ...filled, phone: '02-123-4567' })).toEqual(['phone']);
  });

  it('rejects a birth date in the future or in another format', () => {
    const filled = { ...blank, needsIdentity: true, name: '김마음', phone: '010-1234-5678' };

    expect(issuePaths({ ...filled, birth: '2999-01-01' })).toEqual(['birth']);
    expect(issuePaths({ ...filled, birth: '98.03.02' })).toEqual(['birth']);
  });
});

describe('reviewSchema', () => {
  it('lets the review stay empty and stops at one thousand characters', () => {
    expect(reviewSchema.safeParse({ text: '' }).success).toBe(true);
    expect(reviewSchema.safeParse({ text: '가'.repeat(1000) }).success).toBe(true);
    expect(reviewSchema.safeParse({ text: '가'.repeat(1001) }).success).toBe(false);
  });
});

describe('complaintSchema', () => {
  const description = '가'.repeat(20);

  it('needs a category and at least twenty characters', () => {
    expect(complaintSchema.safeParse({ category: 'insincere', description }).success).toBe(true);
    expect(complaintSchema.safeParse({ description }).success).toBe(false);
    expect(
      complaintSchema.safeParse({ category: 'insincere', description: '가'.repeat(19) }).success,
    ).toBe(false);
  });

  it('rejects an unknown category and an overlong description', () => {
    expect(complaintSchema.safeParse({ category: 'rude', description }).success).toBe(false);
    expect(
      complaintSchema.safeParse({ category: 'other', description: '가'.repeat(1001) }).success,
    ).toBe(false);
  });
});
