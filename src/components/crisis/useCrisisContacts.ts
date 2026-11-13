import { useQuery } from '@tanstack/react-query';

import { getCrisisContacts } from '@/api/endpoints/public';
import { queryKeys } from '@/api/queryKeys';
import { DEFAULT_CRISIS_CONTACTS } from '@/copy/fixed';

export interface CrisisContactView {
  number: string;
  name: string;
}

const STALE_MS = 10 * 60_000;

/** 위기 연락처. 서버에서 못 받으면 내장 기본값을 쓴다 (TRD 17-5). */
export function useCrisisContacts(): readonly CrisisContactView[] {
  const { data } = useQuery({
    queryKey: queryKeys.crisisContacts,
    queryFn: getCrisisContacts,
    staleTime: STALE_MS,
    retry: false,
  });

  const fromServer = (data ?? []).flatMap((contact) =>
    contact.number ? [{ number: contact.number, name: contact.name ?? '' }] : [],
  );
  return fromServer.length > 0 ? fromServer : DEFAULT_CRISIS_CONTACTS;
}
