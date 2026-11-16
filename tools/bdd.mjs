import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const mode = process.argv[2] || 'web',
  args = process.argv.slice(3),
  native = ['android', 'ios'].includes(mode);
if (!['web', 'mobile-web', 'iphone-web', 'android', 'ios'].includes(mode))
  throw new Error('Modo BDD inválido.');
if (mode === 'ios' && process.platform !== 'darwin')
  throw new Error('Appium iOS precisa ser executado em macOS com Xcode.');
mkdirSync('reports/cucumber', { recursive: true });
const env = { ...process.env, BDD_REPORT_NAME: process.env.BDD_REPORT_NAME || mode };
if (mode === 'mobile-web') env.BDD_DEVICE = 'android';
if (mode === 'iphone-web') {
  env.BDD_DEVICE = 'ios';
  env.BDD_BROWSER = 'webkit';
}
if (native) env.MOBILE_PLATFORM = mode;
let server;
if (!native && !env.BASE_URL) {
  const { createServer } = await import('vite');
  server = await createServer({ mode: 'qa', server: { port: 0, strictPort: false } });
  await server.listen();
  env.BASE_URL = server.resolvedUrls.local[0];
  console.log('BDD QA em ' + env.BASE_URL);
}
const pkg = JSON.parse(readFileSync('node_modules/@cucumber/cucumber/package.json', 'utf8'));
const cli = resolve('node_modules/@cucumber/cucumber', pkg.bin['cucumber-js']);
const child = spawn(
  process.execPath,
  [cli, '--config', native ? 'cucumber.mobile.mjs' : 'cucumber.mjs', ...args],
  { stdio: 'inherit', env },
);
process.on('SIGINT', () => child.kill('SIGINT'));
const code = await new Promise((resolveCode, reject) => {
  child.on('exit', (c) => resolveCode(c ?? 1));
  child.on('error', reject);
});
await server?.close();
process.exitCode = code;
