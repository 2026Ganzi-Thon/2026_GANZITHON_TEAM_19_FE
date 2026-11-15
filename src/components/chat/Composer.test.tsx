import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Composer, MAX_MESSAGE_CHARS } from './Composer';

function setup(disabled = false) {
  const onSend = vi.fn();
  const onTyping = vi.fn();
  render(<Composer onSend={onSend} onTyping={onTyping} disabled={disabled} />);
  const input = screen.getByLabelText<HTMLTextAreaElement>('메시지');
  return { onSend, onTyping, input };
}

describe('Composer', () => {
  it('sends the trimmed text on Enter and clears the box', () => {
    const { onSend, input } = setup();

    fireEvent.change(input, { target: { value: '  요즘 잠을 못 자요 ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSend).toHaveBeenCalledWith('요즘 잠을 못 자요');
    expect(input.value).toBe('');
  });

  it('keeps Shift+Enter for a line break', () => {
    const { onSend, input } = setup();

    fireEvent.change(input, { target: { value: '첫 줄' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it('ignores Enter while a Korean syllable is still being composed', () => {
    const { onSend, input } = setup();

    fireEvent.change(input, { target: { value: '안녕하세' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it('sends with the button too, and not when the box is empty', () => {
    const { onSend, input } = setup();
    const button = screen.getByRole('button', { name: '전송' });

    expect(button).toBeDisabled();
    fireEvent.change(input, { target: { value: '네' } });
    fireEvent.click(button);

    expect(onSend).toHaveBeenCalledWith('네');
  });

  it('asks before sending something that looks like a phone number', () => {
    const { onSend, input } = setup();

    fireEvent.change(input, { target: { value: '제 번호는 010-1234-5678 이에요' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: '연락처로 보이는 내용이 있어요' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '그대로 보내기' }));
    expect(onSend).toHaveBeenCalledWith('제 번호는 010-1234-5678 이에요');
  });

  it('lets the user go back and edit instead', () => {
    const { onSend, input } = setup();

    fireEvent.change(input, { target: { value: '카톡 아이디 mindcare123' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: '수정하기' }));

    expect(onSend).not.toHaveBeenCalled();
    expect(input.value).toBe('카톡 아이디 mindcare123');
  });

  it('cuts the text at the message limit', () => {
    const { input } = setup();

    fireEvent.change(input, { target: { value: '가'.repeat(MAX_MESSAGE_CHARS + 5) } });

    expect(Array.from(input.value)).toHaveLength(MAX_MESSAGE_CHARS);
  });

  it('reports typing so the other side can see it', () => {
    const { onTyping, input } = setup();

    fireEvent.change(input, { target: { value: '네' } });

    expect(onTyping).toHaveBeenCalled();
  });

  it('does not send while the room is not ready', () => {
    const { onSend, input } = setup(true);

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(input).toBeDisabled();
    expect(onSend).not.toHaveBeenCalled();
  });
});
