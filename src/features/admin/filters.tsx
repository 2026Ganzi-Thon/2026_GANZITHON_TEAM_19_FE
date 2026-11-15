import { useSearchParams } from 'react-router';

import { ADMIN } from '@/copy/admin';

/** 표 필터를 URL 쿼리스트링에 둔다. 새로고침·공유 뒤에도 유지된다 (TRD 11-3) */
export function useUrlFilters<Key extends string>(
  keys: readonly Key[],
): [Record<Key, string>, (key: Key, value: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const values = Object.fromEntries(
    keys.map((key) => [key, searchParams.get(key) ?? '']),
  ) as Record<Key, string>;

  function setFilter(key: Key, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  return [values, setFilter];
}

interface FilterSelectProps {
  id: string;
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
  /** 맨 위에 '전체' 를 둘지. 값을 꼭 골라야 하는 곳에서는 false */
  withAll?: boolean;
}

/** 선택 상자 하나. 필터로 쓸 때 맨 위 선택지는 '전체' 다 */
export function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
  withAll = true,
}: FilterSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-micro text-fg-muted">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-(--size-touch) rounded-sm border border-border bg-field px-3 text-body-sm text-fg"
      >
        {withAll && <option value="">{ADMIN.all}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** 선택지 값 → 이름 표에서 필터 선택지를 만든다 */
export function optionsOf(labels: Record<string, string>): Array<{ value: string; label: string }> {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}
