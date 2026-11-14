import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const platform = process.argv[2];
if (platform === 'ios') {
  if (process.platform !== 'darwin')
    throw new Error(
      'Build iOS requer macOS com Xcode. No Windows use qa:web -- --project=ios-web para testar o layout WebKit.',
    );
  mkdirSync('.tools/ios-build', { recursive: true });
  const result = spawnSync(
    'xcodebuild',
    [
      '-project',
      'ios/App/App.xcodeproj',
      '-scheme',
      'App',
      '-configuration',
      'Debug',
      '-sdk',
      'iphonesimulator',
      '-derivedDataPath',
      resolve('.tools/ios-build'),
      'CODE_SIGNING_ALLOWED=NO',
      'PRODUCT_BUNDLE_IDENTIFIER=app.saldoportatil.publico.qa',
      'build',
    ],
    { stdio: 'inherit' },
  );
  process.exit(result.status ?? 1);
} else if (platform === 'android') {
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!sdk || !existsSync(sdk))
    throw new Error('Defina ANDROID_HOME para um SDK Android atualizado. Veja docs/MOBILE.md.');
  const gradle = resolve('android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
  const result = spawnSync(
    process.platform === 'win32' ? `"${gradle}"` : 'bash',
    process.platform === 'win32' ? ['assembleDebug'] : [gradle, 'assembleDebug'],
    {
      cwd: resolve('android'),
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  );
  process.exit(result.status ?? 1);
} else throw new Error('Use android ou ios.');
