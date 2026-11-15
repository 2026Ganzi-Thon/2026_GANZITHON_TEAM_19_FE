import type { ReactNode } from 'react';

import { MascotPet } from '@/components/mascot/MascotPet';
import { NOTICE, SERVICE } from '@/copy/fixed';
import { SHELL } from '@/copy/screens';

interface AppFrameProps {
  children: ReactNode;
  /** 틀 위에 떠 있는 것(토스트, 위기 안내). 화면 스크롤과 함께 움직이지 않는다 */
  overlays?: ReactNode;
}

/**
 * 웹앱 틀. 넓은 화면에서는 왼쪽에 서비스 소개를, 오른쪽에 휴대폰 폭의 앱 화면을 둔다.
 * 좁은 화면에서는 앱 화면만 가득 채운다. 앱 화면은 어느 기기에서나 같은 모바일 구성이다.
 */
export function AppFrame({ children, overlays }: AppFrameProps) {
  return (
    <div className="flex h-dvh justify-center bg-field lg:gap-20 lg:px-10">
      <aside
        aria-label={SERVICE.name}
        className="hidden w-full max-w-sm flex-col justify-center gap-5 lg:flex"
      >
        <p className="text-subheading font-bold text-fg">{SERVICE.name}</p>
        <p className="whitespace-pre-line text-display font-bold text-fg">{SHELL.headline}</p>
        <p className="whitespace-pre-line text-body text-fg-muted">{SHELL.description}</p>
        <MascotPet />
        <p className="pt-6 text-micro text-fg-muted">{NOTICE.notMedical}</p>
      </aside>

      {/* contain-layout: 안쪽의 fixed 요소(모달, 토스트, 환경 배지)가 창 전체가 아닌 이 틀을 기준으로 놓인다 */}
      <div className="relative flex h-full w-full max-w-(--size-app) shrink-0 flex-col overflow-hidden bg-bg contain-layout md:border-x md:border-line">
        <div className="flex min-h-0 grow flex-col overflow-y-auto">{children}</div>
        {overlays}
      </div>
    </div>
  );
}
