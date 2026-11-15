// 운영 설정 값은 키마다 모양이 다른 JSON 이다. 모양에 따라 입력 방식을 고른다 (M-10)
export type Primitive = string | number | boolean;
export type SettingMode = 'primitive' | 'fields' | 'json';
export type ParsedValue = { ok: true; value: unknown } | { ok: false };

export function isPrimitive(value: unknown): value is Primitive {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

/** 글·숫자·켜기끄기만 든 한 겹짜리 묶음인지 */
export function isFieldMap(value: unknown): value is Record<string, Primitive> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(isPrimitive)
  );
}

/** 값 하나면 입력란 하나, 한 겹 묶음이면 항목별 입력란, 그 밖(목록·여러 겹)은 JSON 편집 */
export function settingMode(value: unknown): SettingMode {
  if (isPrimitive(value)) return 'primitive';
  if (isFieldMap(value) && Object.keys(value).length > 0) return 'fields';
  return 'json';
}

/** 숫자 입력란을 비우면 NaN 이 된다. 그런 값은 저장하지 않는다 */
export function hasInvalidNumber(value: unknown): boolean {
  if (typeof value === 'number') return Number.isNaN(value);
  if (isFieldMap(value)) return Object.values(value).some(hasInvalidNumber);
  return false;
}

export function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function parseJson(text: string): ParsedValue {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    // 형식이 틀리면 저장하지 않고 입력란 아래에 알려 준다
    return { ok: false };
  }
}
