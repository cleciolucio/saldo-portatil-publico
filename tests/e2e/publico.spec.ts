import { test, expect, state, selectMonth } from '../helpers/qa';
test('PUBLIC-01 @positive: personalizar nomes e saldos de investimentos pela interface', async ({
  page,
}) => {
  await page.locator('#investment-name-qa-portfolio').fill('Minha carteira');
  await page.locator('#investment-label-qa-portfolio-qa-reserve').fill('Meu objetivo');
  await page.locator('#investment-total-qa-portfolio').fill('123,45');
  await page.locator('#investment-qa-portfolio-qa-reserve').fill('123,45');
  await page.locator('#investmentForm button').click();
  const saved = (await state(page)).settings.investments[0];
  expect(saved.name).toBe('Minha carteira');
  expect(saved.positions[0].name).toBe('Meu objetivo');
  expect(saved.total).toBe(12345);
  await page.reload();
  await expect(page.locator('#backupReminder')).not.toBeEmpty();
  await expect(page.locator('#investment-name-qa-portfolio')).toHaveValue('Minha carteira');
});
test('PUBLIC-02 @regression: limpar demonstração zera saldos e não recria exemplos', async ({
  page,
}) => {
  await page.locator('#resetPublicDemo').click();
  let saved = await state(page);
  expect(saved.transactions).toHaveLength(0);
  expect(saved.settings.cards).toHaveLength(0);
  expect(saved.settings.investments.every((g: { total: number }) => g.total === 0)).toBeTruthy();
  await selectMonth(page, '2026-10');
  await expect(page.locator('#payrollPanel')).toBeHidden();
  await page.reload();
  await expect(page.locator('#backupReminder')).not.toBeEmpty();
  saved = await state(page);
  expect(saved.transactions).toHaveLength(0);
  await expect(page.locator('#payrollPanel')).toBeHidden();
  await page.locator('#description').fill('Minha primeira receita');
  await page.locator('#amount').fill('42,00');
  await page.locator('#type').selectOption('income');
  await page.locator('#date').fill('2027-01-15');
  await page.locator('#submitTransaction').click();
  await expect(page.locator('#income')).toContainText('42,00');
});
test('PUBLIC-03 @negative: cancelar limpeza mantém todos os dados', async ({ page }) => {
  const before = await state(page);
  page.removeAllListeners('dialog');
  page.on('dialog', (d) => d.dismiss());
  await page.locator('#resetPublicDemo').click();
  expect(await state(page)).toEqual(before);
});
test('PUBLIC-04 @integration: namespace independente preserva dados de outra edição', async ({
  page,
}) => {
  const oldKey = 'saldo.' + 'dashboard.v1.state.v2';
  await page.evaluate((key) => localStorage.setItem(key, 'outro-estado-local-ficticio'), oldKey);
  await page.locator('#resetPublicDemo').click();
  expect(await page.evaluate((key) => localStorage.getItem(key), oldKey)).toBe(
    'outro-estado-local-ficticio',
  );
  expect((await state(page)).transactions).toHaveLength(0);
});
