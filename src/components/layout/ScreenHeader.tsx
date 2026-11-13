import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { COMMON } from '@/copy/fixed';

interface ScreenHeaderProps {
  /** 왼쪽 제목. 없으면 뒤로 가기 버튼이 보인다 */
  title?: string;
  /** 뒤로 가기 대상. 없으면 이전 화면으로 간다 */
  backTo?: string;
  /** 뒤로 가기를 직접 처리한다 (단계형 화면) */
  onBack?: () => void;
  /** 뒤로 가기를 숨긴다 (역할 홈 등) */
  hideBack?: boolean;
  right?: ReactNode;
}

/** 화면 상단 줄. 아래에 가는 구분선이 붙는다. */
export function ScreenHeader({
  title,
  backTo,
  onBack,
  hideBack = false,
  right,
}: ScreenHeaderProps) {
  const navigate = useNavigate();

  function goBack() {
    if (onBack) onBack();
    else if (backTo) navigate(backTo);
    else navigate(-1);
  }

  return (
    <header className="flex min-h-(--size-appbar) items-center justify-between gap-3 border-b border-line">
      {title ? (
        <p className="text-body font-bold text-fg">{title}</p>
      ) : hideBack ? (
        <span />
      ) : (
        <button
          type="button"
          aria-label={COMMON.back}
          onClick={goBack}
          className="-ml-3 flex size-(--size-touch) items-center justify-center text-headline text-fg"
        >
          <span aria-hidden="true">‹</span>
        </button>
      )}
      {right}
    </header>
  );
}
