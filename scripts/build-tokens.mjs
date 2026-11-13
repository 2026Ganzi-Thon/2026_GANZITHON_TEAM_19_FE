// src/styles/tokens.json → src/styles/tokens.css (TRD 10-1, 부록 B-8)
// 색·글자·곡률은 tokens.json 만 고친다. tokens.css 는 생성 파일이라 커밋하지 않는다.
import { readFileSync, writeFileSync } from 'node:fs';

const SOURCE = new URL('../src/styles/tokens.json', import.meta.url);
const TARGET = new URL('../src/styles/tokens.css', import.meta.url);

const tokens = JSON.parse(readFileSync(SOURCE, 'utf8'));

// Tailwind 기본 팔레트·글자 크기·곡률을 지워 토큰만 쓰게 한다 (TRD 10-2: 하드코딩 금지)
const lines = ['--color-*: initial;', '--text-*: initial;', '--radius-*: initial;'];

for (const [name, value] of Object.entries(tokens.color)) {
  lines.push(`--color-${name}: ${value};`);
}
for (const [name, value] of Object.entries(tokens.radius)) {
  lines.push(`--radius-${name}: ${value};`);
}
for (const [name, [size, lineHeight]] of Object.entries(tokens.text)) {
  lines.push(`--text-${name}: ${size};`, `--text-${name}--line-height: ${lineHeight};`);
}
for (const [name, value] of Object.entries(tokens.font)) {
  lines.push(`--font-${name}: ${value};`);
}
for (const [name, value] of Object.entries(tokens.breakpoint)) {
  lines.push(`--breakpoint-${name}: ${value};`);
}
for (const [name, value] of Object.entries(tokens.size)) {
  lines.push(`--size-${name}: ${value};`);
}

const css = [
  '/* 자동 생성 파일이다. tokens.json 을 고친 뒤 npm run tokens 를 실행한다. */',
  '@theme {',
  ...lines.map((line) => `  ${line}`),
  '}',
  '',
].join('\n');

writeFileSync(TARGET, css);
console.log(`tokens: ${lines.length} variables -> src/styles/tokens.css`);
