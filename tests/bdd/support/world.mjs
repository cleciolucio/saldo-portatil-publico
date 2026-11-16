import { setWorldConstructor, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, firefox, webkit, devices } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { syntheticState, seedStorage } from '../../fixtures/state.js';
setDefaultTimeout(process.env.HEADED === '1' ? 60000 : 30000);
const reportName = (process.env.BDD_REPORT_NAME || 'web').replace(/[^a-zA-Z0-9._-]/g, '_');
class SaldoWorld {
  constructor({ attach }) {
    this.attach = attach;
    this.baseURL = process.env.BASE_URL || 'http://127.0.0.1:5173';
  }
}
setWorldConstructor(SaldoWorld);
Before(async function () {
  const browserType = { chromium, firefox, webkit }[process.env.BDD_BROWSER || 'chromium'];
  if (!browserType) throw new Error('BDD_BROWSER deve ser chromium, firefox ou webkit.');
  this.browser = await browserType.launch({
    headless: process.env.HEADED !== '1',
    ...(browserType === chromium && process.env.BDD_BROWSER_CHANNEL === 'chrome'
      ? { channel: 'chrome' }
      : {}),
  });
  const device =
    process.env.BDD_DEVICE === 'android'
      ? devices['Pixel 7']
      : process.env.BDD_DEVICE === 'ios'
        ? devices['iPhone 14']
        : {};
  this.context = await this.browser.newContext({
    ...device,
    baseURL: this.baseURL,
    recordVideo: { dir: 'reports/cucumber/videos', size: { width: 1280, height: 800 } },
  });
  await this.context.tracing.start({ screenshots: true, snapshots: true });
  await this.context.addInitScript(seedStorage, syntheticState());
  this.page = await this.context.newPage();
  this.page.on('dialog', (d) => d.accept());
});
After(async function ({ result, pickle }) {
  try {
    if (this.page) {
      await this.attach(await this.page.screenshot({ fullPage: true }), 'image/png');
      const video = this.page.video();
      await mkdir('reports/cucumber/media', { recursive: true });
      const artifactName = `${reportName}-${pickle.id}`;
      await this.page.screenshot({
        path: `reports/cucumber/media/${artifactName}.png`,
        fullPage: true,
      });
      await this.context.tracing.stop({ path: `reports/cucumber/media/${artifactName}.zip` });
      await this.context.close();
      this.context = null;
      if (video) {
        const path = `reports/cucumber/media/${artifactName}.webm`;
        await video.saveAs(path);
        await this.attach('Vídeo: ' + path + ' · ' + result?.status, 'text/plain');
      }
    }
  } finally {
    await this.context?.close();
    await this.browser?.close();
  }
});
