import { setWorldConstructor, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { remote } from 'webdriverio';
import { resolve } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { syntheticState, seedStorage } from '../../fixtures/state.js';
setDefaultTimeout(120000);
class MobileWorld {
  constructor({ attach }) {
    this.attach = attach;
  }
}
setWorldConstructor(MobileWorld);
export async function switchToAppWebView(driver) {
  await driver.waitUntil(
    async () => {
      const contexts = await driver.getContexts();
      const name = contexts
        .map((c) => (typeof c === 'string' ? c : c.id))
        .find((c) => c.startsWith('WEBVIEW'));
      if (!name) return false;
      try {
        await driver.switchContext(name);
        return (
          (await driver.$('#month').isExisting()) &&
          (await driver.$('#backupReminder').getText()).length > 0
        );
      } catch {
        return false;
      }
    },
    {
      timeout: 60000,
      timeoutMsg:
        'WebView não encontrada. Confira o build debug, Chromedriver/WebView e as instruções mobile.',
    },
  );
}
Before(async function () {
  const platform = process.env.MOBILE_PLATFORM;
  if (!['android', 'ios'].includes(platform))
    throw new Error('Use qa:mobile:android ou qa:mobile:ios.');
  if (platform === 'ios' && process.platform !== 'darwin')
    throw new Error('iOS requer macOS e Xcode.');
  const app = resolve(
    process.env.MOBILE_APP ||
      (platform === 'android'
        ? 'android/app/build/outputs/apk/debug/app-debug.apk'
        : '.tools/ios-build/Build/Products/Debug-iphonesimulator/App.app'),
  );
  if (!existsSync(app))
    throw new Error(
      `Aplicativo não encontrado: ${app}. Execute mobile:${platform}:build primeiro.`,
    );
  this.appId = process.env.MOBILE_APP_ID || 'app.saldoportatil.publico.qa';
  const capabilities = {
    platformName: platform === 'android' ? 'Android' : 'iOS',
    'appium:automationName': platform === 'android' ? 'UiAutomator2' : 'XCUITest',
    'appium:deviceName':
      process.env.MOBILE_DEVICE_NAME || (platform === 'android' ? 'Android Emulator' : 'iPhone 17'),
    'appium:app': app,
    'appium:newCommandTimeout': 120,
    'appium:noReset': false,
    ...(process.env.MOBILE_UDID ? { 'appium:udid': process.env.MOBILE_UDID } : {}),
    ...(process.env.MOBILE_PLATFORM_VERSION
      ? { 'appium:platformVersion': process.env.MOBILE_PLATFORM_VERSION }
      : {}),
    ...(platform === 'android'
      ? {
          'appium:appPackage': this.appId,
          'appium:appActivity': 'app.saldoportatil.publico.MainActivity',
          'appium:ensureWebviewsHavePages': true,
        }
      : { 'appium:bundleId': this.appId, 'appium:includeSafariInWebviews': false }),
  };
  this.driver = await remote({
    hostname: process.env.APPIUM_HOST || '127.0.0.1',
    port: Number(process.env.APPIUM_PORT || 4723),
    path: '/',
    logLevel: 'warn',
    connectionRetryCount: 0,
    capabilities,
  });
  await this.driver.startRecordingScreen({ timeLimit: '180' });
  this.recording = true;
  await switchToAppWebView(this.driver);
  await this.driver.execute(() => localStorage.clear());
  await this.driver.execute(seedStorage, syntheticState());
  await this.driver.refresh();
  await this.driver.$('#month').waitForExist({ timeout: 15000 });
  await this.driver.waitUntil(
    async () => (await this.driver.$('#backupReminder').getText()).length > 0,
    {
      timeout: 15000,
      timeoutMsg: 'A interface não terminou de carregar após a preparação dos dados.',
    },
  );
  await this.driver.execute(() => {
    const month = document.getElementById('month');
    month.value = '2027-01';
    month.dispatchEvent(new Event('change', { bubbles: true }));
  });
});
After(async function ({ pickle }) {
  try {
    if (this.driver) {
      mkdirSync('reports/mobile/media', { recursive: true });
      const screenshot = Buffer.from(await this.driver.takeScreenshot(), 'base64');
      writeFileSync(`reports/mobile/media/${pickle.id}.png`, screenshot);
      await this.attach(screenshot, 'image/png');
      if (this.recording) {
        const video = await this.driver.stopRecordingScreen();
        if (video) {
          const path = `reports/mobile/media/${pickle.id}.mp4`;
          writeFileSync(path, Buffer.from(video, 'base64'));
          await this.attach('Vídeo: ' + path, 'text/plain');
        }
      }
    }
  } finally {
    await this.driver?.deleteSession();
  }
});
