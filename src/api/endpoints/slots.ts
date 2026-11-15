import { api } from '@/api/client';
import type { Schema } from '@/api/types';

export type MySlot = Schema<'MySlotResponse'>;

/** SLT-01. 내가 열어 둔 시간 */
export async function listMySlots(params: { from: string; to: string }): Promise<MySlot[]> {
  const { data } = await api.get<MySlot[]>('/me/slots', { params });
  return data;
}

/** SLT-02. 여러 시간을 한 번에 연다. repeat_weeks 만큼 매주 같은 시간에 더 만든다 (최대 4주) */
export async function createSlots(body: Schema<'SlotCreateRequest'>): Promise<MySlot[]> {
  const { data } = await api.post<MySlot[]>('/me/slots', body);
  return data;
}

/** SLT-04. 예약된 시간은 지울 수 없다 (409 SLOT_BOOKED) */
export async function deleteSlot(slotId: string): Promise<void> {
  await api.delete(`/me/slots/${slotId}`);
}
