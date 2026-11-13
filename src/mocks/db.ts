import type { Schema } from '@/api/types';

type Me = Schema<'MeResponse'>;

interface MockDb {
  users: Map<string, Me>;
  sessions: Schema<'SessionResponse'>[];
  providers: Schema<'ProviderPublicResponse'>[];
}

const HOUR = 3_600_000;

function iso(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

const TRAINEE_ID = '00000000-0000-7000-8000-000000000101';
const EXPERT_ID = '00000000-0000-7000-8000-000000000201';
const CLIENT_ID = '00000000-0000-7000-8000-000000000001';

/** 목 모드에서 쓰는 메모리 데이터. 시드 계정은 로그인 이메일의 @ 앞부분으로 고른다. */
export const mockDb: MockDb = {
  users: new Map<string, Me>([
    ['client1', { id: CLIENT_ID, role: 'client', status: 'active', nickname: '따뜻한구름' }],
    [
      'trainee1',
      {
        id: TRAINEE_ID,
        role: 'trainee',
        status: 'active',
        nickname: '하늘',
        provider_profile: { track: 'trainee', display_name: '하늘', specialties: ['burnout'] },
      },
    ],
    [
      'expert1',
      {
        id: EXPERT_ID,
        role: 'expert',
        status: 'active',
        nickname: '서온',
        provider_profile: { track: 'expert', display_name: '서온', specialties: ['career'] },
      },
    ],
    [
      'admin1',
      {
        id: '00000000-0000-7000-8000-000000000901',
        role: 'admin',
        status: 'active',
        nickname: '운영자',
      },
    ],
  ]),
  sessions: [
    {
      session_id: '00000000-0000-7000-8000-00000000a001',
      track: 'coaching',
      status: 'CONFIRMED',
      client_id: CLIENT_ID,
      provider_id: TRAINEE_ID,
      scheduled_start: iso(5 * 60_000),
      scheduled_end: iso(35 * 60_000),
    },
    {
      session_id: '00000000-0000-7000-8000-00000000a002',
      track: 'coaching',
      status: 'COMPLETED',
      client_id: CLIENT_ID,
      provider_id: TRAINEE_ID,
      scheduled_start: iso(-72 * HOUR),
      scheduled_end: iso(-71.5 * HOUR),
      rating: 5,
    },
  ],
  providers: [
    {
      provider_id: TRAINEE_ID,
      display_name: '하늘',
      track: 'trainee',
      service_label: 'coaching',
      specialties: ['burnout'],
      bio: '천천히 들을게요.',
      rating_avg: 4.8,
      rating_count: 12,
    },
    {
      provider_id: EXPERT_ID,
      display_name: '서온',
      track: 'expert',
      specialties: ['career'],
      cert_names: ['임상심리사 1급'],
      rating_avg: 4.9,
      rating_count: 31,
    },
  ],
};
