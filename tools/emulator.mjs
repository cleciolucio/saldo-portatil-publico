import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
const sdk = process.env.ANDROID_HOME;
if (!sdk)
  throw new Error(
    'Execute mobile:android:setup -- -InstallEmulator no Windows ou configure ANDROID_HOME.',
  );
const executable = join(
  sdk,
  'emulator',
  process.platform === 'win32' ? 'emulator.exe' : 'emulator',
);
if (!existsSync(executable))
  throw new Error('Instale emulator e a imagem de sistema. Veja docs/MOBILE.md.');
const child = spawn(
  executable,
  [
    '-avd',
    process.env.ANDROID_AVD || 'Saldo_QA_API_36',
    '-no-snapshot-load',
    ...process.argv.slice(2),
  ],
  { stdio: 'inherit' },
);
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
