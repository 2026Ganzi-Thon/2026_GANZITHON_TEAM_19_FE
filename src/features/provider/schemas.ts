import { z } from 'zod';

import { PROFILE } from '@/copy/provider';
import { countChars } from '@/lib/text';

// 글자 수·형식 규칙은 백엔드 Bean Validation(openapi.json)과 TRD T-01·E-01 을 따른다
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 12;
export const BIO_MIN_CHARS = 50;
export const BIO_MAX_CHARS = 500;
export const MAX_SPECIALTIES = 5;
const REAL_NAME_MAX = 30;
const SCHOOL_MAX = 50;
const CAREER_ORG_MAX = 50;
const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/u;

const careerSchema = z.object({
  org: z.string().trim().min(1, PROFILE.careerRule).max(CAREER_ORG_MAX, PROFILE.careerRule),
  from: z.string().regex(YEAR_MONTH, PROFILE.careerRule),
  to: z.string().refine((value) => value === '' || YEAR_MONTH.test(value), PROFILE.careerRule),
});

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .refine((value) => {
      const length = countChars(value);
      return length >= DISPLAY_NAME_MIN && length <= DISPLAY_NAME_MAX;
    }, PROFILE.displayNameRule),
  realName: z.string().trim().min(1, PROFILE.realNameRule).max(REAL_NAME_MAX, PROFILE.realNameRule),
  serviceLabel: z.enum(['coaching', 'listener', 'buddy']),
  specialties: z
    .array(z.string())
    .min(1, PROFILE.specialtiesRule)
    .max(MAX_SPECIALTIES, PROFILE.specialtiesRule),
  bio: z
    .string()
    .refine((value) => countChars(value.trim()) >= BIO_MIN_CHARS, PROFILE.bioTooLong)
    .refine((value) => countChars(value.trim()) <= BIO_MAX_CHARS, PROFILE.bioTooLong),
  school: z.string().trim().max(SCHOOL_MAX, PROFILE.schoolRule),
  career: z.array(careerSchema),
  acceptsSupervision: z.boolean(),
});

export type ProfileForm = z.infer<typeof profileSchema>;
