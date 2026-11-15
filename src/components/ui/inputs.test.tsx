import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CountdownTimer } from './CountdownTimer';
import { MoodSlider } from './MoodSlider';
import { StarRating } from './StarRating';
import { TextArea } from './TextArea';

describe('TextArea', () => {
  it('says how many more characters are needed and shows the count', () => {
    render(<TextArea label="고민 이야기" minLength={20} maxLength={2000} length={12} showCount />);

    const input = screen.getByLabelText('고민 이야기');
    expect(screen.getByText('8자 더 적어주세요')).toBeVisible();
    expect(screen.getByText('12 / 2,000')).toBeVisible();
    expect(input).toHaveAccessibleDescription(/8자 더 적어주세요/);
  });

  it('stops asking once the minimum is reached and reports an error', () => {
    render(
      <TextArea
        label="고민 이야기"
        minLength={20}
        length={20}
        error="2,000자까지 적을 수 있어요"
      />,
    );

    expect(screen.queryByText(/더 적어주세요/)).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('2,000자까지 적을 수 있어요');
    expect(screen.getByLabelText('고민 이야기')).toBeInvalid();
  });
});

describe('MoodSlider', () => {
  it('reads the value as a score and reports changes', () => {
    const onChange = vi.fn();
    render(<MoodSlider label="지금 마음의 온도는?" value={5} onChange={onChange} />);

    const slider = screen.getByRole('slider', { name: '지금 마음의 온도는?' });
    expect(slider).toHaveAttribute('aria-valuetext', '5점');

    fireEvent.change(slider, { target: { value: '7' } });
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it('shows the score from before the session to compare with', () => {
    render(<MoodSlider label="상담 후 마음 온도" value={6} onChange={vi.fn()} compareTo={5} />);

    expect(screen.getByText('상담 전 5점')).toBeVisible();
  });
});

describe('StarRating', () => {
  it('lets the user pick a score by name', () => {
    const onChange = vi.fn();
    render(
      <StarRating
        label="오늘의 시간은 어땠나요?"
        itemLabel={(score) => `별점 ${score}점`}
        value={3}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('radio', { name: '별점 3점' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: '별점 5점' }));
    expect(onChange).toHaveBeenCalledWith(5);
  });
});

describe('CountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-03T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down and calls back once when the time is up', () => {
    const onExpire = vi.fn();
    render(<CountdownTimer until="2026-11-03T10:01:30Z" onExpire={onExpire} />);

    expect(screen.getByText('01:30')).toBeInTheDocument();
    expect(screen.getByText('2분 남음')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText('00:30')).toBeInTheDocument();
    expect(onExpire).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(40_000));
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(onExpire).toHaveBeenCalledOnce();
  });
});
