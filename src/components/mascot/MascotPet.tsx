import { useEffect, useState } from 'react';

import poses from '@/assets/mascot/poses.webp';
import { SHELL } from '@/copy/screens';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { usePageVisible } from '@/hooks/usePageVisible';
import { cx } from '@/lib/cx';

import { notchClipPath, PET_FRAMES, PET_HEIGHT, PET_SHEET } from './petFrames';
import { usePetLoop } from './usePetLoop';

export const PET_STORAGE_KEY = 'mindcare.pet.asleep';
/** 폴짝 뛰는 시간. styles/index.css 의 --animate-pet-hop 과 같은 값이다 */
export const PET_HOP_MS = 520;

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
// 왼쪽 소개는 lg(1024px)부터 보인다 (AppFrame). 안 보일 때는 움직이지 않는다
const INTRO_VISIBLE = '(min-width: 1024px)';

function readAsleep(): boolean {
  try {
    return window.localStorage.getItem(PET_STORAGE_KEY) === '1';
  } catch {
    // 저장소를 못 쓰는 브라우저에서는 깨어 있는 상태로 시작한다
    return false;
  }
}

function writeAsleep(asleep: boolean): void {
  try {
    if (asleep) window.localStorage.setItem(PET_STORAGE_KEY, '1');
    else window.localStorage.removeItem(PET_STORAGE_KEY);
  } catch {
    // 저장소를 못 쓰면 이번 방문 동안만 기억한다
  }
}

function motionClass(active: boolean, hopping: boolean): string | undefined {
  if (!active) return undefined;
  return hopping ? 'animate-pet-hop' : 'animate-pet-breathe';
}

interface MascotPetProps {
  /** 0 이상 1 미만의 난수. 테스트에서 동작 순서를 고정할 때 넘긴다 */
  random?: () => number;
}

/**
 * 왼쪽 소개에서 혼자 움직이는 고양이. 누르면 잠들어 멈추고, 다시 누르면 깬다 (WCAG 2.2.2 의 멈춤 수단).
 * 움직임 줄이기 설정, 가려진 탭, 소개가 안 보이는 좁은 화면에서는 움직이지 않는다.
 */
export function MascotPet({ random = Math.random }: MascotPetProps) {
  const [asleep, setAsleep] = useState(readAsleep);
  const [hopping, setHopping] = useState(false);
  const reducedMotion = useMediaQuery(REDUCED_MOTION);
  const introVisible = useMediaQuery(INTRO_VISIBLE);
  const pageVisible = usePageVisible();
  const active = !asleep && !reducedMotion && introVisible && pageVisible;
  const loopFrame = usePetLoop(active, random);
  const frameName = asleep ? 'sleep' : loopFrame;
  const frame = PET_FRAMES[frameName];

  useEffect(() => {
    if (!hopping) return;
    const timer = window.setTimeout(() => setHopping(false), PET_HOP_MS);
    return () => window.clearTimeout(timer);
  }, [hopping]);

  const toggleSleep = () => {
    const next = !asleep;
    setAsleep(next);
    setHopping(false);
    writeAsleep(next);
  };

  const greet = () => {
    if (active) setHopping(true);
  };

  return (
    <button
      type="button"
      aria-label={SHELL.petSleep}
      aria-pressed={asleep}
      title={asleep ? SHELL.petWakeHint : SHELL.petSleepHint}
      onClick={toggleSleep}
      onPointerEnter={greet}
      className="relative block shrink-0 cursor-pointer"
      style={{ width: frame.width, height: PET_HEIGHT }}
    >
      {/* 움직임은 블렌드 요소 자신에게만 건다. 감싸는 요소에 transform 을 걸면 배경과 섞이지 않는다 */}
      <span
        data-frame={frameName}
        className={cx(
          'absolute left-0 top-0 block origin-bottom overflow-clip mix-blend-darken',
          motionClass(active, hopping),
        )}
        style={{
          width: frame.width,
          height: PET_HEIGHT,
          clipPath: notchClipPath(frame.notch),
        }}
      >
        <img
          src={poses}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="pointer-events-none absolute max-w-none"
          style={{
            width: PET_SHEET.width,
            height: PET_SHEET.height,
            left: frame.left,
            top: frame.top,
          }}
        />
      </span>
    </button>
  );
}
