import { useEffect, useRef, useState } from 'react';

import poses from '@/assets/mascot/poses.webp';
import { SHELL } from '@/copy/screens';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { usePageVisible } from '@/hooks/usePageVisible';
import { cx } from '@/lib/cx';
import { useCrisisStore } from '@/stores/crisisStore';

import { PET_HOP_MS, PET_STEP_PX, type PetMotion } from './petBehavior';
import { notchClipPath, PET_FRAMES, PET_HEIGHT, PET_SHEET } from './petFrames';
import { usePetLoop } from './usePetLoop';

export const PET_STORAGE_KEY = 'mindcare.pet.asleep';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
// 왼쪽 소개는 lg(1024px)부터 보인다 (AppFrame). 안 보일 때는 움직이지 않는다
const INTRO_VISIBLE = '(min-width: 1024px)';

// Tailwind 가 클래스를 찾을 수 있게 이름을 그대로 적어 둔다
const MOTION_CLASS: Record<PetMotion, string> = {
  hop: 'animate-pet-hop',
  tilt: 'animate-pet-tilt',
  wiggle: 'animate-pet-wiggle',
  stretch: 'animate-pet-stretch',
};

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

function motionClass(
  active: boolean,
  greeting: boolean,
  motion: PetMotion | null,
): string | undefined {
  if (!active) return undefined;
  if (greeting) return MOTION_CLASS.hop;
  return motion ? MOTION_CLASS[motion] : 'animate-pet-breathe';
}

interface MascotPetProps {
  /** 0 이상 1 미만의 난수. 테스트에서 동작 순서를 고정할 때 넘긴다 */
  random?: () => number;
}

/**
 * 왼쪽 소개에서 혼자 움직이는 고양이. 누르면 잠들어 멈추고, 다시 누르면 깬다 (WCAG 2.2.2 의 멈춤 수단).
 * 움직임 줄이기 설정, 가려진 탭, 소개가 안 보이는 좁은 화면, 위기 안내가 떠 있는 동안에는 움직이지 않는다.
 */
export function MascotPet({ random = Math.random }: MascotPetProps) {
  const [asleep, setAsleep] = useState(readAsleep);
  const [greeting, setGreeting] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  /** 마우스가 올라온 순간의 실제 위치. 옆으로 미끄러지는 도중이면 목표 칸과 다르다 */
  const [heldLeft, setHeldLeft] = useState<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  /** 포인터로 누르는 중인지. 이때 생기는 포커스는 키보드 포커스로 치지 않는다 */
  const pressing = useRef(false);
  const reducedMotion = useMediaQuery(REDUCED_MOTION);
  const introVisible = useMediaQuery(INTRO_VISIBLE);
  const pageVisible = usePageVisible();
  const crisisOpen = useCrisisStore((state) => state.open);
  const active = !asleep && !reducedMotion && introVisible && pageVisible && !crisisOpen;
  // 마우스가 올라와 있거나 포커스가 있으면 자리를 옮기지 않는다. 누르려는 버튼이 달아나면 안 된다
  const pose = usePetLoop(active, !hovered && !focused, random);
  const frameName = asleep ? 'sleep' : pose.frame;
  const frame = PET_FRAMES[frameName];

  useEffect(() => {
    if (!greeting) return;
    const timer = window.setTimeout(() => setGreeting(false), PET_HOP_MS);
    return () => window.clearTimeout(timer);
  }, [greeting]);

  const toggleSleep = () => {
    const next = !asleep;
    setAsleep(next);
    setGreeting(false);
    writeAsleep(next);
  };

  const handlePointerEnter = () => {
    // 옆으로 미끄러지는 도중에 마우스가 닿으면 지금 있는 그 자리에 세운다
    const button = buttonRef.current;
    setHeldLeft(button ? Number.parseFloat(window.getComputedStyle(button).left) || 0 : null);
    setHovered(true);
    // 다른 몸동작 중에는 끼어들지 않는다. 그 동작이 중간에 끊겨 보인다
    if (active && !pose.motion) setGreeting(true);
  };

  const handlePointerLeave = () => {
    setHovered(false);
    setHeldLeft(null);
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={SHELL.petSleep}
      aria-pressed={asleep}
      title={asleep ? SHELL.petWakeHint : SHELL.petSleepHint}
      onClick={toggleSleep}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={() => {
        pressing.current = true;
      }}
      onPointerUp={() => {
        pressing.current = false;
      }}
      onPointerCancel={() => {
        pressing.current = false;
      }}
      onFocus={() => setFocused(!pressing.current)}
      onBlur={() => setFocused(false)}
      // 옆으로 옮길 때는 transform 대신 left 를 쓴다. 감싸는 요소에 transform 을 걸면 그림이 배경과 섞이지 않는다
      className="relative block shrink-0 cursor-pointer transition-[left] ease-out"
      style={{
        width: frame.width,
        height: PET_HEIGHT,
        left: hovered && heldLeft !== null ? heldLeft : pose.slot * PET_STEP_PX,
        transitionDuration: `${PET_HOP_MS}ms`,
      }}
    >
      {/* 몸 전체 움직임은 블렌드 요소 자신에게만 건다 */}
      <span
        data-frame={frameName}
        className={cx(
          'absolute left-0 top-0 block origin-bottom overflow-clip mix-blend-darken',
          motionClass(active, greeting, pose.motion),
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
