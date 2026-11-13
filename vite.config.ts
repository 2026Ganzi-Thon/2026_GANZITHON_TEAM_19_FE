import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// TRD 10-3: 수동 청크 react / firebase / charts / realtime
const CHUNK_GROUPS: ReadonlyArray<readonly [string, RegExp]> = [
  ['firebase', /node_modules[/\\](firebase|@firebase)[/\\]/],
  ['charts', /node_modules[/\\](recharts|d3-[a-z-]+|victory-vendor)[/\\]/],
  ['realtime', /node_modules[/\\]@stomp[/\\]/],
  ['react', /node_modules[/\\](react|react-dom|react-router|scheduler)[/\\]/],
];

// 빌드 날짜(한국 시간, YYYY.MM.DD). 서버의 min_client_version 과 비교한다 (TRD 17-8)
const BUILD_VERSION = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' })
  .format(new Date())
  .replaceAll('-', '.');

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: {
    __APP_VERSION__: JSON.stringify(BUILD_VERSION),
  },
  build: {
    // TRD 18-5: 소스맵은 hidden으로 만들고 Hosting에는 올리지 않는다 (firebase.json ignore)
    sourcemap: 'hidden' as const,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: CHUNK_GROUPS.map(([name, test]) => ({ name, test })),
        },
        // TRD 18-5: 운영 빌드는 console.* 를 제거한다
        minify:
          mode === 'production' ? { compress: { dropConsole: true, dropDebugger: true } } : false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
}));
