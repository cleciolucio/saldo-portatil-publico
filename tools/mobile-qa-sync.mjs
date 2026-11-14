import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const pkg = JSON.parse(readFileSync('node_modules/@capacitor/cli/package.json', 'utf8'));
const result = spawnSync(
  process.execPath,
  [
    resolve('node_modules/@capacitor/cli', typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.cap),
    'sync',
  ],
  { stdio: 'inherit', env: { ...process.env, SALDO_QA_DATA: '1' } },
);
process.exitCode = result.status ?? 1;
