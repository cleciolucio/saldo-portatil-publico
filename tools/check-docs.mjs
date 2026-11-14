import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
const scripts = JSON.parse(await readFile('package.json', 'utf8')).scripts;
const files = [
  'README.md',
  ...(await readdir('docs')).filter((f) => f.endsWith('.md')).map((f) => 'docs/' + f),
];
const errors = [];
for (const file of files) {
  const text = await readFile(file, 'utf8');
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^(https?:|mailto:)/.test(target)) continue;
    const full = resolve(dirname(file), target);
    const fromRoot = relative(resolve('.'), full).replaceAll('\\', '/');
    const generated =
      fromRoot.startsWith('reports/') || fromRoot.startsWith('android/app/build/outputs/');
    if (!existsSync(full) && !generated) errors.push(`${file}: link inválido ${target}`);
  }
  for (const match of text.matchAll(/(?:npm run|saldo\.cmd)\s+([\w:-]+)/g)) {
    const task = match[1];
    if (['ci', 'install'].includes(task)) continue;
    if (!scripts[task]) errors.push(`${file}: comando inexistente ${task}`);
  }
}
for (const feature of [
  'tests/bdd/features/planejamento.feature',
  'tests/mobile/features/aplicativo.feature',
]) {
  const text = await readFile(feature, 'utf8');
  if (!text.includes('# language: pt') || !text.includes('Cenário:'))
    errors.push(`${feature}: Gherkin português inválido`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `${files.length} documentos: links locais, tarefas npm e referências Gherkin conferidos.`,
  );
