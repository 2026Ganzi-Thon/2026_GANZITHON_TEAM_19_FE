// 글자 수와 입력 패턴 규칙을 한 곳에서 계산한다 (TRD 17-7).

const WHITESPACE = /\s/gu;

/** 코드 포인트 기준 글자 수. 백엔드 Bean Validation(12-6)과 같은 기준이다. */
export function countChars(value: string): number {
  return Array.from(value).length;
}

/** 공백을 뺀 글자 수. 슈퍼비전 항목에 쓴다. */
export function countCharsWithoutSpaces(value: string): number {
  return countChars(value.replace(WHITESPACE, ''));
}

const PHONE = /01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/u;
const LANDLINE = /0\d{1,2}[-.\s]\d{3,4}[-.\s]\d{4}/u;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/u;
const MESSENGER_ID =
  /(카톡|카카오톡|카카오|인스타|인스타그램|텔레그램|라인|디엠|DM|kakao|insta|telegram)\s*(아이디|id|ID)?\s*[:：는은]?\s*@?[A-Za-z0-9._]{3,}/iu;

/** 연락처 교환으로 보이는 입력인지 본다 (TRD T-06: 전송 전 경고). */
export function containsContact(value: string): boolean {
  return [PHONE, LANDLINE, EMAIL, MESSENGER_ID].some((pattern) => pattern.test(value));
}

const LONG_DIGITS = /\d{8,}/u;

/** 실명·연락처처럼 보이는 닉네임인지 본다 (TRD A-03: 숫자 8자 이상, @ 포함). */
export function looksLikePersonalInfo(value: string): boolean {
  return value.includes('@') || LONG_DIGITS.test(value);
}
