// OPENAPI_URL → src/api/schema.d.ts (TRD 7-5, 10-1)
// schema.d.ts 는 이 스크립트나 openapi-sync 워크플로로만 바꾼다.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DEFAULT_OPENAPI_URL = 'https://15.165.13.247.sslip.io/v1/openapi.json';
const OUTPUT = 'src/api/schema.d.ts';

const cli = fileURLToPath(
  new URL('../node_modules/openapi-typescript/bin/cli.js', import.meta.url),
);
const url = process.env.OPENAPI_URL || DEFAULT_OPENAPI_URL;

console.log(`OpenAPI: ${url} -> ${OUTPUT}`);
execFileSync(process.execPath, [cli, url, '-o', OUTPUT], { stdio: 'inherit' });
