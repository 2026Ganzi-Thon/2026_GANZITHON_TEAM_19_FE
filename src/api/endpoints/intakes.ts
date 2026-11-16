import { api } from '@/api/client';
import type { Schema } from '@/api/types';

export type IntakeCreate = Schema<'IntakeCreateRequest'>;
export type Intake = Schema<'IntakeResponse'>;
export type Match = Schema<'Match'>;
export type IntakeCategory = IntakeCreate['category'];

/**
 * INT-01. 태깅·위기 판정·매칭을 한 번에 한다 (최대 8초).
 * 문서에서는 선택 항목이지만, 서버는 본문에 예/아니오 값이 빠져 있으면 형식 오류(400)로 본다.
 * 그래서 받지 못한 값도 채워서 보낸다.
 */
export async function createIntake(body: IntakeCreate): Promise<Intake> {
  const { data } = await api.post<Intake>('/intakes', {
    ...body,
    share_raw: body.share_raw ?? false,
    preferred_times: body.preferred_times ?? [],
    notify_when_available: body.notify_when_available ?? false,
  });
  return data;
}

/** INT-02 */
export async function getMatches(intakeId: string): Promise<Match[]> {
  const { data } = await api.get<Match[]>(`/intakes/${intakeId}/matches`);
  return data;
}
