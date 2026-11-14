import { chromium } from '@playwright/test';
import { preview } from 'vite';
import assert from 'node:assert/strict';
import { syntheticState, seedStorage } from '../tests/fixtures/state.js';
const server = await preview();
const browser = await chromium.launch({ channel: 'chromium' });
try {
  const context = await browser.newContext();
  await context.addInitScript(seedStorage, syntheticState());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:4173');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(
    () => document.getElementById('backupReminder').textContent.length > 0,
  );
  await page.locator('#month').fill('2027-01');
  await page.locator('#month').dispatchEvent('change');
  assert((await page.locator('#income').innerText()).includes('1.000,00'));
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('Produção/PWA: cache instalado e aplicação recarregada offline sem erros.');
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.httpServer.close(resolveClose));
}
