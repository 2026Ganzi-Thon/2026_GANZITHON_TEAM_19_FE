import type { Schema } from '@/api/types';
import { kstDateKey, kstToUtcIso } from '@/lib/date';

type Me = Schema<'MeResponse'>;
export type MockSession = Schema<'SessionResponse'>;

export interface MockSlot extends Schema<'OpenSlotResponse'> {
  provider_id: string;
  status: 'open' | 'held' | 'booked';
}

interface MockOrder {
  session_id: string;
  amount: number;
}

interface MockDb {
  users: Map<string, Me>;
  sessions: MockSession[];
  providers: Schema<'ProviderPublicResponse'>[];
  slots: MockSlot[];
  intakes: Map<string, Schema<'IntakeResponse'>>;
  messages: Map<string, Schema<'MessageResponse'>[]>;
  orders: Map<string, MockOrder>;
  /** 세션 ID → 홀드 만료 시각(ms) */
  holds: Map<string, number>;
  /** 세션 ID → 잡아 둔 슬롯 ID */
  sessionSlots: Map<string, string>;
  verifiedUserIds: Set<string>;
  /** `${세션 ID}:${phase}` */
  moods: Set<string>;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const BOOKING_DAYS = 14;
const SLOT_TIMES = ['19:00', '20:00', '21:00'] as const;

/** 목 모드 가격. 실제 가격은 서버 설정값이다 */
export const MOCK_PRICE = { coaching: 15_000, professional: 60_000 } as const;

function iso(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

const CLIENT_ID = '00000000-0000-7000-8000-000000000001';
const TRAINEE_ID = '00000000-0000-7000-8000-000000000101';
const TRAINEE_2_ID = '00000000-0000-7000-8000-000000000102';
const TRAINEE_3_ID = '00000000-0000-7000-8000-000000000103';
const EXPERT_ID = '00000000-0000-7000-8000-000000000201';

/** 내일부터 2주 동안 저녁 슬롯을 만든다. restEvery 번째 날은 쉰다 */
function buildSlots(providerId: string, minutes: number, restEvery: number): MockSlot[] {
  return Array.from({ length: BOOKING_DAYS - 1 }, (_, index) => index + 1)
    .filter((day) => day % restEvery !== 0)
    .flatMap((day) => {
      const date = kstDateKey(Date.now() + day * DAY);
      return SLOT_TIMES.map((time): MockSlot => {
        const startAt = kstToUtcIso(date, time);
        return {
          id: crypto.randomUUID(),
          provider_id: providerId,
          start_at: startAt,
          end_at: new Date(Date.parse(startAt) + minutes * MINUTE).toISOString(),
          status: 'open',
        };
      });
    });
}

let messageSequence = 0;

/** 시간 순으로 정렬되는 UUIDv7 모양의 ID (백엔드 14-5: id 오름차순이 표시 순서) */
export function nextMessageId(): string {
  const time = Date.now().toString(16).padStart(12, '0');
  const sequence = (messageSequence++ % 0x1000).toString(16).padStart(3, '0');
  return `${time.slice(0, 8)}-${time.slice(8)}-7${sequence}-8000-000000000000`;
}

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
        provider_profile: { track: 'trainee', display_name: '하늘', specialties: ['번아웃'] },
      },
    ],
    [
      'expert1',
      {
        id: EXPERT_ID,
        role: 'expert',
        status: 'active',
        nickname: '서온',
        provider_profile: { track: 'expert', display_name: '서온', specialties: ['청년 진로'] },
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
      status: 'confirmed',
      client_id: CLIENT_ID,
      provider_id: TRAINEE_ID,
      scheduled_start: iso(5 * MINUTE),
      scheduled_end: iso(35 * MINUTE),
    },
    {
      session_id: '00000000-0000-7000-8000-00000000a002',
      track: 'coaching',
      status: 'completed',
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
      cert_names: ['상담심리 전공 수련생'],
      specialties: ['번아웃'],
      bio: '천천히 들을게요.',
      rating_avg: 4.8,
      rating_count: 12,
    },
    {
      provider_id: TRAINEE_2_ID,
      display_name: '다온',
      track: 'trainee',
      service_label: 'coaching',
      cert_names: ['상담심리 전공 수련생'],
      specialties: ['대인관계'],
      bio: '편하게 이야기해 주세요.',
      rating_avg: 4.6,
      rating_count: 8,
    },
    {
      provider_id: TRAINEE_3_ID,
      display_name: '보리',
      track: 'trainee',
      service_label: 'coaching',
      cert_names: ['임상심리 전공 수련생'],
      specialties: ['청년 진로'],
      bio: '같이 정리해 봐요.',
      rating_count: 0,
    },
    {
      provider_id: EXPERT_ID,
      display_name: '서온',
      track: 'expert',
      specialties: ['청년 진로', '번아웃'],
      cert_names: ['임상심리사 1급'],
      bio: '10년 동안 청년 상담을 해 왔어요.',
      rating_avg: 4.9,
      rating_count: 31,
    },
  ],
  slots: [
    ...buildSlots(TRAINEE_ID, 30, 4),
    ...buildSlots(TRAINEE_2_ID, 30, 3),
    ...buildSlots(TRAINEE_3_ID, 30, 5),
    ...buildSlots(EXPERT_ID, 50, 3),
  ],
  intakes: new Map(),
  messages: new Map(),
  orders: new Map(),
  holds: new Map(),
  sessionSlots: new Map(),
  verifiedUserIds: new Set(),
  moods: new Set(),
};
