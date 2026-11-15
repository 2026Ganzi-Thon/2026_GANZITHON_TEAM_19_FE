import type {
  Certificate,
  Competency,
  ExpertReferralItem,
  ExpertReport,
  ExpertReportContent,
  ExpertSupervisionItem,
  SessionHistoryItem,
  StrikeSummary,
  SupervisionContext,
  SupervisionRequestItem,
  SupervisionWrite,
  TraineeSupervision,
} from '@/api/pendingProvider';
import type { Schema } from '@/api/types';

// 수련생·전문가 화면의 목 데이터 (SUP, REF-05·06, RPT-02, SES-09, STL-01, CMP-05)
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function ago(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

function ahead(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

export const SEED_SESSION_ID = '00000000-0000-7000-8000-00000000a002';
export const SEED_REFERRAL_REPORT_ID = '00000000-0000-7000-8000-00000000c001';

const REPORT_CONTENT: ExpertReportContent = {
  chief_complaint: '업무 과부하에서 오는 소진과 수면 문제. 쉬는 것에 죄책감을 느낌.',
  timeline: [
    {
      session_no: 1,
      session_date: ago(10 * DAY),
      trainee_label: '수련생 A',
      key_points: ['야근이 이어지며 수면이 줄었다고 호소', '쉬면 뒤처진다는 불안'],
      mood_before: 4,
      mood_after: 5,
    },
    {
      session_no: 2,
      session_date: ago(3 * DAY),
      trainee_label: '수련생 A',
      key_points: ['주말에도 업무 생각이 멈추지 않음', '도움을 청하는 것을 약함으로 여김'],
      mood_before: 5,
      mood_after: 6,
    },
  ],
  distortions: [
    { name: '당위적 사고', evidence: '"쉬면 안 되는 사람인 것 같아요"', session_no: 1 },
    { name: '파국화', evidence: '"한 번 놓치면 다 끝날 것 같아요"', session_no: 2 },
  ],
  triggers: ['마감이 겹치는 주', '상사의 짧은 피드백'],
  defenses: ['합리화', '주지화'],
  progress: '회기를 거치며 소진을 스스로 알아차리는 표현이 늘었고 마음 온도가 4에서 6으로 올랐다.',
  red_flag: {
    max_level: 'low',
    history: [{ session_no: 1, level: 'low', evidence: '"다 그만두고 싶다"는 표현 1회' }],
  },
  focus_suggestions: ['완벽주의 신념 탐색', '수면 위생 점검', '지지 자원 확인'],
};

export const providerDb = {
  supervisions: [
    {
      id: 'sup-1',
      session_date: ago(3 * DAY),
      category: 'burnout',
      expert_display: '서온',
      submitted_at: ago(DAY),
      read_at: null,
      session_count: 1,
      well_done:
        '내담자의 속도에 맞춰 충분히 기다려 주었고, 감정을 그대로 되돌려 주는 반영이 안정적이었습니다.',
      blind_spot:
        '쉬는 것에 대한 죄책감이 반복해서 나왔지만 그 믿음이 어디서 왔는지는 다루지 못했습니다.',
      alternative_responses: [
        {
          quote: '그래도 쉬셔야죠.',
          suggestion: '쉬려고 하면 어떤 마음이 먼저 올라오나요?',
        },
      ],
      risk_rating: 'appropriate',
      risk_comment: '"다 그만두고 싶다"는 표현을 놓치지 않고 안전을 확인한 점이 적절했습니다.',
      next_action: '다음 회기에는 "쉬면 안 된다"는 생각이 처음 생긴 때를 함께 찾아보세요.',
      scores: { rapport: 4, empathy: 4, risk: 5, structure: 3 },
    },
  ] as TraineeSupervision[],

  competency: {
    radar: {
      recent5: { rapport: 4, empathy: 4, risk: 5, structure: 3 },
      all: { rapport: 3.5, empathy: 3.8, risk: 4.2, structure: 3 },
    },
    trend: [
      { submitted_at: ago(20 * DAY), scores: { rapport: 3, empathy: 3, risk: 4, structure: 3 } },
      { submitted_at: ago(DAY), scores: { rapport: 4, empathy: 4, risk: 5, structure: 3 } },
    ],
    totals: { session_hours: 42, session_count: 84, supervision_count: 6, referral_count: 2 },
  } as Competency,

  certificates: [] as Certificate[],

  supervisionRequests: [
    {
      id: 'req-1',
      session_id: SEED_SESSION_ID,
      session_date: ago(3 * DAY),
      question:
        '내담자가 쉬는 것에 죄책감을 느낀다고 반복해서 말했는데, 어떤 질문으로 더 깊이 들어갈 수 있었을지 궁금합니다.',
      status: 'pending',
      created_at: ago(2 * DAY),
      fee: 0,
      expert_display: null,
      trainee_display: '하늘',
    },
  ] as SupervisionRequestItem[],

  expertSupervisions: [
    {
      id: 'esup-1',
      trainee_display: '하늘',
      session_count: 2,
      due_at: ahead(2 * DAY),
      status: 'pending',
      settlement_locked: true,
      referral_total: 1,
      referral_remaining: 1,
    },
  ] as ExpertSupervisionItem[],

  /** 슈퍼비전 ID → 임시저장·제출 내용 */
  supervisionWrites: new Map<string, SupervisionWrite>(),

  referrals: [
    {
      id: 'ref-1',
      status: 'booked',
      client_nickname: '따뜻한구름',
      category: 'burnout',
      risk_level: 'low',
      scheduled_start: ahead(DAY),
      has_report_consent: true,
      report_ready: true,
      included_session_count: 2,
      trainee_reason: '반복되는 소진 호소가 있어 더 깊은 탐색이 필요해 보입니다.',
      respond_by: ahead(20 * HOUR),
      report_id: SEED_REFERRAL_REPORT_ID,
      session_id: null,
    },
    {
      id: 'ref-2',
      status: 'booked',
      client_nickname: '조용한바다',
      category: 'relationship',
      risk_level: 'none',
      scheduled_start: ahead(3 * DAY),
      has_report_consent: false,
      report_ready: false,
      included_session_count: 0,
      trainee_reason: null,
      respond_by: ahead(5 * HOUR),
      report_id: null,
      session_id: null,
    },
  ] as ExpertReferralItem[],

  strikes: {
    count: 1,
    limit: 3,
    next_action: '한 번 더 받으면 7일 동안 배정이 정지돼요.',
    items: [{ id: 'st-1', created_at: ago(15 * DAY), category: 'late_noshow', action: '경고' }],
  } as StrikeSummary,
};

export function expertReport(reportId: string): ExpertReport | undefined {
  if (reportId !== SEED_REFERRAL_REPORT_ID) return undefined;
  return {
    status: 'ready',
    content: REPORT_CONTENT,
    sources_meta: REPORT_CONTENT.timeline.map((item) => ({
      session_no: item.session_no,
      date: item.session_date,
      duration_min: 30,
      mood_before: item.mood_before,
      mood_after: item.mood_after,
      trainee_label: item.trainee_label,
    })),
    consent: { granted_at: ago(DAY), report_version: 1, scopes: ['report', 'transcript'] },
  };
}

export function supervisionContext(id: string): SupervisionContext {
  return {
    trainee_display: '하늘',
    position: { index: 1, total: 1, next_id: null },
    referral_report: REPORT_CONTENT,
    trainee_sessions: REPORT_CONTENT.timeline.map((item) => ({
      session_id: `masked-${item.session_no}`,
      session_no: item.session_no,
      date: item.session_date,
      masked_transcript: [
        { role: 'client', text: '요즘 일이 많아서 [이름] 팀장님 눈치가 보여요.' },
        { role: 'provider', text: '그래도 쉬셔야죠.' },
        { role: 'client', text: '쉬면 안 되는 사람인 것 같아요.' },
        { role: 'provider', text: '그런 마음이 드시는군요.' },
      ],
    })),
    trainee_risk_actions: ['위기 경고 1회 확인', '당직 전문가 호출 없음'],
    trainee_reason: '반복되는 소진 호소가 있어 더 깊은 탐색이 필요해 보입니다.',
    saved: providerDb.supervisionWrites.get(id) ?? null,
  };
}

export function sessionHistory(): SessionHistoryItem[] {
  return [
    {
      session_id: SEED_SESSION_ID,
      date: ago(3 * DAY),
      mood_before: 4,
      mood_after: 6,
      my_note: '쉬는 것에 대한 죄책감. 다음에는 주말 일과를 물어보기.',
    },
  ];
}

export function settlements(month: string, expert: boolean): Schema<'SettlementSummaryResponse'> {
  const items: Schema<'SettlementResponse'>[] = expert
    ? [
        {
          id: 'stl-e1',
          kind: 'session',
          gross: 60_000,
          fee: 12_000,
          net: 48_000,
          status: 'locked',
          status_reason: '이 연계의 슈퍼비전 1건 중 0건 작성',
          supervision_id: 'esup-1',
          created_at: ago(2 * DAY),
        },
        {
          id: 'stl-e2',
          kind: 'supervision',
          gross: 20_000,
          fee: 0,
          net: 20_000,
          status: 'paid',
          paid_at: ago(5 * DAY),
          created_at: ago(9 * DAY),
        },
      ]
    : [
        {
          id: 'stl-t1',
          kind: 'session',
          gross: 15_000,
          fee: 3_000,
          net: 12_000,
          status: 'pending',
          created_at: ago(3 * DAY),
        },
        {
          id: 'stl-t2',
          kind: 'session',
          gross: 15_000,
          fee: 3_000,
          net: 12_000,
          status: 'held',
          status_reason: '민원 심사 중',
          created_at: ago(8 * DAY),
        },
      ];
  return { month, items, totals: {} };
}
