import { test, expect, state, createCard, purchase, selectMonth } from '../helpers/qa';
test('CARD-01 @regression: editar e excluir compra recalcula todas as faturas', async ({
  page,
}) => {
  await createCard(page);
  await purchase(page);
  const row = page.locator('#purchaseList .feature-row').filter({ hasText: 'Compra QA' });
  await row.getByRole('button', { name: 'Editar compra' }).click();
  await page.locator('#purchaseAmount').fill('120,00');
  await page.locator('#savePurchase').click();
  expect(
    (await state(page)).transactions
      .filter((t: { source: string }) => t.source === 'card-invoice')
      .map((t: { amount: number }) => t.amount),
  ).toEqual([4000, 4000, 4000]);
  await row.getByRole('button', { name: 'Excluir compra' }).click();
  expect((await state(page)).settings.purchases).toHaveLength(0);
  expect((await state(page)).transactions).toHaveLength(2);
});
test('CARD-02 @negative: cartão com compras não é excluído; cartão vazio pode ser removido', async ({
  page,
}) => {
  await createCard(page);
  await purchase(page);
  await page.locator('#cardList').getByRole('button', { name: 'Excluir cartão' }).click();
  await expect(page.locator('#toast')).toContainText('Exclua as compras');
  expect((await state(page)).settings.cards).toHaveLength(1);
  await page.locator('#purchaseList').getByRole('button', { name: 'Excluir compra' }).click();
  await page.locator('#cardList').getByRole('button', { name: 'Excluir cartão' }).click();
  expect((await state(page)).settings.cards).toHaveLength(0);
});
test('CARD-03 @negative: dia fora do intervalo e parcelas menores que um centavo', async ({
  page,
}) => {
  await page.locator('#cardName').fill('Inválido');
  await page.locator('#cardClose').fill('32');
  await page.locator('#cardForm button').click();
  expect((await state(page)).settings.cards).toHaveLength(0);
  await page.locator('#cardClose').fill('20');
  await page.locator('#cardForm button').click();
  await purchase(page, '0,02', '3');
  await expect(page.locator('#toast')).toContainText('inválida');
  expect((await state(page)).settings.purchases).toHaveLength(0);
});
test('CARD-04 @integration: fechamento sugere mês; alterar vencimento ajusta fevereiro', async ({
  page,
}) => {
  await createCard(page);
  await page.locator('#purchaseDate').fill('2027-01-21');
  await page.locator('#purchaseDate').dispatchEvent('change');
  await expect(page.locator('#purchaseFirst')).toHaveValue('2027-03');
  await purchase(page, '10,00', '1', '2027-02');
  page.removeAllListeners('dialog');
  let n = 0;
  page.on('dialog', (d) => d.accept(++n === 1 ? '20' : '31'));
  await page.locator('#cardList').getByRole('button', { name: 'Editar datas' }).click();
  expect(
    (await state(page)).transactions.find((t: { source: string }) => t.source === 'card-invoice')
      .date,
  ).toBe('2027-02-28');
});
test('CARD-05 @regression: editar fatura paga reabre confirmação sem duplicar', async ({
  page,
}) => {
  await createCard(page);
  await purchase(page, '10,00', '1');
  await page
    .locator('#transactions tr')
    .filter({ hasText: 'Fatura ·' })
    .getByRole('button', { name: 'Confirmar pagamento' })
    .click();
  await page.locator('#purchaseList').getByRole('button', { name: 'Editar compra' }).click();
  await page.locator('#purchaseAmount').fill('20,00');
  await page.locator('#savePurchase').click();
  const invoices = (await state(page)).transactions.filter(
    (t: { source: string }) => t.source === 'card-invoice',
  );
  expect(invoices).toHaveLength(1);
  expect(invoices[0]).toMatchObject({ amount: 2000, status: 'planned' });
});
test('CARD-06 @negative: não cadastrar despesa avulsa sobre fatura detalhada', async ({ page }) => {
  await createCard(page);
  await purchase(page, '10,00', '1');
  await page.locator('#description').fill('Pagamento duplicado');
  await page.locator('#amount').fill('10,00');
  await page.locator('#category').selectOption('Cartão de crédito');
  await page.locator('#date').fill('2027-01-10');
  await page.locator('#submitTransaction').click();
  await expect(page.locator('#toast')).toContainText('evitar duplicar');
  expect((await state(page)).transactions).toHaveLength(3);
});
test('CARD-07 @positive: cancelar edição de compra mantém valores', async ({ page }) => {
  await createCard(page);
  await purchase(page, '10,00', '1');
  await page.locator('#purchaseList').getByRole('button', { name: 'Editar compra' }).click();
  await page.locator('#purchaseAmount').fill('99,00');
  await page.locator('#cancelPurchase').click();
  expect((await state(page)).settings.purchases[0].total).toBe(1000);
  await selectMonth(page, '2027-01');
  await expect(page.locator('#invoiceList')).toContainText('10,00');
});
import { syntheticState } from '../fixtures/state.js';
test.describe('Conciliação de fatura avulsa', () => {
  const seeded = syntheticState();
  seeded.transactions.push(
    Object.assign({}, seeded.transactions[1], {
      id: 'manual-invoice-qa',
      description: 'Fatura avulsa QA',
      category: 'Cartão de crédito',
      amount: 1500,
    }),
  );
  test.use({ qaState: seeded });
  test('CARD-08 @integration @negative: cancelar e aceitar substituição de fatura', async ({
    page,
  }) => {
    await createCard(page);
    page.removeAllListeners('dialog');
    page.on('dialog', (d) => d.dismiss());
    await purchase(page, '15,00', '1');
    expect((await state(page)).settings.purchases).toHaveLength(0);
    expect((await state(page)).transactions).toHaveLength(3);
    page.removeAllListeners('dialog');
    page.on('dialog', (d) => d.accept());
    await page.locator('#savePurchase').click();
    await expect(page.locator('#toast')).toContainText('Compra salva');
    expect((await state(page)).settings.purchases).toHaveLength(1);
    const rows = (await state(page)).transactions;
    expect(rows.some((t: { id: string }) => t.id === 'manual-invoice-qa')).toBe(false);
    expect(rows.find((t: { source: string }) => t.source === 'card-invoice').amount).toBe(1500);
  });
});
