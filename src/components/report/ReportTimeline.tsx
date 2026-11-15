import type { ClientSummary, ReportSource } from '@/api/pending';
import { formatKST } from '@/lib/date';

interface ReportTimelineProps {
  sources: readonly ReportSource[];
  /** 회기별 한 줄 요약 */
  lines?: ClientSummary['sessions'];
}

/** 종합 리포트에 포함된 상담을 날짜순으로 보여 준다 (TRD C-12 단계 3). */
export function ReportTimeline({ sources, lines }: ReportTimelineProps) {
  return (
    <ol className="pt-1 text-body-sm text-fg-muted">
      {sources.map((source) => {
        const line = lines?.find((item) => item.session_no === source.session_no)?.line;
        return (
          <li key={source.session_id}>
            {[formatKST(source.date, 'M월 D일'), source.provider_display].filter(Boolean).join(' ')}
            {line ? ` · ${line}` : ''}
          </li>
        );
      })}
    </ol>
  );
}
