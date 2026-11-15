// Figma '확정 포즈 01–07' 시트를 펫의 프레임으로 쓴다. 배율은 Mascot.tsx 와 같다 (시트 높이 315.1px).
// 앉은 포즈는 꼬리 오른쪽 끝과 바닥이 늘 같은 자리에 오게 창을 잡았다. 그래서 front 는 Mascot 의 welcome 과 위치가 같다.
// notch 는 창 왼쪽 위에 걸리는 포즈 번호 글자를 잘라낼 크기 [가로, 세로]다. 모든 값은 시트 픽셀을 재서 정했다.
export const PET_SHEET = { width: 420.13, height: 315.1 } as const;

/** 화면에서 차지하는 높이. 포즈가 바뀌어도 그대로라 위아래 글이 밀리지 않는다 */
export const PET_HEIGHT = 92;

export const PET_FRAMES = {
  /** 01 정면 */
  front: { left: -29.75, top: -12.65, width: 82, notch: [1.5, 7.5] },
  /** 02 왼쪽을 본다 */
  left: { left: -128.69, top: -12.65, width: 82, notch: [5.5, 7.5] },
  /** 03 오른쪽을 본다 */
  right: { left: -230.82, top: -12.65, width: 82, notch: [4, 7.5] },
  /** 04 위를 본다 */
  up: { left: -330.92, top: -12.65, width: 82, notch: [5.5, 7.5] },
  /** 05 고개를 숙인다 */
  nod: { left: -29.75, top: -127.55, width: 82, notch: [2, 10] },
  /** 06 몸을 돌린다 */
  turn: { left: -126.37, top: -127.55, width: 82, notch: [8, 11] },
  /** 07 엎드려 잔다. 가로로 길어서 창이 넓다 */
  sleep: { left: -217.98, top: -127.55, width: 89, notch: [17, 11] },
} as const;

export type PetFrame = keyof typeof PET_FRAMES;

/** 왼쪽 위 모서리를 notch 크기만큼 뺀 모양. 번호 글자를 배경색으로 덮지 않고 아예 그리지 않는다 */
export function notchClipPath([width, height]: readonly [number, number]): string {
  return `polygon(${width}px 0, 100% 0, 100% 100%, 0 100%, 0 ${height}px, ${width}px ${height}px)`;
}
