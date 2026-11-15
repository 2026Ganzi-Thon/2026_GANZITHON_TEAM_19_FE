import { useState } from 'react';

import type { MySlot } from '@/api/endpoints/slots';
import { AVAILABILITY } from '@/copy/work';
import { type DayCell, dayCells, sameInstant } from '@/features/provider/availability';
import { cx } from '@/lib/cx';
import { formatKSTShortDate, kstToUtcIso } from '@/lib/date';

import { Button } from './Button';
import { Chip } from './Chip';

const NOON = '12:00';

interface WeekGridProps {
  /** 보여 줄 날짜들 (한국 날짜 키) */
  days: readonly string[];
  slots: readonly MySlot[];
  /** 칸 간격(분). 코칭 30분, 전문 상담 60분(50분 + 휴식 10분) */
  slotMinutes: number;
  now: number;
  /** 고른 시간들을 한 번에 연다 */
  onCreate: (starts: string[]) => void;
  onDelete: (slot: MySlot) => void;
  /** 새 시간을 열 수 없는 상태 (배정 정지) */
  disabled?: boolean;
  busy?: boolean;
}

/**
 * 가용 시간 격자 (TRD T-04, 18-1). 웹앱 틀이 휴대폰 폭이라 하루씩 본다.
 * 빈 칸을 눌러 고르고 한 번에 열며, 열린 칸을 누르면 닫는다. 예약된 칸은 잠겨 있다.
 */
export function WeekGrid({
  days,
  slots,
  slotMinutes,
  now,
  onCreate,
  onDelete,
  disabled = false,
  busy = false,
}: WeekGridProps) {
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const day = pickedDay && days.includes(pickedDay) ? pickedDay : (days[0] ?? '');
  const cells = day ? dayCells(day, slotMinutes) : [];

  function toggle(start: string) {
    setSelected((current) =>
      current.includes(start) ? current.filter((item) => item !== start) : [...current, start],
    );
  }

  function create() {
    onCreate(selected);
    setSelected([]);
  }

  function renderCell(cell: DayCell) {
    const slot = slots.find((item) => sameInstant(item.start_at, cell.start));
    const past = Date.parse(cell.start) <= now;
    const base = 'min-h-(--size-touch) rounded-sm border text-micro';

    if (slot?.status === 'open') {
      return (
        <button
          type="button"
          disabled={busy}
          aria-label={AVAILABILITY.cellOpen(cell.label)}
          onClick={() => onDelete(slot)}
          className={cx(base, 'border-brand-green bg-action font-bold text-fg-inverse')}
        >
          {cell.label}
        </button>
      );
    }
    if (slot?.status) {
      return (
        <button
          type="button"
          disabled
          aria-label={AVAILABILITY.cellLocked(cell.label, AVAILABILITY.slotStatus[slot.status])}
          className={cx(base, 'cursor-not-allowed border-line bg-chip text-fg-muted')}
        >
          {cell.label}
        </button>
      );
    }
    const picked = selected.includes(cell.start);
    return (
      <button
        type="button"
        disabled={past || disabled}
        aria-pressed={picked}
        aria-label={AVAILABILITY.cellEmpty(cell.label)}
        onClick={() => toggle(cell.start)}
        className={cx(
          base,
          'text-fg disabled:cursor-not-allowed disabled:text-fg-muted disabled:opacity-50',
          picked ? 'border-brand-yellow bg-brand-yellow font-bold' : 'border-line bg-surface',
        )}
      >
        {cell.label}
      </button>
    );
  }

  return (
    <div className="flex flex-col">
      <div
        role="group"
        aria-label={AVAILABILITY.daysLabel}
        className="-mx-6 flex gap-1.5 overflow-x-auto px-6 py-1.5 [scrollbar-width:thin]"
      >
        {days.map((key) => (
          <Chip
            key={key}
            selected={key === day}
            onClick={() => setPickedDay(key)}
            className="shrink-0"
          >
            {formatKSTShortDate(kstToUtcIso(key, NOON))}
          </Chip>
        ))}
      </div>

      <ul aria-label={AVAILABILITY.cellsLabel} className="grid grid-cols-4 gap-1.5 pt-3">
        {cells.map((cell) => (
          <li key={cell.start} className="flex flex-col">
            {renderCell(cell)}
          </li>
        ))}
      </ul>
      <p className="pt-3 text-micro text-fg-muted">{AVAILABILITY.legend}</p>

      <Button
        block
        className="mt-4"
        disabled={selected.length === 0 || disabled}
        loading={busy}
        onClick={create}
      >
        {AVAILABILITY.create(selected.length)}
      </Button>
    </div>
  );
}
