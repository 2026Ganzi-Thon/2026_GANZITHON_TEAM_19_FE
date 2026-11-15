// 민원 대화록의 개인정보 치환 표시 ([이름1] [연락처1] [지명1] [직장1]) 를 찾아 강조한다 (M-06)
const MASK_TOKEN = /(\[(?:이름|연락처|지명|직장)\d+\])/;

export interface MaskPart {
  text: string;
  token: boolean;
}

export function splitMaskTokens(text: string): MaskPart[] {
  return text
    .split(MASK_TOKEN)
    .filter((part) => part !== '')
    .map((part) => ({ text: part, token: MASK_TOKEN.test(part) }));
}
