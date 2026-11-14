import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
let [task = 'dev', ...args] = process.argv.slice(2);
if (args[0] === '--') args.shift();
if (
  ![
    ...Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).scripts),
    'install',
    'ci',
  ].includes(task)
)
  throw new Error('Use uma tarefa existente no package.json.');
const npmPath = process.env.npm_execpath;
let npmCli = npmPath;
if (!npmCli || !existsSync(npmCli)) {
  const result = spawnSync(
    process.platform === 'win32' ? 'where.exe' : 'which',
    [process.platform === 'win32' ? 'npm.cmd' : 'npm'],
    { encoding: 'utf8' },
  );
  const paths = (result.stdout || '').trim().split(/\r?\n/);
  npmCli = paths
    .flatMap((p) => [
      join(dirname(p), 'node_modules/npm/bin/npm-cli.js'),
      p.endsWith('.cmd') ? '' : realpathSync(p),
    ])
    .find((p) => p && existsSync(p));
}
if (!npmCli) throw new Error('Instale npm antes de usar o ambiente.');
const version = process.versions.node.split('.').map(Number);
if (
  version[0] < 22 ||
  (version[0] === 22 && (version[1] < 23 || (version[1] === 23 && version[2] < 4))) ||
  version[0] === 23 ||
  (version[0] === 24 && (version[1] < 22 || (version[1] === 22 && version[2] < 1)))
) {
  console.log('Usando Node 22.23.5 no cache local, sem alterar a instalação do Windows.');
  const result = spawnSync(
    process.execPath,
    [
      npmCli,
      'exec',
      '--yes',
      '--package=node@22.23.5',
      '--',
      'node',
      join(root, 'tools/run.mjs'),
      task,
      ...args,
    ],
    { stdio: 'inherit' },
  );
  process.exit(result.status ?? 1);
}
const localEnv = existsSync('.tools/environment.json')
  ? JSON.parse(readFileSync('.tools/environment.json', 'utf8').replace(/^\uFEFF/, ''))
  : {};
const env = {
  ...process.env,
  ...localEnv,
  PATH:
    dirname(process.execPath) +
    (process.platform === 'win32' ? ';' : ':') +
    (localEnv.JAVA_HOME
      ? join(localEnv.JAVA_HOME, 'bin') + (process.platform === 'win32' ? ';' : ':')
      : '') +
    (localEnv.ANDROID_HOME
      ? join(localEnv.ANDROID_HOME, 'platform-tools') + (process.platform === 'win32' ? ';' : ':')
      : '') +
    process.env.PATH,
};
const result = spawnSync(
  process.execPath,
  [npmCli, ...(['ci', 'install'].includes(task) ? [task, ...args] : ['run', task, '--', ...args])],
  { stdio: 'inherit', env },
);
process.exit(result.status ?? 1);
