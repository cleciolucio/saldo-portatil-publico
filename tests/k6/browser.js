import { browser } from 'k6/browser';
import { Trend, Rate } from 'k6/metrics';
import { check } from 'k6';
import { syntheticState } from '../fixtures/state.js';
const ready = new Trend('saldo_ready_ms', true),
  filter = new Trend('saldo_filter_ms', true),
  passed = new Rate('saldo_flow_success');
const count = Number(__ENV.K6_ROWS || 500),
  base = __ENV.BASE_URL || 'http://127.0.0.1:4173',
  name = __ENV.K6_PROFILE || 'browser';
export const options = {
  scenarios: {
    ui: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 3,
      maxDuration: '1m',
      options: { browser: { type: 'chromium' } },
    },
  },
  thresholds: {
    saldo_ready_ms: ['p(95)<5000'],
    saldo_filter_ms: ['p(95)<1000'],
    saldo_flow_success: ['rate==1'],
  },
};
export default async function () {
  const context = await browser.newContext({
    viewport: { width: __ENV.K6_MOBILE === '1' ? 390 : 1280, height: 900 },
  });
  const state = syntheticState();
  for (let i = 0; i < count; i++)
    state.transactions.push({
      id: 'load-' + i,
      description: 'Carga QA ' + i,
      amount: 100,
      type: 'expense',
      category: 'Outros',
      date: '2027-01-15',
      status: 'planned',
    });
  await context.addInitScript(
    `if(location.protocol==='http:'||location.protocol==='https:'){localStorage.clear();localStorage.setItem('saldo.public.dashboard.v1.state.v2',${JSON.stringify(JSON.stringify(state))});localStorage.setItem('saldo.public.qa.seeded','true');for(const suffix of ['payroll.2026-09.v1','payroll.2026-10.v1','payroll.2026-11.v1','expenses.oct-dec-2026.v1','expenses.september-2026.v1','credit-card.sep-nov-2026.v1'])localStorage.setItem('saldo.public.dashboard.v1.'+suffix,'done');}`,
  );
  const page = await context.newPage();
  try {
    const start = Date.now();
    await page.goto(base);
    await page.waitForFunction(
      () => document.getElementById('backupReminder')?.textContent.length > 0,
    );
    await page.evaluate(() => {
      const e = document.getElementById('month');
      e.value = '2027-01';
      e.dispatchEvent(new Event('change'));
    });
    await page.waitForFunction(
      `document.querySelectorAll('#transactions tr').length===${count + 2}`,
      { timeout: 15000 },
    );
    ready.add(Date.now() - start);
    const filterStart = Date.now();
    await page.locator('#search').fill('Carga QA ' + (count - 1));
    await page.waitForFunction(() => document.querySelectorAll('#transactions tr').length === 1);
    filter.add(Date.now() - filterStart);
    const ok = await page.locator('#transactions').textContent();
    const valid = ok.includes('Carga QA ' + (count - 1));
    passed.add(valid);
    check(valid, { 'Filtro de 500+ registros correto': (v) => v });
    await page.screenshot({ path: `reports/k6/${name}-${__ITER}.png`, fullPage: true });
  } catch (error) {
    passed.add(false);
    await page.screenshot({ path: `reports/k6/${name}-${__ITER}-failure.png`, fullPage: true });
    throw error;
  } finally {
    await page.close();
    await context.close();
  }
}
export function handleSummary(data) {
  return {
    [`reports/k6/${name}-summary.json`]: JSON.stringify(data, null, 2),
    stdout: `k6 browser: p95 pronto=${data.metrics.saldo_ready_ms?.values['p(95)']?.toFixed(2)}ms; filtro=${data.metrics.saldo_filter_ms?.values['p(95)']?.toFixed(2)}ms.\n`,
  };
}
