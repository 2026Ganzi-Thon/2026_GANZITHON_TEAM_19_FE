import { type ReactNode, useState } from 'react';

import { ADMIN } from '@/copy/admin';
import { cx } from '@/lib/cx';

import { Button } from './Button';

export interface Column<Row> {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  /** 있으면 머리글을 눌러 이 값으로 정렬할 수 있다 */
  sortValue?: (row: Row) => string | number;
}

interface DataTableProps<Row> {
  /** 표가 무엇인지 스크린리더에 알려 준다 */
  caption: string;
  columns: ReadonlyArray<Column<Row>>;
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  /** 있으면 행 끝에 '열기' 버튼이 생긴다 */
  onRowOpen?: (row: Row) => void;
  /** 커서 페이지: 다음 쪽이 있으면 '더 보기' 를 보여 준다 */
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

interface SortState {
  key: string;
  descending: boolean;
}

function compare(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'ko');
}

/** 어드민 목록 표 (TRD 16장, 18-1). 필터는 화면이 URL 쿼리스트링에 맞춰 넘긴다 */
export function DataTable<Row>({
  caption,
  columns,
  rows,
  rowKey,
  onRowOpen,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: DataTableProps<Row>) {
  const [sort, setSort] = useState<SortState | null>(null);
  const sortValue = columns.find((column) => column.key === sort?.key)?.sortValue;
  const direction = sort?.descending ? -1 : 1;
  const sortedRows = sortValue
    ? [...rows].sort((a, b) => compare(sortValue(a), sortValue(b)) * direction)
    : rows;

  function toggleSort(key: string) {
    setSort((current) =>
      current?.key === key ? { key, descending: !current.descending } : { key, descending: false },
    );
  }

  function ariaSort(key: string): 'ascending' | 'descending' | 'none' {
    if (sort?.key !== key) return 'none';
    return sort.descending ? 'descending' : 'ascending';
  }

  function sortMark(key: string): string {
    if (sort?.key !== key) return '↕';
    return sort.descending ? '↓' : '↑';
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-body-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border-strong text-fg-muted">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={column.sortValue ? ariaSort(column.key) : undefined}
                className="px-3 py-3 font-medium"
              >
                {column.sortValue ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className={cx(
                      'flex min-h-(--size-touch) items-center gap-1',
                      sort?.key === column.key && 'font-bold text-fg',
                    )}
                  >
                    {column.header}
                    <span aria-hidden="true">{sortMark(column.key)}</span>
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
            {onRowOpen && (
              <th scope="col" className="px-3 py-3 font-medium">
                <span className="sr-only">{ADMIN.open}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-line">
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-3 align-top text-fg">
                  {column.render(row)}
                </td>
              ))}
              {onRowOpen && (
                <td className="px-3 py-2 text-right">
                  <Button size="md" variant="secondary" onClick={() => onRowOpen(row)}>
                    {ADMIN.open}
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="px-3 py-10 text-body-sm text-fg-muted">{ADMIN.empty}</p>}
      {hasMore && onLoadMore && (
        <Button
          size="md"
          variant="secondary"
          className="mt-4"
          loading={loadingMore}
          onClick={onLoadMore}
        >
          {ADMIN.more}
        </Button>
      )}
    </div>
  );
}
