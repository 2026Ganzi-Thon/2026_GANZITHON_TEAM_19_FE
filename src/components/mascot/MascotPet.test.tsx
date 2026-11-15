import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SHELL } from '@/copy/screens';
import { useCrisisStore } from '@/stores/crisisStore';

import { MascotPet, PET_STORAGE_KEY } from './MascotPet';
import {
  gapMs,
  PET_ACTIONS,
  PET_FIRST_GAP_MS,
  PET_HOP_MS,
  PET_MAX_SLOT,
  PET_STEP_PX,
  pickAction,
  type PetAction,
  type PetStep,
} from './petBehavior';
import { PET_FRAMES } from './petFrames';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const DESKTOP = '(min-width: 1024px)';
const lowestRoll = () => 0;
/** 제자리(집)에 있고 붙잡히지 않은 상태 */
const HOME = { slot: 0, canRoam: true };
/** lowestRoll 일 때 나오는 첫 동작 */
const FIRST_STEPS = PET_ACTIONS[pickAction(0, HOME)].steps;

/** 그 상황(기본은 집)에서 그 동작이 뽑히는 난수 */
function rollFor(action: PetAction, situation = HOME): number {
  const roll = Array.from({ length: 1000 }, (_, index) => index / 1000).find(
    (candidate) => pickAction(candidate, situation) === action,
  );
  if (roll === undefined) throw new Error(`no roll picks ${action}`);
  return roll;
}

let mediaMatches: Record<string, boolean> = {};
const mediaListeners = new Map<string, Set<() => void>>();

function mockMedia(matches: Record<string, boolean>): void {
  mediaMatches = { ...matches };
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return mediaMatches[query] ?? false;
    },
    media: query,
    addEventListener: (_type: string, listener: () => void) => {
      mediaListeners.set(query, new Set([...(mediaListeners.get(query) ?? []), listener]));
    },
    removeEventListener: (_type: string, listener: () => void) => {
      mediaListeners.get(query)?.delete(listener);
    },
  }));
}

/** 쓰는 도중에 설정이나 창 크기가 바뀐 것처럼 알린다 */
function changeMedia(query: string, matches: boolean): void {
  mediaMatches = { ...mediaMatches, [query]: matches };
  act(() => {
    mediaListeners.get(query)?.forEach((listener) => listener());
  });
}

/** 메모리 저장소. jsdom 의 localStorage 는 쓸 때마다 타이머를 하나 잡아서 타이머 수 검사가 어긋난다 */
function stubStorage(initial: Record<string, string> = {}): void {
  const items = new Map(Object.entries(initial));
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  });
}

function setPageVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

function petButton(): HTMLElement {
  return screen.getByRole('button', { name: SHELL.petSleep });
}

