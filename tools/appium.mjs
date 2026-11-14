import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const home = resolve('.appium');
mkdirSync(home, { recursive: true });
const pkg = JSON.parse(readFileSync('node_modules/appium/package.json', 'utf8'));
const cli = resolve('node_modules/appium', typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.appium);
const env = { ...process.env, APPIUM_HOME: home };
const run = (args) =>
  new Promise((resolveCode, reject) => {
    const child = spawn(process.execPath, [cli, ...args], { stdio: 'inherit', env });
    child.on('exit', (code) => resolveCode(code ?? 1));
    child.on('error', reject);
  });
const mode = process.argv[2];
if (mode === 'server') {
  const args = ['--address', '127.0.0.1', '--port', process.env.APPIUM_PORT || '4723'];
  if (process.env.APPIUM_CHROMEDRIVER_AUTODOWNLOAD === '1')
    args.push('--allow-insecure', 'uiautomator2:chromedriver_autodownload');
  process.exitCode = await run(args);
} else if (mode === 'drivers') {
  const installed = (name) => {
    try {
      return JSON.parse(readFileSync(resolve('.appium/node_modules', name, 'package.json'), 'utf8'))
        .version;
    } catch {
      return null;
    }
  };
  const drivers = [
    ['uiautomator2', 'appium-uiautomator2-driver', '8.0.0'],
    ...(process.platform === 'darwin' ? [['xcuitest', 'appium-xcuitest-driver', '12.0.0']] : []),
  ];
  for (const [name, pkgName, version] of drivers) {
    if (installed(pkgName) === version) {
      console.log(name + '@' + version + ' já instalado.');
      continue;
    }
    if (installed(pkgName) && (await run(['driver', 'uninstall', name]))) {
      process.exitCode = 1;
      break;
    }
    const code = await run(['driver', 'install', name + '@' + version]);
    if (code) {
      process.exitCode = code;
      break;
    }
  }
  if (process.platform !== 'darwin')
    console.log('XCUITest requer macOS; execute appium:drivers no Mac.');
} else if (mode === 'list') process.exitCode = await run(['driver', 'list', '--installed']);
else throw new Error('Use server, drivers ou list.');
