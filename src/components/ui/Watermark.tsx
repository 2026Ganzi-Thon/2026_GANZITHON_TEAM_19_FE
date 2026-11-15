const TILE_COUNT = 24;
const TILES = Array.from({ length: TILE_COUNT }, (_, index) => index);

interface WatermarkProps {
  text: string;
}

/**
 * 화면 전체에 옅게 깔리는 대각선 문구 (TRD 18-1). 열람한 사람을 드러내 외부 유출을 막는다.
 * 눌리지 않고, 인쇄할 때도 그대로 찍힌다.
 */
export function Watermark({ text }: WatermarkProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 grid select-none grid-cols-2 content-around overflow-hidden opacity-10 print:opacity-25"
    >
      {TILES.map((index) => (
        <span
          key={index}
          className="-rotate-30 whitespace-nowrap text-center text-caption font-bold text-fg"
        >
          {text}
        </span>
      ))}
    </div>
  );
}