/** 포즈 그림을 담고 움직이는 요소 */
function stage(): HTMLElement {
  const element = petButton().querySelector<HTMLElement>('[data-frame]');
  if (!element) throw new Error('pet stage not found');
  return element;
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** 한 칸 갔다가 돌아오기도 하므로, 주어진 시간 안에 한 번이라도 자리를 옮기는지 본다 */
function roamsWithin(ms: number): boolean {
  for (let elapsed = 0; elapsed < ms; elapsed += 100) {
    advance(100);
    if (petButton().style.left !== '0px') return true;
  }
  return false;
}

function totalMs(steps: readonly PetStep[]): number {
  return steps.reduce((sum, step) => sum + step.ms, 0);
}

describe('MascotPet', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mediaListeners.clear();
    stubStorage();
    mockMedia({ [DESKTOP]: true });
  });

  afterEach(() => {
    act(() => useCrisisStore.setState({ open: false }));
    setPageVisibility('visible');
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows the front pose as a button that can put the cat to sleep', () => {
    render(<MascotPet random={lowestRoll} />);

    expect(petButton()).toHaveAttribute('aria-pressed', 'false');
    expect(stage().dataset.frame).toBe('front');
  });

  it('makes its first move soon after it appears and returns to the front pose', () => {
    render(<MascotPet random={lowestRoll} />);

    advance(PET_FIRST_GAP_MS);
    expect(stage().dataset.frame).toBe(FIRST_STEPS[0]?.frame);

    advance(totalMs(FIRST_STEPS));
    expect(stage().dataset.frame).toBe('front');
  });

  it('waits through a longer quiet gap before each later move', () => {
    render(<MascotPet random={lowestRoll} />);
    advance(PET_FIRST_GAP_MS + totalMs(FIRST_STEPS));

    advance(gapMs(0) - 1);
    expect(stage().dataset.frame).toBe('front');

    advance(1);
    expect(stage().dataset.frame).toBe(FIRST_STEPS[0]?.frame);
  });

  it('runs a single loop under StrictMode, which mounts effects twice in development', () => {
    render(
      <StrictMode>
        <MascotPet random={lowestRoll} />
      </StrictMode>,
    );

    expect(vi.getTimerCount()).toBe(1);
    advance(PET_FIRST_GAP_MS);
    expect(stage().dataset.frame).toBe(FIRST_STEPS[0]?.frame);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('stays still on the front pose when the user prefers reduced motion', () => {
    mockMedia({ [DESKTOP]: true, [REDUCED_MOTION]: true });
    render(<MascotPet random={lowestRoll} />);

    advance(60_000);

    expect(stage().dataset.frame).toBe('front');
    expect(stage().className).not.toMatch(/animate-/);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops in the middle of a move when reduced motion is turned on, and resumes when it is turned off', () => {
    render(<MascotPet random={lowestRoll} />);
    advance(PET_FIRST_GAP_MS);
    expect(stage().dataset.frame).toBe(FIRST_STEPS[0]?.frame);

    changeMedia(REDUCED_MOTION, true);
    advance(60_000);
    expect(stage().dataset.frame).toBe('front');
    expect(stage().className).not.toMatch(/animate-/);

    changeMedia(REDUCED_MOTION, false);
    advance(PET_FIRST_GAP_MS);
    expect(stage().dataset.frame).toBe(FIRST_STEPS[0]?.frame);
  });

  it('does not run below the desktop width, where the intro is hidden', () => {
    mockMedia({ [DESKTOP]: false });
    render(<MascotPet random={lowestRoll} />);

    advance(60_000);

    expect(stage().dataset.frame).toBe('front');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops when the window is narrowed below the desktop width', () => {
    render(<MascotPet random={lowestRoll} />);

    changeMedia(DESKTOP, false);
    advance(60_000);

    expect(stage().dataset.frame).toBe('front');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('pauses while the tab is hidden and resumes when it is shown again', () => {
    render(<MascotPet random={lowestRoll} />);

    setPageVisibility('hidden');
    advance(60_000);
    expect(stage().dataset.frame).toBe('front');
    expect(vi.getTimerCount()).toBe(0);

    setPageVisibility('visible');
    advance(PET_FIRST_GAP_MS);
    expect(stage().dataset.frame).toBe(FIRST_STEPS[0]?.frame);
  });

  it('falls asleep and stops moving when pressed, and remembers it', () => {
    render(<MascotPet random={lowestRoll} />);

    fireEvent.click(petButton());
    advance(60_000);

    expect(petButton()).toHaveAttribute('aria-pressed', 'true');
    expect(stage().dataset.frame).toBe('sleep');
    expect(stage().className).not.toMatch(/animate-/);
    expect(vi.getTimerCount()).toBe(0);
    expect(window.localStorage.getItem(PET_STORAGE_KEY)).toBe('1');
  });

  it('falls asleep at once when pressed in the middle of a move', () => {
    const roll = 0.5;
    const glance = PET_ACTIONS[pickAction(roll, HOME)].steps;
    render(<MascotPet random={() => roll} />);
    advance(PET_FIRST_GAP_MS);
    expect(stage().dataset.frame).toBe(glance[0]?.frame);

    fireEvent.click(petButton());
    advance(60_000);

    expect(stage().dataset.frame).toBe('sleep');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shows the sleeping pose through its own window of the sprite sheet', () => {
    const { left, top, width } = PET_FRAMES.sleep;
    render(<MascotPet random={lowestRoll} />);

    fireEvent.click(petButton());

    const sprite = stage().querySelector('img');
    expect(stage().style.width).toBe(`${width}px`);
    expect(petButton().style.width).toBe(`${width}px`);
    expect(sprite?.style.left).toBe(`${left}px`);
    expect(sprite?.style.top).toBe(`${top}px`);
  });

  it('wakes up and moves again when pressed a second time', () => {
    render(<MascotPet random={lowestRoll} />);

    fireEvent.click(petButton());
    fireEvent.click(petButton());

    expect(petButton()).toHaveAttribute('aria-pressed', 'false');
    expect(stage().dataset.frame).toBe('front');
    expect(window.localStorage.getItem(PET_STORAGE_KEY)).toBeNull();

    advance(PET_FIRST_GAP_MS);
    expect(stage().dataset.frame).toBe(FIRST_STEPS[0]?.frame);
  });

  it('starts asleep when it was put to sleep on an earlier visit', () => {
    stubStorage({ [PET_STORAGE_KEY]: '1' });
    render(<MascotPet random={lowestRoll} />);

    expect(petButton()).toHaveAttribute('aria-pressed', 'true');
    expect(stage().dataset.frame).toBe('sleep');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('still sleeps and wakes when the browser blocks storage', () => {
    const blocked = () => {
      throw new Error('storage blocked');
    };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked, removeItem: blocked });
    render(<MascotPet random={lowestRoll} />);

    expect(stage().dataset.frame).toBe('front');
    fireEvent.click(petButton());
    expect(stage().dataset.frame).toBe('sleep');
    fireEvent.click(petButton());
    expect(stage().dataset.frame).toBe('front');
  });

  it('hops once when the pointer enters', () => {
    render(<MascotPet random={lowestRoll} />);

    fireEvent.pointerEnter(petButton());
    expect(stage().className).toContain('animate-pet-hop');

    advance(PET_HOP_MS);
    expect(stage().className).not.toContain('animate-pet-hop');
    expect(stage().className).toContain('animate-pet-breathe');
  });

  it('stops a hop when pressed during it', () => {
    render(<MascotPet random={lowestRoll} />);
    fireEvent.pointerEnter(petButton());

    fireEvent.click(petButton());

    expect(stage().className).not.toMatch(/animate-/);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not hop while asleep', () => {
    stubStorage({ [PET_STORAGE_KEY]: '1' });
    render(<MascotPet random={lowestRoll} />);

    fireEvent.pointerEnter(petButton());

    expect(stage().className).not.toContain('animate-pet-hop');
  });

  it('plays a whole-body motion during a move that has one, then breathes again', () => {
    const roll = rollFor('tilt');
    render(<MascotPet random={() => roll} />);

    advance(PET_FIRST_GAP_MS);
    expect(stage().className).toContain('animate-pet-tilt');

    advance(totalMs(PET_ACTIONS.tilt.steps));
    expect(stage().className).toContain('animate-pet-breathe');
  });

  it('hops one spot to the side and takes the whole button with it', () => {
    const roll = rollFor('hopRight');
    render(<MascotPet random={() => roll} />);
    expect(petButton().style.left).toBe('0px');

    advance(PET_FIRST_GAP_MS + totalMs(PET_ACTIONS.hopRight.steps));

    expect(petButton().style.left).toBe(`${PET_STEP_PX}px`);
    expect(stage().dataset.frame).toBe('front');
  });

  it('does not carry the cat away once the pointer is on it, even in the middle of a sideways hop', () => {
    const roll = rollFor('hopRight');
    render(<MascotPet random={() => roll} />);
    advance(PET_FIRST_GAP_MS);

    fireEvent.pointerEnter(petButton());
    advance(totalMs(PET_ACTIONS.hopRight.steps) + 30_000);

    expect(petButton().style.left).toBe('0px');
  });

  it('roams again after the pointer leaves', () => {
    const roll = rollFor('hopRight');
    render(<MascotPet random={() => roll} />);
    fireEvent.pointerEnter(petButton());
    advance(10_000);
    expect(petButton().style.left).toBe('0px');

    fireEvent.pointerLeave(petButton());

    expect(roamsWithin(15_000)).toBe(true);
  });

  it('stops right where it is when the pointer arrives during a sideways hop', () => {
    const roll = rollFor('hopRight');
    render(<MascotPet random={() => roll} />);
    advance(PET_FIRST_GAP_MS + (PET_ACTIONS.hopRight.steps[0]?.ms ?? 0));
    expect(petButton().style.left).toBe(`${PET_STEP_PX}px`);

    // 미끄러지는 도중이라 실제 위치는 아직 목표에 못 미친 20px 이다.
    // 버튼을 먼저 찾아 둔다. 역할로 찾는 과정도 getComputedStyle 을 쓴다
    const button = petButton();
    const midSlide = vi
      .spyOn(window, 'getComputedStyle')
      .mockReturnValue({ left: '20px' } as CSSStyleDeclaration);
    fireEvent.pointerEnter(button);
    midSlide.mockRestore();
    expect(petButton().style.left).toBe('20px');

    fireEvent.pointerLeave(petButton());
    expect(petButton().style.left).toBe(`${PET_STEP_PX}px`);
  });

  it('roams again after it loses keyboard focus', () => {
    const roll = rollFor('hopRight');
    render(<MascotPet random={() => roll} />);
    fireEvent.focus(petButton());
    advance(10_000);
    expect(petButton().style.left).toBe('0px');

    fireEvent.blur(petButton());

    expect(roamsWithin(15_000)).toBe(true);
  });

  it('does not treat a mouse click as keyboard focus, so it roams again after being woken by a click', () => {
    const roll = rollFor('hopRight');
    render(<MascotPet random={() => roll} />);

    fireEvent.pointerDown(petButton());
    fireEvent.focus(petButton());
    fireEvent.pointerUp(petButton());
    fireEvent.click(petButton());
    fireEvent.click(petButton());

    expect(roamsWithin(15_000)).toBe(true);
  });

  it('never goes past its farthest spot, and hops back toward home', () => {
    const rolls = [
      rollFor('hopRight'),
      0,
      rollFor('hopRight', { slot: 1, canRoam: true }),
      0,
      rollFor('hopLeft', { slot: PET_MAX_SLOT, canRoam: true }),
    ];
    const calls = { count: 0 };
    const scripted = () => rolls[Math.min(calls.count++, rolls.length - 1)] ?? 0;
    const hop = totalMs(PET_ACTIONS.hopRight.steps);
    render(<MascotPet random={scripted} />);

    advance(PET_FIRST_GAP_MS + hop + gapMs(0) + hop);
    expect(petButton().style.left).toBe(`${PET_MAX_SLOT * PET_STEP_PX}px`);

    advance(gapMs(0) + totalMs(PET_ACTIONS.hopLeft.steps));
    expect(petButton().style.left).toBe(`${(PET_MAX_SLOT - 1) * PET_STEP_PX}px`);
  });

  it('stays on its spot while it has keyboard focus, so the focus ring stays on the cat', () => {
    const roll = rollFor('hopRight');
    render(<MascotPet random={() => roll} />);

    fireEvent.focus(petButton());
    advance(30_000);

    expect(petButton().style.left).toBe('0px');
  });

  it('falls asleep where it is, so the next press still lands on it', () => {
    const roll = rollFor('hopRight');
    render(<MascotPet random={() => roll} />);
    advance(PET_FIRST_GAP_MS + totalMs(PET_ACTIONS.hopRight.steps));
    expect(petButton().style.left).toBe(`${PET_STEP_PX}px`);

    fireEvent.click(petButton());

    expect(petButton().style.left).toBe(`${PET_STEP_PX}px`);
    expect(stage().dataset.frame).toBe('sleep');
  });

  it('stays where it is when the crisis notice opens', () => {
    const roll = rollFor('hopRight');
    render(<MascotPet random={() => roll} />);
    advance(PET_FIRST_GAP_MS + totalMs(PET_ACTIONS.hopRight.steps));

    act(() => useCrisisStore.setState({ open: true }));

    expect(petButton().style.left).toBe(`${PET_STEP_PX}px`);
    expect(stage().dataset.frame).toBe('front');
  });

  it('does not cut a whole-body motion short with a greeting hop', () => {
    const roll = rollFor('tilt');
    render(<MascotPet random={() => roll} />);
    advance(PET_FIRST_GAP_MS);

    fireEvent.pointerEnter(petButton());

    expect(stage().className).toContain('animate-pet-tilt');
    expect(stage().className).not.toContain('animate-pet-hop');
  });

  it('keeps still while the crisis notice is open, and moves again after it closes', () => {
    render(<MascotPet random={lowestRoll} />);

    act(() => useCrisisStore.setState({ open: true }));
    advance(60_000);
    expect(stage().dataset.frame).toBe('front');
    expect(stage().className).not.toMatch(/animate-/);
    expect(vi.getTimerCount()).toBe(0);

    act(() => useCrisisStore.setState({ open: false }));
    advance(PET_FIRST_GAP_MS);
    expect(stage().dataset.frame).toBe(FIRST_STEPS[0]?.frame);
  });

  it('leaves no timers behind after it unmounts', () => {
    const { unmount } = render(<MascotPet random={lowestRoll} />);
    fireEvent.pointerEnter(petButton());

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
