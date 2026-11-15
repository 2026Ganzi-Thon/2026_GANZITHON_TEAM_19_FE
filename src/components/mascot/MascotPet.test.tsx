import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SHELL } from '@/copy/screens';

import { MascotPet, PET_HOP_MS, PET_STORAGE_KEY } from './MascotPet';
import { gapMs, PET_ACTIONS, PET_FIRST_GAP_MS, pickAction, type PetStep } from './petBehavior';
import { PET_FRAMES } from './petFrames';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const DESKTOP = '(min-width: 1024px)';
const lowestRoll = () => 0;
/** lowestRoll 일 때 나오는 첫 동작 */
const FIRST_STEPS = PET_ACTIONS[pickAction(0)].steps;

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
    const glance = PET_ACTIONS[pickAction(roll)].steps;
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

  it('leaves no timers behind after it unmounts', () => {
    const { unmount } = render(<MascotPet random={lowestRoll} />);
    fireEvent.pointerEnter(petButton());

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
