import { test, expect, state, selectMonth } from '../helpers/qa';
import { syntheticState } from '../fixtures/state.js';
test('PLAN-01 @negative: mesmo mês, mês vazio e cancelamento não copiam', async ({ page }) => {
  const before = await state(page);
  await page.locator('#copyFrom').fill('2027-01');
  await page.locator('#copyTo').fill('2027-01');
  await page.locator('#copyForm button').click();
  await expect(page.locator('#toast')).toContainText('diferentes');
  expect(await state(page)).toEqual(before);
  await page.locator('#copyFrom').fill('2028-01');
  await page.locator('#copyTo').fill('2028-02');
  await page.locator('#copyForm button').click();
  await expect(page.locator('#copyResult')).toContainText('Nenhum novo');
  await page.locator('#copyFrom').fill('2027-01');
  await page.locator('#copyTo').fill('2027-02');
  page.removeAllListeners('dialog');
  page.on('dialog', (d) => d.dismiss());
  await page.locator('#copyForm button').click();
  expect(await state(page)).toEqual(before);
});
test('PLAN-02 @positive: copiar apenas receitas preserva destino e exclusões', async ({ page }) => {
  await page.locator('#copyFrom').fill('2027-01');
  await page.locator('#copyTo').fill('2027-02');
  await page.locator('#copyKind').selectOption('income');
  await page.locator('#copyForm button').click();
  const copied = (await state(page)).transactions.filter(
    (t: { source: string }) => t.source === 'month-copy',
  );
  expect(copied).toHaveLength(1);
  expect(copied[0].type).toBe('income');
  await page
    .locator('#transactions tr')
    .getByRole('button', { name: /Excluir Receita/ })
    .click();
  await page.locator('#copyForm button').click();
  expect(
    (await state(page)).transactions.filter((t: { source: string }) => t.source === 'month-copy'),
  ).toHaveLength(0);
});
test('GOAL-01 @positive: meta por mês e progresso acima de 100%', async ({ page }) => {
  await page.locator('#goalTarget').fill('100,00');
  await page.locator('#goalSaved').fill('150,00');
  await page.locator('#goalForm button').click();
  await expect(page.locator('#goalSummary')).toContainText('150%');
  await expect(page.locator('#goalProgress')).toHaveAttribute('value', '100');
  await selectMonth(page, '2027-02');
  await expect(page.locator('#goalTarget')).toHaveValue('0,00');
  await selectMonth(page, '2027-01');
  await expect(page.locator('#goalSaved')).toHaveValue('150,00');
});
test('GOAL-02 @negative: valores negativos da meta não alteram estado', async ({ page }) => {
  const before = await state(page);
  await page.locator('#goalTarget').fill('-1,00');
  await page.locator('#goalSaved').fill('0,00');
  await page.locator('#goalForm button').click();
  await expect(page.locator('#toast')).toContainText('valor');
  expect(await state(page)).toEqual(before);
});
test('INV-01 @positive: investimentos persistem data, diferença e independência do mês', async ({
  page,
}) => {
  const ledger = (await state(page)).transactions;
  await page.locator('#investment-total-qa-portfolio').fill('120,00');
  await page.locator('#investment-qa-portfolio-qa-reserve').fill('90,00');
  await page.locator('#investment-date-qa-portfolio').fill('2027-01-12');
  await page.locator('#investmentForm button').click();
  await expect(page.locator('#investmentGroups')).toContainText('30,00');
  await selectMonth(page, '2027-02');
  await expect(page.locator('#investment-total-qa-portfolio')).toHaveValue('120,00');
  await expect(page.locator('#investment-date-qa-portfolio')).toHaveValue('2027-01-12');
  expect((await state(page)).transactions).toEqual(ledger);
});
test('INV-02 @negative: saldo de investimento inválido não é aplicado', async ({ page }) => {
  const before = await state(page);
  await page.locator('#investment-total-qa-portfolio').fill('-2,00');
  await page.locator('#investmentForm button').click();
  await expect(page.locator('#toast')).toContainText('valor');
  expect(await state(page)).toEqual(before);
});
test.describe('Exemplos legados', () => {
  const seeded = syntheticState();
  seeded.transactions.push(
    Object.assign({}, seeded.transactions[1], {
      id: 'sample-qa',
      description: 'Amostra QA',
      sample: true,
    }),
  );
  test.use({ qaState: seeded });
  test('SAMPLE-01 @regression: cancelar e confirmar limpeza removem somente exemplos', async ({
    page,
  }) => {
    await expect(page.locator('#sampleBanner')).toBeVisible();
    await page.locator('#clearSamples').click();
    await page.locator('#cancelClear').click();
    expect((await state(page)).transactions).toHaveLength(3);
    await page.locator('#clearSamples').click();
    await page.locator('#confirmClear').click();
    expect((await state(page)).transactions).toHaveLength(2);
    await expect(page.locator('#sampleBanner')).toBeHidden();
  });
});
