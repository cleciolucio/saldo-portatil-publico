import { test, expect, state, selectMonth, downloadedText } from '../helpers/qa';
test('FUN-01 @positive: criar, editar, cancelar e excluir lançamento', async ({ page }) => {
  await page.locator('#description').fill('Mercado QA');
  await page.locator('#amount').fill('123,45');
  await page.locator('#type').selectOption('expense');
  await page.locator('#category').selectOption('Alimentação');
  await page.locator('#date').fill('2027-01-15');
  await page.locator('#transactionStatus').selectOption('completed');
  await page.locator('#submitTransaction').click();
  let row = page.locator('#transactions tr').filter({ hasText: 'Mercado QA' });
  await expect(row).toContainText('Pago');
  expect((await state(page)).transactions).toHaveLength(3);
  await row.getByRole('button', { name: 'Editar Mercado QA', exact: true }).click();
  await page.locator('#amount').fill('150,00');
  await page.locator('#cancelEdit').click();
  expect(
    (await state(page)).transactions.find(
      (t: { description: string }) => t.description === 'Mercado QA',
    ).amount,
  ).toBe(12345);
  await row.getByRole('button', { name: 'Editar Mercado QA', exact: true }).click();
  await page.locator('#amount').fill('150,00');
  await page.locator('#submitTransaction').click();
  await expect(row).toContainText('150,00');
  await row.getByRole('button', { name: /Excluir Mercado QA/ }).click();
  await expect(row).toHaveCount(0);
  expect((await state(page)).transactions).toHaveLength(2);
});
for (const value of ['0,00', '-1,00', '1.23', '1,234', '1000000001,00'])
  test(`NEG-MONEY ${value}: entrada inválida não grava`, async ({ page }) => {
    const before = await state(page);
    await page.locator('#description').fill('Inválido QA');
    await page.locator('#amount').fill(value);
    await page.locator('#date').fill('2027-01-15');
    await page.locator('#submitTransaction').click();
    expect(await page.locator('#amount').evaluate((e: HTMLInputElement) => e.validity.valid)).toBe(
      false,
    );
    expect(await state(page)).toEqual(before);
  });
test('NEG-DESC: espaços e campos obrigatórios não criam transação', async ({ page }) => {
  await page.locator('#description').fill('   ');
  await page.locator('#amount').fill('10,00');
  await page.locator('#date').fill('2027-01-15');
  await page.locator('#submitTransaction').click();
  expect((await state(page)).transactions).toHaveLength(2);
  expect(
    await page.locator('#description').evaluate((e: HTMLInputElement) => e.validity.valid),
  ).toBe(false);
});
test('FUN-02 @regression: receber e desfazer confirmação sem alterar saldo projetado', async ({
  page,
}) => {
  const balance = await page.locator('#balance').innerText();
  const row = page.locator('#transactions tr').filter({ hasText: 'Receita fictícia' });
  await row.getByRole('button', { name: 'Confirmar recebimento' }).click();
  await expect(page.locator('#actualSummary')).toContainText('1.000,00');
  await row.getByRole('button', { name: 'Desfazer confirmação' }).click();
  await expect(page.locator('#actualSummary')).not.toContainText('1.000,00');
  await expect(page.locator('#balance')).toHaveText(balance);
});
test('FUN-03 @positive: busca, categoria, tipo e mês combinados', async ({ page }) => {
  await page.locator('#search').fill('aluguel');
  await expect(page.locator('#transactions tr')).toHaveCount(1);
  await page.locator('#typeFilter').selectOption('income');
  await expect(page.locator('#historyEmpty')).toBeVisible();
  await page.locator('#search').fill('');
  await page.locator('#typeFilter').selectOption('');
  await page.locator('#categoryFilter').selectOption('Moradia');
  await expect(page.locator('#transactions tr')).toHaveCount(1);
  await selectMonth(page, '2027-02');
  await expect(page.locator('#transactions tr')).toHaveCount(0);
});
test('FUN-04 @integration: CSV respeita filtros e neutraliza fórmulas', async ({ page }) => {
  await page.locator('#description').fill('=1+1');
  await page.locator('#amount').fill('10,00');
  await page.locator('#date').fill('2027-01-15');
  await page.locator('#submitTransaction').click();
  await page.locator('#search').fill('=1+1');
  const csv = await downloadedText(page, '#export');
  expect(csv).toContain("'=1+1");
  expect(csv).not.toContain('Receita fictícia');
  expect(csv).toContain('Previsto');
  await page.locator('#search').fill('ausente');
  await page.locator('#export').click();
  await expect(page.locator('#toast')).toContainText('Não há transações');
});
test('FUN-05 @negative: descrição HTML permanece texto inofensivo', async ({ page }) => {
  const payload = '<img src=x onerror="window.qaInjected=true">';
  await page.locator('#description').fill(payload);
  await page.locator('#amount').fill('10,00');
  await page.locator('#date').fill('2027-01-15');
  await page.locator('#submitTransaction').click();
  await expect(page.locator('#transactions')).toContainText(payload);
  expect(await page.evaluate(() => Object.hasOwn(window, 'qaInjected'))).toBe(false);
  await expect(page.locator('#transactions img')).toHaveCount(0);
});
test('FUN-06 @integration: demonstrativo por competência e comparativo corretos', async ({
  page,
}) => {
  await expect(page.locator('#payrollPanel')).toBeHidden();
  const table = page.locator('#comparisonTable tr').last();
  await expect(table).toContainText('1.000,00');
  await expect(table).toContainText('250,00');
  await expect(table).toContainText('750,00');
  await selectMonth(page, '2026-10');
  await expect(page.locator('#payrollPanel')).toBeVisible();
  await expect(page.locator('#payrollMonth')).toContainText('outubro');
  await selectMonth(page, '2026-11');
  await expect(page.locator('#payrollMonth')).toContainText('previsão');
});
test('FUN-07 @positive: mês sem dados tem gráficos vazios e totais zero', async ({ page }) => {
  await selectMonth(page, '2027-08');
  await expect(page.locator('#income')).toContainText('0,00');
  await expect(page.locator('#expenses')).toContainText('0,00');
  await expect(page.locator('#emptyChart')).toBeVisible();
  await expect(page.locator('#topCategory')).toHaveText('Sem despesas');
});
