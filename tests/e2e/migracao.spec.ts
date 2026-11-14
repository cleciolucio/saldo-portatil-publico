import { test, expect } from '@playwright/test';
import { STATE_KEY, syntheticState } from '../fixtures/state.js';
test('MIG-01 @integration @regression: migrar localStorage antigo preserva edições e idempotência', async ({
  page,
}) => {
  page.on('dialog', (d) => d.accept());
  await page.addInitScript(() => {
    if (localStorage.getItem('migration.seeded')) return;
    localStorage.clear();
    localStorage.setItem('migration.seeded', 'true');
    localStorage.setItem(
      'saldo.public.dashboard.v1',
      JSON.stringify([
        {
          id: 'legacy-existing-qa',
          description: 'Registro legado ajustado QA',
          amount: 77777,
          type: 'income',
          category: 'Outros',
          date: '2027-01-15',
          status: 'completed',
        },
      ]),
    );
    for (const suffix of [
      'payroll.2026-09.v1',
      'payroll.2026-10.v1',
      'payroll.2026-11.v1',
      'expenses.oct-dec-2026.v1',
      'expenses.september-2026.v1',
      'credit-card.sep-nov-2026.v1',
    ])
      localStorage.setItem('saldo.public.dashboard.v1.' + suffix, 'done');
  });
  await page.goto('/');
  await expect(page.locator('#backupReminder')).not.toBeEmpty();
  const initial = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STATE_KEY);
  expect(
    initial.transactions.find((t: { id: string }) => t.id === 'legacy-existing-qa'),
  ).toMatchObject({ amount: 77777, status: 'completed' });
  await page.reload();
  await expect(page.locator('#backupReminder')).not.toBeEmpty();
  expect(
    (await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STATE_KEY)).transactions,
  ).toEqual(initial.transactions);
});
for (const mode of ['json-corrompido', 'configuracao-invalida'])
  test(`MIG-NEG ${mode}: interrompe carregamento sem sobrescrever estado`, async ({ page }) => {
    const b: any = syntheticState();
    b.settings.cards = [{ id: 'bad', name: 'Inválido', close: 99, due: 1 }];
    const raw = mode === 'json-corrompido' ? '{invalid' : JSON.stringify(b);
    const alerts: string[] = [];
    page.on('dialog', async (d) => {
      alerts.push(d.message());
      await d.accept();
    });
    await page.addInitScript(
      ({ key, value }) => {
        localStorage.clear();
        localStorage.setItem(key, value);
      },
      { key: STATE_KEY, value: raw },
    );
    await page.goto('/');
    await expect.poll(() => alerts.length).toBe(1);
    expect(await page.evaluate((key) => localStorage.getItem(key), STATE_KEY)).toBe(raw);
    expect(alerts[0]).toMatch(/preservar|inválidas|alterado/i);
  });
