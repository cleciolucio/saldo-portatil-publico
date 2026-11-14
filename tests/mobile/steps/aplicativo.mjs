import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { switchToAppWebView } from '../support/world.mjs';
Given('que o aplicativo nativo está aberto com dados fictícios', async function () {
  assert(await this.driver.$('#month').isExisting());
});
Then('vejo a receita fictícia de {string} no aplicativo', async function (value) {
  assert((await this.driver.$('#income').getText()).includes(value));
});
Then('vejo a despesa fictícia de {string} no aplicativo', async function (value) {
  assert((await this.driver.$('#expenses').getText()).includes(value));
});
When('confirmo o aluguel no aplicativo', async function () {
  const rows = await this.driver.$$('#transactions tr');
  for (const row of rows) {
    if ((await row.getText()).includes('Aluguel fictício')) {
      await row.$('button=Confirmar pagamento').click();
      return;
    }
  }
  throw new Error('Aluguel fictício não encontrado.');
});
When('reinicio o aplicativo', async function () {
  await this.driver.switchContext('NATIVE_APP');
  await this.driver.terminateApp(this.appId);
  await this.driver.activateApp(this.appId);
  await switchToAppWebView(this.driver);
  await this.driver.execute(() => {
    const month = document.getElementById('month');
    month.value = '2027-01';
    month.dispatchEvent(new Event('change', { bubbles: true }));
  });
});
Then('o aluguel permanece pago no aplicativo', async function () {
  assert((await this.driver.$('#transactions').getText()).includes('Pago'));
  assert((await this.driver.$('#actualSummary').getText()).includes('250,00'));
});
When('oculto os valores no aplicativo', async function () {
  await this.driver.$('#toggleValues').click();
});
Then('o saldo do aplicativo fica oculto', async function () {
  assert((await this.driver.$('#balance').getText()).includes('•••'));
});
