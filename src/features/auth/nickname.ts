const ADJECTIVES = [
  '따뜻한',
  '포근한',
  '잔잔한',
  '맑은',
  '느긋한',
  '고요한',
  '다정한',
  '산뜻한',
] as const;
const NOUNS = ['구름', '바람', '햇살', '달빛', '숲길', '파도', '새벽', '온기'] as const;

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] as T;
}

/** 랜덤 닉네임 (TRD A-03, 예: 따뜻한구름123). */
export function randomNickname(random: () => number = Math.random): string {
  const number = Math.floor(random() * 900) + 100;
  return `${pick(ADJECTIVES, random)}${pick(NOUNS, random)}${number}`;
}
