import { z } from 'zod';

import { LOGIN, ONBOARDING } from '@/copy/screens';

const HAS_LETTER = /[A-Za-z]/u;
const HAS_DIGIT = /\d/u;
const NICKNAME = /^[가-힣A-Za-z0-9]{2,12}$/u;

// TRD A-02: 이메일 형식, 비밀번호 8자 이상(영문·숫자 포함)
export const credentialsSchema = z.object({
  email: z.email(LOGIN.emailInvalid),
  password: z
    .string()
    .min(8, LOGIN.passwordInvalid)
    .regex(HAS_LETTER, LOGIN.passwordInvalid)
    .regex(HAS_DIGIT, LOGIN.passwordInvalid),
});

export type Credentials = z.infer<typeof credentialsSchema>;

// TRD A-03: 닉네임 2~12자, 한글·영문·숫자
export const nicknameSchema = z.object({
  nickname: z.string().regex(NICKNAME, ONBOARDING.nicknameRule),
});

export type NicknameForm = z.infer<typeof nicknameSchema>;
