import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { syntheticState, seedStorage } from '../tests/fixtures/state.js';
const browser = await chromium.launch({ channel: 'chromium' });
try {
  const context = await browser.newContext({ offline: true });
  await context.addInitScript(seedStorage, syntheticState());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(pathToFileURL(resolve('index.html')).href);
  await page.waitForFunction(
    () => document.getElementById('backupReminder')?.textContent.length > 0,
  );
  await page.locator('#month').fill('2027-01');
  await page.locator('#month').dispatchEvent('change');
  assert((await page.locator('#income').innerText()).includes('1.000,00'));
  assert((await page.locator('#expenses').innerText()).includes('250,00'));
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('Portátil: arquivo local abre offline com dados sintéticos e sem erros.');
} finally {
  await browser.close();
}
