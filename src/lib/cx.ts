type ClassValue = string | false | null | undefined;

/** 조건부 클래스 이름을 이어 붙인다. */
export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
