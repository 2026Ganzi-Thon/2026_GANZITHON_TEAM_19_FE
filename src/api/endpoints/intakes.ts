import { api } from '@/api/client';
import type { Schema } from '@/api/types';

export type IntakeCreate = Schema<'IntakeCreateRequest'>;
export type Intake = Schema<'IntakeResponse'>;
export type Match = Schema<'Match'>;
export type IntakeCategory = IntakeCreate['category'];

/** INT-01. 태깅·위기 판정·매칭을 한 번에 한다 (최대 8초) */
export async function createIntake(body: IntakeCreate): Promise<Intake> {
  const { data } = await api.post<Intake>('/intakes', body);
  return data;
}

/** INT-02 */
export async function getMatches(intakeId: string): Promise<Match[]> {
  const { data } = await api.get<Match[]>(`/intakes/${intakeId}/matches`);
  return data;
}
