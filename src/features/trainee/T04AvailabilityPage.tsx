import { AvailabilityView } from '@/features/provider/AvailabilityView';

/** T-04 가용 시간 관리 (수련생: 30분 단위) */
export function T04AvailabilityPage() {
  return <AvailabilityView professional={false} />;
}
