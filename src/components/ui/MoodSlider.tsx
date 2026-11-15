import { useId } from 'react';

import { MOOD } from '@/copy/client';
import { cx } from '@/lib/cx';

export const MOOD_MIN = 1;
export const MOOD_MAX = 10;
export const MOOD_DEFAULT = 5;

interface MoodSliderProps {
  /** 스크린리더가 읽는 이름 (화면의 질문 문구) */
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** 견줄 값 (상담 전 점수). 있으면 함께 보여 준다 */
  compareTo?: number;
  disabled?: boolean;
}

/** 마음 온도 1~10 (TRD 18-1). input type=range 기반이고 값은 "n점" 으로 읽힌다. */
export function MoodSlider({ label, value, onChange, compareTo, disabled }: MoodSliderProps) {
  const hintId = useId();
  const ratio = (value - MOOD_MIN) / (MOOD_MAX - MOOD_MIN);
  // 손잡이(16px) 가운데 위에 지금 값을 둔다
  const thumbCenter = `calc(${ratio} * (100% - var(--spacing) * 4) + var(--spacing) * 2)`;
  const atEdge = value === MOOD_MIN || value === MOOD_MAX;

  return (
    <div className="flex flex-col">
      {compareTo !== undefined && (
        <p className="pb-2 text-body-sm text-fg-muted">{MOOD.before(compareTo)}</p>
      )}
      <div
        aria-hidden="true"
        className="relative flex justify-between text-body-sm font-medium text-fg"
      >
        <span className={cx(value === MOOD_MIN && 'font-bold')}>{MOOD_MIN}</span>
        {!atEdge && (
          <span className="absolute -translate-x-1/2 font-bold" style={{ left: thumbCenter }}>
            {value}
          </span>
        )}
        <span className={cx(value === MOOD_MAX && 'font-bold')}>{MOOD_MAX}</span>
      </div>
      <input
        type="range"
        min={MOOD_MIN}
        max={MOOD_MAX}
        step={1}
        value={value}
        disabled={disabled}
        aria-label={label}
        aria-valuetext={MOOD.valueText(value)}
        aria-describedby={hintId}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mood-range"
      />
      <p id={hintId} className="text-micro text-fg-muted">
        {MOOD.hint}
      </p>
    </div>
  );
}
