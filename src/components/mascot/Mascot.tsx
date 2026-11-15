import poses from '@/assets/mascot/poses.webp';
import { cx } from '@/lib/cx';

// Figma '확정 포즈 01–07' 시트에서 포즈 하나를 잘라 보여 준다.
// 시안과 같은 배율(시트 높이 315.1px)과 같은 창 위치를 쓴다.
const SHEET = { width: 420.13, height: 315.1 } as const;

// numbered: 잘라 낸 창 안에 시트의 포즈 번호가 걸려서 가려야 하는 포즈
const POSES = {
  /** 01 정면 · 환영 */
  welcome: { width: 82, height: 92, left: -29.75, top: -12.65, numbered: true },
  /** 02 왼쪽 · 선택 */
  choose: { width: 82, height: 96, left: -128.42, top: -12.65, numbered: true },
  /** 07 쉬는 모습 · 대기 */
  rest: { width: 90, height: 66, left: -216.97, top: -151.8, numbered: false },
} as const;

export type MascotPose = keyof typeof POSES;

interface MascotProps {
  pose: MascotPose;
  className?: string;
}

export function Mascot({ pose, className }: MascotProps) {
  const frame = POSES[pose];

  return (
    <div
      aria-hidden="true"
      className={cx('relative shrink-0 overflow-clip mix-blend-darken', className)}
      style={{ width: frame.width, height: frame.height }}
    >
      <img
        src={poses}
        alt=""
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute max-w-none"
        style={{ width: SHEET.width, height: SHEET.height, left: frame.left, top: frame.top }}
      />
      {frame.numbered && <div className="absolute left-0 top-0 h-3.5 w-2.5 bg-bg" />}
    </div>
  );
}
