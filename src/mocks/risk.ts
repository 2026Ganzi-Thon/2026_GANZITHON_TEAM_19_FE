import type { RiskLevel } from '@/stores/crisisStore';

const CRISIS_WORDS = ['자살', '죽고싶', '목숨을끊'];
const URGENT_WORDS = ['방법', '오늘', '약', '칼'];
const SELF_HARM_WORDS = ['자해', '해치고싶'];

/** 백엔드의 로컬 규칙과 같은 기준으로 위험 수준을 흉내 낸다 (목 모드 전용). */
export function assessMockRisk(text: string): RiskLevel {
  const normalized = text.replace(/\s+/gu, '');
  const crisis = CRISIS_WORDS.some((word) => normalized.includes(word));
  if (crisis && URGENT_WORDS.some((word) => normalized.includes(word))) return 'critical';
  if (crisis) return 'high';
  if (SELF_HARM_WORDS.some((word) => normalized.includes(word))) return 'medium';
  return 'none';
}
