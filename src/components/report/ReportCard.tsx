import type { ClientSummary } from '@/api/pending';
import { REPORT } from '@/copy/referral';

interface ReportCardProps {
  /** 내담자용 쉬운 말 요약 */
  summary: ClientSummary;
}

/** 상담 정리 4항목 (TRD C-11). 내담자에게는 쉬운 말로 풀어 쓴 요약만 보여 준다. */
export function ReportCard({ summary }: ReportCardProps) {
  const items = [
    { title: REPORT.chief, body: summary.chief_complaint },
    { title: REPORT.patterns, body: summary.thinking_patterns },
    {
      title: REPORT.triggers,
      body: [summary.triggers, summary.coping].filter(Boolean).join('\n'),
    },
    { title: REPORT.safety, body: summary.safety_check },
  ];

  return (
    <dl>
      {items.map((item) => (
        <div key={item.title} className="border-b border-line pb-3 pt-2.5 text-body-sm">
          <dt className="font-bold text-fg">{item.title}</dt>
          <dd className="whitespace-pre-line pt-1 text-fg-muted">{item.body}</dd>
        </div>
      ))}
    </dl>
  );
}
