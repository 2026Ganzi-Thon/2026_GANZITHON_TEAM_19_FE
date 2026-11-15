import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type Column, DataTable } from './DataTable';

interface Row {
  id: string;
  name: string;
  amount: number;
}

const rows: Row[] = [
  { id: 'a', name: '다온', amount: 300 },
  { id: 'b', name: '가람', amount: 100 },
  { id: 'c', name: '나래', amount: 200 },
];

const columns: Column<Row>[] = [
  { key: 'name', header: '이름', render: (row) => row.name, sortValue: (row) => row.name },
  { key: 'amount', header: '금액', render: (row) => row.amount, sortValue: (row) => row.amount },
];

function names(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent ?? '');
}

describe('DataTable', () => {
  it('받은 순서대로 보여 주고, 머리글을 누르면 오름차순·내림차순으로 정렬한다', async () => {
    const user = userEvent.setup();
    render(<DataTable caption="목록" columns={columns} rows={rows} rowKey={(row) => row.id} />);
    expect(names()).toEqual(['다온', '가람', '나래']);

    await user.click(screen.getByRole('button', { name: /금액/ }));
    expect(names()).toEqual(['가람', '나래', '다온']);
    expect(screen.getByRole('columnheader', { name: /금액/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );

    await user.click(screen.getByRole('button', { name: /금액/ }));
    expect(names()).toEqual(['다온', '나래', '가람']);
  });

  it('행의 열기 버튼을 누르면 그 행을 넘긴다', async () => {
    const user = userEvent.setup();
    const onRowOpen = vi.fn();
    render(
      <DataTable
        caption="목록"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        onRowOpen={onRowOpen}
      />,
    );
    await user.click(screen.getAllByRole('button', { name: '열기' })[1] as HTMLElement);
    expect(onRowOpen).toHaveBeenCalledWith(rows[1]);
  });

  it('행이 없으면 빈 상태 문구를, 다음 쪽이 있으면 더 보기를 보여 준다', async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <DataTable caption="목록" columns={columns} rows={[]} rowKey={(row) => row.id} />,
    );
    expect(screen.getByText('조건에 맞는 항목이 없어요')).toBeInTheDocument();

    rerender(
      <DataTable
        caption="목록"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        hasMore
        onLoadMore={onLoadMore}
      />,
    );
    await user.click(screen.getByRole('button', { name: '더 보기' }));
    expect(onLoadMore).toHaveBeenCalledOnce();
  });
});
