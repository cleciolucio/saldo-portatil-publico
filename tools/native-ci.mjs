import { spawn } from 'node:child_process';
import { mkdirSync, openSync, closeSync } from 'node:fs';
const platform = process.argv[2];
if (!['android', 'ios'].includes(platform)) throw new Error('Escolha android ou ios.');
mkdirSync('reports', { recursive: true });
const fd = openSync('reports/appium.log', 'w');
const server = spawn(process.execPath, ['tools/appium.mjs', 'server'], {
  stdio: ['ignore', fd, fd],
  env: { ...process.env, APPIUM_CHROMEDRIVER_AUTODOWNLOAD: '1' },
  detached: process.platform !== 'win32',
});
let ready = false;
try {
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null)
      throw new Error('Appium encerrou antes de iniciar. Veja reports/appium.log.');
    try {
      const response = await fetch(`http://127.0.0.1:${process.env.APPIUM_PORT || 4723}/status`);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!ready) throw new Error('Appium não iniciou em 60s.');
  const child = spawn(process.execPath, ['tools/bdd.mjs', platform], { stdio: 'inherit' });
  process.exitCode = await new Promise((resolveCode, reject) => {
    child.on('exit', (c) => resolveCode(c ?? 1));
    child.on('error', reject);
  });
} finally {
  if (process.platform === 'win32') {
    const { spawnSync } = await import('node:child_process');
    spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  } else if (server.pid) {
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch {}
  }
  closeSync(fd);
}
