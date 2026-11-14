import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
Given('que abri o Saldo com dados fictícios de QA', async function () {
  await this.page.goto('/');
  await expect(this.page.locator('#backupReminder')).not.toBeEmpty();
  await this.page.locator('#month').fill('2027-01');
  await this.page.locator('#month').dispatchEvent('change');
});
When('confirmo o pagamento do aluguel fictício', async function () {
  await this.page
    .locator('#transactions tr')
    .filter({ hasText: 'Aluguel fictício' })
    .getByRole('button', { name: 'Confirmar pagamento' })
    .click();
});
Then('o total de despesas deve continuar em {string}', async function (value) {
  await expect(this.page.locator('#expenses')).toContainText(value);
});
Then('o resumo realizado deve mostrar {string}', async function (value) {
  await expect(this.page.locator('#actualSummary')).toContainText(value);
});
When('copio janeiro de 2027 para fevereiro de 2027', async function () {
  await this.page.locator('#copyFrom').fill('2027-01');
  await this.page.locator('#copyTo').fill('2027-02');
  await this.page.locator('#copyForm button').click();
});
Then('devem existir {int} lançamentos copiados em {string}', async function (count, date) {
  const rows = await this.page.evaluate(() =>
    JSON.parse(localStorage.getItem('saldo.public.dashboard.v1.state.v2')).transactions.filter(
      (t) => t.source === 'month-copy',
    ),
  );
  expect(rows).toHaveLength(count);
  expect(rows.every((t) => t.date === date)).toBeTruthy();
});
When('repito a mesma cópia', async function () {
  await this.page.locator('#copyForm button').click();
});
Then('não devem existir novos lançamentos duplicados', async function () {
  await expect(this.page.locator('#copyResult')).toContainText('Nenhum novo');
});
When('defino uma meta de {string} com {string} reservados', async function (target, saved) {
  await this.page.locator('#goalTarget').fill(target);
  await this.page.locator('#goalSaved').fill(saved);
  await this.page.locator('#goalForm button').click();
});
Then('o progresso da meta deve ser {int} por cento', async function (percent) {
  await expect(this.page.locator('#goalProgress')).toHaveAttribute('value', String(percent));
});
When('oculto os valores', async function () {
  await this.page.locator('#toggleValues').click();
});
Then('o saldo deve estar oculto', async function () {
  await expect(this.page.locator('#balance')).toContainText('•••');
});
Then('os campos de investimentos devem estar protegidos', async function () {
  await expect(this.page.locator('#investment-total-qa-portfolio')).toHaveAttribute(
    'type',
    'password',
  );
});
