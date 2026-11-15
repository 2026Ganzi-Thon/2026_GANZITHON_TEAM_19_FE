import { z } from 'zod';

import { CHECKOUT, DONE, INTAKE, TEXT_COUNT } from '@/copy/client';
import { COMPLAINT } from '@/copy/referral';
import { countChars } from '@/lib/text';

// 글자 수·형식 규칙은 백엔드 Bean Validation(openapi.json)과 같게 둔다 (TRD 10-2)
export const INTAKE_MIN_CHARS = 20;
export const INTAKE_MAX_CHARS = 2000;
export const REVIEW_MAX_CHARS = 1000;
const NAME_MAX_CHARS = 30;
const PHONE = /^01[0-9]-?\d{3,4}-?\d{4}$/u;
const BIRTH = /^\d{4}-\d{2}-\d{2}$/u;

// TRD C-03: 고민 글 20~2,000자, 선호 시간대 복수 선택
export const intakeSchema = z.object({
  text: z
    .string()
    .refine(
      (value) => countChars(value.trim()) >= INTAKE_MIN_CHARS,
      TEXT_COUNT.moreNeeded(INTAKE_MIN_CHARS),
    )
    .refine((value) => countChars(value.trim()) <= INTAKE_MAX_CHARS, INTAKE.textTooLong),
  shareRaw: z.boolean(),
  preferredTimes: z.array(z.enum(['morning', 'afternoon', 'evening', 'night'])),
});

export type IntakeForm = z.infer<typeof intakeSchema>;

function isPastDate(value: string): boolean {
  if (!BIRTH.test(value)) return false;
  const time = Date.parse(value);
  return !Number.isNaN(time) && time < Date.now();
}

// TRD C-06: 본인인증(이름·생년월일·휴대폰)은 처음 한 번만 받는다. needsIdentity 가 false 면 검사하지 않는다
export const checkoutSchema = z
  .object({
    needsIdentity: z.boolean(),
    name: z.string(),
    birth: z.string(),
    phone: z.string(),
    refundAgreed: z.boolean().refine((value) => value, CHECKOUT.refundRequired),
  })
  .superRefine((value, context) => {
    if (!value.needsIdentity) return;
    const nameLength = countChars(value.name.trim());
    if (nameLength < 1 || nameLength > NAME_MAX_CHARS) {
      context.addIssue({ code: 'custom', path: ['name'], message: CHECKOUT.nameRequired });
    }
    if (!isPastDate(value.birth)) {
      context.addIssue({ code: 'custom', path: ['birth'], message: CHECKOUT.birthInvalid });
    }
    if (!PHONE.test(value.phone.trim())) {
      context.addIssue({ code: 'custom', path: ['phone'], message: CHECKOUT.phoneInvalid });
    }
  });

export type CheckoutForm = z.infer<typeof checkoutSchema>;

// TRD C-10: 한 줄 후기는 선택
export const reviewSchema = z.object({
  text: z
    .string()
    .refine((value) => countChars(value.trim()) <= REVIEW_MAX_CHARS, DONE.reviewTooLong),
});

export type ReviewForm = z.infer<typeof reviewSchema>;

export const COMPLAINT_MIN_CHARS = 20;
export const COMPLAINT_MAX_CHARS = 1000;

// TRD C-13: 유형 선택 + 내용 20~1,000자
export const complaintSchema = z.object({
  category: z.enum(
    ['late_noshow', 'religion_moralizing', 'private_contact', 'insincere', 'other'],
    {
      error: COMPLAINT.categoryRequired,
    },
  ),
  description: z
    .string()
    .refine(
      (value) => countChars(value.trim()) >= COMPLAINT_MIN_CHARS,
      TEXT_COUNT.moreNeeded(COMPLAINT_MIN_CHARS),
    )
    .refine((value) => countChars(value.trim()) <= COMPLAINT_MAX_CHARS, COMPLAINT.tooLong),
});

export type ComplaintForm = z.infer<typeof complaintSchema>;
