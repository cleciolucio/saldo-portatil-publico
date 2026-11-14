import { test, expect, state, restore, selectMonth, downloadedText } from '../helpers/qa';
import { syntheticState } from '../fixtures/state.js';
function backup() {
  return { application: 'saldo', month: '2027-01', ...syntheticState() };
}
for (const variant of [
  'invalid-json',
  'duplicate-id',
  'invalid-date',
  'negative-amount',
  'unknown-category',
  'unknown-version',
  'orphan-purchase',
])
  test(`BACKUP-NEG ${variant}: rejeita e preserva estado`, async ({ page }) => {
    const before = await state(page);
    const b: any = backup();
    let buffer: Buffer;
    if (variant === 'invalid-json') buffer = Buffer.from('{');
    else {
      if (variant === 'duplicate-id') b.transactions.push({ ...b.transactions[0] });
      if (variant === 'invalid-date') b.transactions[0].date = '2027-02-30';
      if (variant === 'negative-amount') b.transactions[0].amount = -1;
      if (variant === 'unknown-category') b.transactions[0].category = 'Desconhecida';
      if (variant === 'unknown-version') b.version = 99;
      if (variant === 'orphan-purchase')
        b.settings.purchases = [
          {
            id: 'orphan',
            cardId: 'missing',
            description: 'Inválida',
            total: 100,
            count: 1,
            offset: 0,
            originalCount: 1,
            firstMonth: '2027-01',
            date: null,
          },
        ];
      buffer = Buffer.from(JSON.stringify(b));
    }
    await page
      .locator('#backupFile')
      .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer });
    await expect(page.locator('#toast')).not.toHaveText('');
    await expect(page.locator('#toast')).toBeVisible();
    expect(await state(page)).toEqual(before);
  });
test('BACKUP-08 @negative: arquivo acima de 10 MB é rejeitado', async ({ page }) => {
  const before = await state(page);
  await page.locator('#backupFile').setInputFiles({
    name: 'large.json',
    mimeType: 'application/json',
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 32),
  });
  await expect(page.locator('#toast')).toContainText('10 MB');
  expect(await state(page)).toEqual(before);
});
test('BACKUP-09 @positive: backup antigo migra e não recria dados excluídos', async ({ page }) => {
  const b = {
    application: 'saldo',
    version: 1,
    month: '2027-01',
    transactions: [
      {
        id: 'legacy',
        description: 'Registro legado QA',
        amount: 12345,
        type: 'income',
        category: 'Outros',
        date: '2027-01-31',
      },
    ],
  };
  await restore(page, b);
  await expect(page.locator('#toast')).toContainText('restaurado');
  expect((await state(page)).transactions).toHaveLength(1);
  await page.reload();
  await expect(page.locator('#backupReminder')).not.toBeEmpty();
  expect((await state(page)).transactions).toHaveLength(1);
  expect((await state(page)).settings.investments).toHaveLength(0);
});
test('BACKUP-10 @negative: cancelar restauração preserva dados', async ({ page }) => {
  const before = await state(page);
  page.removeAllListeners('dialog');
  page.on('dialog', (d) => d.dismiss());
  const b = backup();
  b.transactions = [];
  await restore(page, b);
  await page.waitForFunction(
    () => !(document.querySelector('#backupFile') as HTMLInputElement).value,
  );
  expect(await state(page)).toEqual(before);
});
test('BACKUP-11 @regression: lembrete muda ao gerar backup e editar dados', async ({ page }) => {
  await expect(page.locator('#backupReminder')).toContainText('alterações sem backup');
  const payload = JSON.parse(await downloadedText(page, '#backupNow'));
  expect(payload.version).toBe(2);
  await expect(page.locator('#backupReminder')).toContainText('Backup gerado');
  await page.locator('#goalTarget').fill('100,00');
  await page.locator('#goalSaved').fill('10,00');
  await page.locator('#goalForm button').click();
  await expect(page.locator('#backupReminder')).toContainText('alterações sem backup');
});
test('INT-01 @integration: duas abas compartilham confirmações e metas', async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  other.on('dialog', (d) => d.accept());
  await other.goto('/');
  await expect(other.locator('#backupReminder')).not.toBeEmpty();
  await selectMonth(other, '2027-01');
  await page.locator('#goalTarget').fill('500,00');
  await page.locator('#goalSaved').fill('100,00');
  await page.locator('#goalForm button').click();
  await expect(other.locator('#goalSaved')).toHaveValue('100,00');
  await other
    .locator('#transactions tr')
    .filter({ hasText: 'Aluguel fictício' })
    .getByRole('button', { name: 'Confirmar pagamento' })
    .click();
  await expect(page.locator('#actualSummary')).toContainText('250,00');
  await other.close();
});
test('INT-02 @negative: conflito de gravação não sobrescreve estado novo', async ({ page }) => {
  const newer = await state(page);
  newer.settings.goals['2027-01'] = { target: 90000, saved: 20000 };
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: 'saldo.public.dashboard.v1.state.v2',
    value: newer,
  });
  await page.locator('#goalTarget').fill('100,00');
  await page.locator('#goalSaved').fill('0,00');
  await page.locator('#goalForm button').click();
  await expect(page.locator('#toast')).toContainText('outra aba');
  expect(await state(page)).toEqual(newer);
});
