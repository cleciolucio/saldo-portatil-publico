import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { qaTool } from './qa-tool.mjs';
const profile = process.argv[2] || 'smoke';
if (!['smoke', 'load', 'stress', 'soak', 'browser', 'browser-mobile'].includes(profile))
  throw new Error('Perfil k6 inválido.');
mkdirSync('reports/k6', { recursive: true });
let server;
const env = {
  ...process.env,
  K6_PROFILE: profile,
  K6_WEB_DASHBOARD: 'true',
  K6_WEB_DASHBOARD_PORT: '-1',
  K6_WEB_DASHBOARD_PERIOD: '1s',
  K6_WEB_DASHBOARD_EXPORT: resolve(`reports/k6/${profile}-dashboard.html`),
};
if (!env.BASE_URL) {
  const { preview } = await import('vite');
  server = await preview({ mode: 'qa' });
  env.BASE_URL = 'http://127.0.0.1:4173';
}
if (profile.startsWith('browser')) {
  const { chromium } = await import('@playwright/test');
  env.K6_BROWSER_EXECUTABLE_PATH = chromium.executablePath();
  if (!existsSync(env.K6_BROWSER_EXECUTABLE_PATH))
    throw new Error('Instale os browsers: browsers:install.');
  env.K6_BROWSER_HEADLESS = 'true';
  env.K6_MOBILE = profile === 'browser-mobile' ? '1' : '0';
}
writeFileSync(`reports/k6/${profile}.log`, '');
try {
  const child = spawn(
    qaTool('k6'),
    [
      'run',
      '--quiet',
      '--log-format=json',
      `--log-output=file=reports/k6/${profile}.log`,
      profile.startsWith('browser') ? 'tests/k6/browser.js' : 'tests/k6/http.js',
    ],
    { stdio: 'inherit', env },
  );
  process.exitCode = await new Promise((resolveCode, reject) => {
    child.on('exit', (c) => resolveCode(c ?? 1));
    child.on('error', reject);
  });
  const log = readFileSync(`reports/k6/${profile}.log`, 'utf8');
  const runtimeErrors = log.split(/\r?\n/).filter((line) => {
    try {
      return ['error', 'fatal'].includes(JSON.parse(line).level);
    } catch {
      return false;
    }
  }).length;
  if (runtimeErrors) {
    console.error(`${runtimeErrors} erros k6 em reports/k6/${profile}.log`);
    process.exitCode = 1;
  }
  writeFileSync(
    `reports/k6/${profile}-result.json`,
    JSON.stringify(
      { profile, exitCode: process.exitCode, runtimeErrors, finishedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
} finally {
  if (server) await new Promise((r) => server.httpServer.close(r));
}
