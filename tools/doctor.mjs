import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const checks = [];
const add = (name, ok, detail, scope = 'mobile') => checks.push({ name, ok, detail, scope });
const version = process.versions.node.split('.').map(Number);
add('Node', version[0] >= 22, process.versions.node, 'web');
add(
  'Dependências npm',
  existsSync('node_modules/@playwright/test'),
  'Use saldo.cmd ci ou npm ci.',
  'web',
);
add('Build web', existsSync('dist/index.html'), 'Use build.', 'web');
const sdk =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  (process.platform === 'win32' ? join(process.env.LOCALAPPDATA || '', 'Android/Sdk') : '');
add(
  'ANDROID_HOME',
  !!process.env.ANDROID_HOME,
  process.env.ANDROID_HOME || `Não definido. SDK detectado: ${sdk}`,
);
const adb = join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const adbResult = existsSync(adb) ? spawnSync(adb, ['devices', '-l'], { encoding: 'utf8' }) : null;
add(
  'Dispositivo Android',
  !!adbResult?.stdout?.split(/\r?\n/).some((l) => /\sdevice(\s|$)/.test(l)),
  adbResult?.stdout?.trim() || 'Conecte aparelho ou inicie emulador.',
);
const java = spawnSync('java', ['-version'], { encoding: 'utf8' });
const javaText = java.stderr || java.stdout || '';
const major = Number(javaText.match(/version "(\d+)/)?.[1]);
add('JDK 21+', major >= 21, javaText.trim() || 'Java não encontrado.');
const platforms = join(sdk, 'platforms');
add(
  'Android SDK API 36+',
  existsSync(platforms) &&
    readdirSync(platforms).some((p) => /^android-(\d+)$/.test(p) && Number(p.slice(8)) >= 36),
  existsSync(platforms) ? readdirSync(platforms).join(', ') : 'Instale Android SDK Platform 36.',
);
add(
  'Android debug APK',
  existsSync('android/app/build/outputs/apk/debug/app-debug.apk'),
  'Use mobile:sync e mobile:android:build.',
);
const xcode =
  process.platform === 'darwin'
    ? spawnSync('xcodebuild', ['-version'], { encoding: 'utf8' })
    : null;
add(
  'Xcode / iOS',
  xcode?.status === 0,
  xcode?.stdout?.trim() || 'iOS nativo requer macOS com Xcode 26+.',
);
const drivers = resolve('.appium/node_modules');
add(
  'Appium UiAutomator2',
  existsSync(join(drivers, 'appium-uiautomator2-driver')),
  'Use appium:drivers.',
);
add(
  'Appium XCUITest',
  existsSync(join(drivers, 'appium-xcuitest-driver')),
  'Instale no macOS com appium:drivers.',
);
for (const c of checks) console.log(`${c.ok ? 'OK' : 'PENDENTE'} | ${c.name} | ${c.detail}`);
mkdirSync('reports', { recursive: true });
writeFileSync(
  'reports/environment.json',
  JSON.stringify(
    { checkedAt: new Date().toISOString(), platform: process.platform, checks },
    null,
    2,
  ),
);
if (process.argv.includes('--strict')) process.exitCode = checks.every((c) => c.ok) ? 0 : 1;
