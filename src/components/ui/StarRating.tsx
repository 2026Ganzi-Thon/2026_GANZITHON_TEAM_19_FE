const SCORES = [1, 2, 3, 4, 5] as const;
const FILLED = '★';
const EMPTY = '☆';

interface StarRatingProps {
  label: string;
  /** 각 별의 접근성 이름. 예: 별점 3점 */
  itemLabel: (score: number) => string;
  value: number | null;
  onChange: (value: number) => void;
}

/** 별점 1~5. 별 모양은 장식이고 값은 이름으로 읽힌다. */
export function StarRating({ label, itemLabel, value, onChange }: StarRatingProps) {
  return (
    <div role="radiogroup" aria-label={label} className="-ml-2.5 flex">
      {SCORES.map((score) => (
        <button
          key={score}
          type="button"
          role="radio"
          aria-checked={value === score}
          aria-label={itemLabel(score)}
          onClick={() => onChange(score)}
          className="flex size-(--size-touch) items-center justify-center text-headline text-fg"
        >
          <span aria-hidden="true">{value !== null && score <= value ? FILLED : EMPTY}</span>
        </button>
      ))}
    </div>
  );
}
