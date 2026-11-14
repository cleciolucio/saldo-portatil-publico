import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, openSync, closeSync } from 'node:fs';
mkdirSync('reports', { recursive: true });
const port = process.env.APPIUM_PORT || '4723';
try {
  const r = await fetch(`http://127.0.0.1:${port}/status`);
  if (r.ok)
    throw new Error('Já existe um servidor Appium nesta porta. Encerre-o antes deste smoke.');
} catch (error) {
  if (!String(error).includes('fetch failed')) throw error;
}
const fd = openSync('reports/appium-server.log', 'w');
const server = spawn(process.execPath, ['tools/appium.mjs', 'server'], {
  stdio: ['ignore', fd, fd],
  detached: process.platform !== 'win32',
});
try {
  let ready = false;
  for (let i = 0; i < 30; i++) {
    if (server.exitCode !== null)
      throw new Error('Servidor Appium encerrou: veja reports/appium-server.log.');
    try {
      const r = await fetch(`http://127.0.0.1:${port}/status`);
      const json = await r.json();
      if (r.ok && json.value.ready) {
        ready = true;
        console.log('Appium pronto:', json.value.build.version);
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!ready) throw new Error('Appium não respondeu em 15s.');
} finally {
  if (process.platform === 'win32')
    spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  else if (server.pid) {
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch {}
  }
  closeSync(fd);
}
