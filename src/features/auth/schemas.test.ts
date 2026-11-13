import { describe, expect, it } from 'vitest';

import { credentialsSchema, nicknameSchema } from './schemas';

describe('credentialsSchema', () => {
  it('accepts an email with a password of letters and digits', () => {
    expect(credentialsSchema.safeParse({ email: 'a@b.co', password: 'abcd1234' }).success).toBe(
      true,
    );
  });

  it.each([
    ['not-an-email', 'abcd1234'],
    ['a@b.co', 'abc1234'],
    ['a@b.co', 'abcdefgh'],
    ['a@b.co', '12345678'],
  ])('rejects %s / %s', (email, password) => {
    expect(credentialsSchema.safeParse({ email, password }).success).toBe(false);
  });
});

describe('nicknameSchema', () => {
  it.each(['따뜻한구름123', 'ab', '가나다라마바사아자차카타'])('accepts %s', (nickname) => {
    expect(nicknameSchema.safeParse({ nickname }).success).toBe(true);
  });

  it.each(['a', '가나다라마바사아자차카타파', '따뜻한 구름', 'me@home', '구름!'])(
    'rejects %s',
    (nickname) => {
      expect(nicknameSchema.safeParse({ nickname }).success).toBe(false);
    },
  );
});
