import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { syntheticState, seedStorage, STATE_KEY } from '../fixtures/state.js';
const runtimeErrors = new WeakMap<object, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(seedStorage, syntheticState());
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/');
  await expect(page.locator('#backupReminder')).not.toBeEmpty();
  await page.locator('#month').fill('2027-01');
  await page.locator('#month').dispatchEvent('change');
});
test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page) || []).toEqual([]);
});
test('QA-001: confirma pagamento e persiste sem duplicar despesas', async ({ page }) => {
  await expect(page.locator('#expenses')).toContainText('250,00');
  await page
    .locator('#transactions tr')
    .filter({ hasText: 'Aluguel fictício' })
    .getByRole('button', { name: 'Confirmar pagamento' })
    .click();
  await expect(page.locator('#actualSummary')).toContainText('250,00');
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).transactions.length,
      STATE_KEY,
    ),
  ).toBe(2);
  await page.reload();
  await expect(page.locator('#backupReminder')).not.toBeEmpty();
  await page.locator('#month').fill('2027-01');
  await page.locator('#month').dispatchEvent('change');
  await expect(
    page.locator('#transactions tr').filter({ hasText: 'Aluguel fictício' }),
  ).toContainText('Pago');
});
test('QA-002: copia para fevereiro sem duplicar, com data válida', async ({ page }) => {
  await page.locator('#copyFrom').fill('2027-01');
  await page.locator('#copyTo').fill('2027-02');
  await page.locator('#copyForm').getByRole('button').click();
  await expect(page.locator('#copyResult')).toContainText('2 lançamentos copiados');
  await page.locator('#copyForm').getByRole('button').click();
  await expect(page.locator('#copyResult')).toContainText('Nenhum novo');
  const rows = await page.evaluate(
    (key) =>
      JSON.parse(localStorage.getItem(key)!).transactions.filter(
        (t: { source?: string }) => t.source === 'month-copy',
      ),
    STATE_KEY,
  );
  expect(rows).toHaveLength(2);
  expect(rows.every((t: { date: string }) => t.date === '2027-02-28')).toBeTruthy();
});
test('QA-003: parcelas exatas, fatura única e pagamento sem despesa duplicada', async ({
  page,
}) => {
  await page.locator('#cardName').fill('Cartão fictício');
  await page.locator('#cardClose').fill('20');
  await page.locator('#cardDue').fill('10');
  await page.locator('#cardForm button').click();
  await page.locator('#purchaseDescription').fill('Compra fictícia');
  await page.locator('#purchaseAmount').fill('100,00');
  await page.locator('#purchaseCount').fill('3');
  await page.locator('#purchaseFirst').fill('2027-01');
  await page.locator('#savePurchase').click();
  const invoices = await page.evaluate(
    (key) =>
      JSON.parse(localStorage.getItem(key)!).transactions.filter(
        (t: { source?: string }) => t.source === 'card-invoice',
      ),
    STATE_KEY,
  );
  expect(invoices.map((t: { amount: number }) => t.amount)).toEqual([3334, 3333, 3333]);
  await expect(page.locator('#expenses')).toContainText('283,34');
  await page
    .locator('#transactions tr')
    .filter({ hasText: 'Fatura ·' })
    .getByRole('button', { name: 'Confirmar pagamento' })
    .click();
  await expect(page.locator('#expenses')).toContainText('283,34');
  await expect(page.locator('#actualSummary')).toContainText('33,34');
});
test('QA-004: meta e investimentos não alteram o fluxo mensal; privacidade', async ({ page }) => {
  const balance = await page.locator('#balance').innerText();
  await page.locator('#goalTarget').fill('1.000,00');
  await page.locator('#goalSaved').fill('250,00');
  await page.locator('#goalForm button').click();
  await expect(page.locator('#goalProgress')).toHaveAttribute('value', '25');
  await page.locator('#investment-total-qa-portfolio').fill('120,00');
  await page.locator('#investmentForm button').click();
  await expect(page.locator('#investmentGroups')).toContainText('20,00');
  await expect(page.locator('#balance')).toHaveText(balance);
  await page.locator('#toggleValues').click();
  await expect(page.locator('#investment-total-qa-portfolio')).toHaveAttribute('type', 'password');
  await expect(page.locator('#goalSummary')).not.toContainText('250,00');
});
test('QA-005: backup completo restaura e rejeita arquivo inválido', async ({ page }) => {
  const downloadEvent = page.waitForEvent('download');
  await page.locator('#downloadBackup').click();
  const download = await downloadEvent;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const backup = Buffer.concat(chunks);
  await page.locator('#goalTarget').fill('999,00');
  await page.locator('#goalSaved').fill('0,00');
  await page.locator('#goalForm button').click();
  await page
    .locator('#backupFile')
    .setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: backup });
  await expect(page.locator('#goalTarget')).toHaveValue('0,00');
  await page
    .locator('#backupFile')
    .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(page.locator('#toast')).toContainText('inválido');
});
test('QA-006: layout responsivo e acessibilidade WCAG A/AA sem falhas graves', async ({ page }) => {
  await expect(page.locator('#backupReminder')).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    result.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
  ).toEqual([]);
});
test('QA-007: falha de armazenamento não aplica alteração parcial', async ({ page }) => {
  const before = await page.evaluate((key) => localStorage.getItem(key), STATE_KEY);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.endsWith('.state.v2')) throw new DOMException('Quota', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.locator('#goalTarget').fill('100,00');
  await page.locator('#goalSaved').fill('50,00');
  await page.locator('#goalForm button').click();
  await expect(page.locator('#toast')).toContainText('não aplicada');
  expect(await page.evaluate((key) => localStorage.getItem(key), STATE_KEY)).toEqual(before);
});
