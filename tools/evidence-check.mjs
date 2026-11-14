import {
  readFileSync,
  existsSync,
  statSync,
  copyFileSync,
  mkdirSync,
  writeFileSync,
  openSync,
  readSync,
  closeSync,
} from 'node:fs';
import { resolve } from 'node:path';
const root = resolve('reports/evidence'),
  manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
let images = 0,
  videos = 0,
  traces = 0;
const errors = [];
for (const t of manifest.tests) {
  if (t.status !== 'passed') errors.push(`${t.project}: ${t.title} = ${t.status}`);
  for (const kind of ['image/', 'video/', 'application/zip']) {
    const items = t.attachments.filter((a) => a.type.startsWith(kind));
    if (!items.length) {
      errors.push(`${t.title}: sem ${kind}`);
      continue;
    }
    for (const a of items) {
      const p = resolve(root, a.path);
      if (!existsSync(p) || statSync(p).size === 0) {
        errors.push('Mídia ausente/vazia: ' + p);
        continue;
      }
      const fd = openSync(p, 'r'),
        bytes = Buffer.alloc(4);
      readSync(fd, bytes, 0, 4, 0);
      closeSync(fd);
      const header = bytes.toString('hex');
      if (kind === 'image/') {
        images++;
        if (header !== '89504e47') errors.push('PNG inválido: ' + p);
      }
      if (kind === 'video/') {
        videos++;
        if (header !== '1a45dfa3') errors.push('WebM inválido: ' + p);
      }
      if (kind === 'application/zip') {
        traces++;
        if (header !== '504b0304') errors.push('Trace ZIP inválido: ' + p);
      }
    }
  }
}
const sample = manifest.tests.find((t) => t.project === 'chromium' && t.title.startsWith('FUN-01'));
if (sample) {
  mkdirSync('reports/evidence/examples', { recursive: true });
  for (const [type, name] of [
    ['image/', 'transacoes.png'],
    ['video/', 'transacoes.webm'],
  ]) {
    const item = sample.attachments.find((a) => a.type.startsWith(type));
    if (item) copyFileSync(resolve(root, item.path), resolve(root, 'examples', name));
  }
}
const summary = {
  createdAt: new Date().toISOString(),
  tests: manifest.tests.length,
  images,
  videos,
  traces,
  status: errors.length ? 'failed' : 'passed',
  errors,
};
writeFileSync('reports/evidence/integrity.json', JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
if (errors.length) process.exitCode = 1;
