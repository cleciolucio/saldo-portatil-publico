import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
async function expense(page, amount) {
  await page.locator('#description').fill('Despesa criada BDD');
  await page.locator('#amount').fill(amount);
  await page.locator('#date').fill('2027-01-15');
  await page.locator('#submitTransaction').click();
}
When('cadastro uma despesa fictícia de {string}', async function (amount) {
  await expense(this.page, amount);
});
When('tento cadastrar a despesa com valor {string}', async function (amount) {
  await expense(this.page, amount);
});
Then('existe uma despesa de {string} no histórico', async function (amount) {
  await expect(
    this.page.locator('#transactions tr').filter({ hasText: 'Despesa criada BDD' }),
  ).toContainText(amount);
});
When('excluo a despesa criada', async function () {
  await this.page
    .locator('#transactions tr')
    .filter({ hasText: 'Despesa criada BDD' })
    .getByRole('button', { name: /Excluir/ })
    .click();
});
Then('o histórico retorna a {int} lançamentos', async function (count) {
  await expect(this.page.locator('#transactions tr')).toHaveCount(count);
});
Then('o campo de valor deve indicar erro', async function () {
  expect(await this.page.locator('#amount').evaluate((e) => e.validity.valid)).toBe(false);
});
When(
  'cadastro um cartão com uma compra de {string} em {int} parcelas',
  async function (total, count) {
    await this.page.locator('#cardName').fill('Cartão BDD');
    await this.page.locator('#cardForm button').click();
    await this.page.locator('#purchaseDescription').fill('Compra BDD');
    await this.page.locator('#purchaseAmount').fill(total);
    await this.page.locator('#purchaseCount').fill(String(count));
    await this.page.locator('#purchaseFirst').fill('2027-01');
    await this.page.locator('#savePurchase').click();
  },
);
Then('as faturas devem somar {int} centavos', async function (total) {
  const sum = await this.page.evaluate(() =>
    JSON.parse(localStorage.getItem('saldo.public.dashboard.v1.state.v2'))
      .transactions.filter((t) => t.source === 'card-invoice')
      .reduce((n, t) => n + t.amount, 0),
  );
  expect(sum).toBe(total);
});
Then('devem existir {int} faturas', async function (count) {
  const rows = await this.page.evaluate(() =>
    JSON.parse(localStorage.getItem('saldo.public.dashboard.v1.state.v2')).transactions.filter(
      (t) => t.source === 'card-invoice',
    ),
  );
  expect(rows).toHaveLength(count);
});
When('atualizo a carteira fictícia para {string}', async function (total) {
  await this.page.locator('#investment-total-qa-portfolio').fill(total);
  await this.page.locator('#investmentForm button').click();
});
Then('os investimentos sinalizam diferença de {string}', async function (value) {
  await expect(this.page.locator('#investmentGroups')).toContainText(value);
});
When('tento restaurar um JSON malformado', async function () {
  await this.page
    .locator('#backupFile')
    .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{') });
});
Then('a restauração é rejeitada', async function () {
  await expect(this.page.locator('#toast')).toContainText('Não foi possível ler');
});
