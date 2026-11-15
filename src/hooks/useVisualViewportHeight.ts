import { useEffect, useState } from 'react';

/**
 * 보이는 영역의 높이. 모바일 키보드가 올라오면 줄어든다 (TRD 18-4).
 * 상담방이 이 높이를 써서 입력창을 키보드 위에 둔다. 지원하지 않는 브라우저에서는 null.
 */
export function useVisualViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => setHeight(viewport.height);
    update();
    viewport.addEventListener('resize', update);
    return () => viewport.removeEventListener('resize', update);
  }, []);

  return height;
}
