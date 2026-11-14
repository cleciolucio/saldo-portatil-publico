import { test as base, expect, type Page } from '@playwright/test';
import { syntheticState, seedStorage, STATE_KEY } from '../fixtures/state.js';
export const test = base.extend<{ qaState: ReturnType<typeof syntheticState> }>({
  qaState: async ({ baseURL: _baseURL }, use) => {
    await use(syntheticState());
  },
  page: async ({ page, qaState }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(seedStorage, qaState);
    page.on('dialog', (d) => d.accept());
    await page.goto('/');
    await expect(page.locator('#backupReminder')).not.toBeEmpty();
    await selectMonth(page, '2027-01');
    await use(page);
    expect(errors, 'Nenhum erro JavaScript não tratado').toEqual([]);
  },
});
export { expect, STATE_KEY };
export async function selectMonth(page: Page, month: string) {
  await page.locator('#month').fill(month);
  await page.locator('#month').dispatchEvent('change');
}
export async function state(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STATE_KEY);
}
export async function restore(page: Page, backup: unknown) {
  await page.locator('#backupFile').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
}
export async function createCard(page: Page) {
  await page.locator('#cardName').fill('Cartão QA');
  await page.locator('#cardClose').fill('20');
  await page.locator('#cardDue').fill('10');
  await page.locator('#cardForm button').click();
}
export async function purchase(page: Page, total = '100,00', count = '3', month = '2027-01') {
  await page.locator('#purchaseDescription').fill('Compra QA');
  await page.locator('#purchaseAmount').fill(total);
  await page.locator('#purchaseCount').fill(count);
  await page.locator('#purchaseFirst').fill(month);
  await page.locator('#savePurchase').click();
}
export async function downloadedText(page: Page, selector: string) {
  const event = page.waitForEvent('download');
  await page.locator(selector).click();
  const file = await event;
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}
