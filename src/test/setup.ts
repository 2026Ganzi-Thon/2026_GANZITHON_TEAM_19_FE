import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// globals 를 쓰지 않아서 테스트마다 렌더 결과를 직접 치운다
afterEach(() => {
  cleanup();
});
