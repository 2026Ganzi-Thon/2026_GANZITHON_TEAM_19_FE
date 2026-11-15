import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { EligibleSession } from '@/api/pending';

import { SessionPicker } from './SessionPicker';

const SESSIONS: EligibleSession[] = [
  {
    session_id: 'a',
    date: '2026-10-16T10:00:00Z',
    provider_display: '하늘',
    report_status: 'ready',
  },
  {
    session_id: 'b',
    date: '2026-10-23T10:00:00Z',
    provider_display: '하늘',
    report_status: 'ready',
  },
];

describe('SessionPicker', () => {
  it('lists each session with its date, counselor and report status', () => {
    render(<SessionPicker sessions={SESSIONS} selected={['a', 'b']} onChange={vi.fn()} />);

    expect(screen.getByLabelText('10월 16일 · 하늘 · 상담 정리 완료')).toBeChecked();
    expect(screen.getByText(/2개 선택/)).toBeVisible();
  });

  it('reports the new selection when a session is unchecked', () => {
    const onChange = vi.fn();
    render(<SessionPicker sessions={SESSIONS} selected={['a', 'b']} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('10월 23일 · 하늘 · 상담 정리 완료'));

    expect(onChange).toHaveBeenCalledWith(['a']);
  });

  it('does not let the last session be unchecked', () => {
    render(<SessionPicker sessions={SESSIONS} selected={['a']} onChange={vi.fn()} />);

    expect(screen.getByLabelText('10월 16일 · 하늘 · 상담 정리 완료')).toBeDisabled();
    expect(screen.getByLabelText('10월 23일 · 하늘 · 상담 정리 완료')).toBeEnabled();
  });

  it('locks every session after consent and says why', () => {
    render(<SessionPicker sessions={SESSIONS} selected={['a', 'b']} onChange={vi.fn()} locked />);

    screen.getAllByRole('checkbox').forEach((checkbox) => expect(checkbox).toBeDisabled());
    expect(screen.getByText(/동의한 뒤에는 바꿀 수 없어요/)).toBeVisible();
  });
});
