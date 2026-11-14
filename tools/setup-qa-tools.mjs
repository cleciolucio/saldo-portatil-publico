import { mkdir, readFile, writeFile, readdir, copyFile, chmod } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const os = { win32: 'windows', darwin: 'darwin', linux: 'linux' }[process.platform],
  arch = { x64: 'amd64', arm64: 'arm64' }[process.arch];
if (!os || !arch) throw new Error('Plataforma não suportada pelo instalador local.');
const dir = resolve('.tools/bin'),
  cache = resolve('.tools/qa-downloads');
await mkdir(dir, { recursive: true });
await mkdir(cache, { recursive: true });
async function get(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Download ${r.status}: ${url}`);
  return Buffer.from(await r.arrayBuffer());
}
async function install({ name, url, checksum, archive }) {
  const destination = join(dir, name + (os === 'windows' ? '.exe' : ''));
  if (existsSync(destination)) {
    console.log(name + ' já disponível em .tools/bin');
    return;
  }
  console.log('Instalando ' + name + ' no projeto...');
  const filename = url.split('/').at(-1),
    buffer = existsSync(join(cache, filename))
      ? await readFile(join(cache, filename))
      : await get(url),
    sums = (await get(checksum)).toString();
  const line = sums.split(/\r?\n/).find((l) => l.includes(filename)) || sums.trim();
  const expected = line.match(/[a-fA-F0-9]{64}/)?.[0];
  if (!expected || createHash('sha256').update(buffer).digest('hex') !== expected.toLowerCase())
    throw new Error('Checksum SHA256 divergente: ' + name);
  if (!archive) {
    await writeFile(destination, buffer);
  } else {
    const path = join(cache, filename),
      unpacked = join(cache, name);
    await writeFile(path, buffer);
    await mkdir(unpacked, { recursive: true });
    let result;
    result = spawnSync('tar', ['-xf', path, '-C', unpacked], { stdio: 'inherit' });
    if (result.status !== 0) throw new Error('Falha ao extrair ' + name);
    async function find(root) {
      for (const e of await readdir(root, { withFileTypes: true })) {
        const p = join(root, e.name);
        if (e.isDirectory()) {
          const found = await find(p);
          if (found) return found;
        } else if (e.name === name + (os === 'windows' ? '.exe' : '')) return p;
      }
      return null;
    }
    const binary = await find(unpacked);
    if (!binary) throw new Error('Executável não encontrado: ' + name);
    await copyFile(binary, destination);
  }
  if (os !== 'windows') await chmod(destination, 0o755);
}
const k6Os = os === 'darwin' ? 'macos' : os,
  k9sOs = { windows: 'Windows', linux: 'Linux', darwin: 'Darwin' }[os];
await install({
  name: 'k6',
  url: `https://github.com/grafana/k6/releases/download/v2.4.0/k6-v2.4.0-${k6Os}-${arch}.${os === 'windows' ? 'zip' : 'tar.gz'}`,
  checksum: 'https://github.com/grafana/k6/releases/download/v2.4.0/k6-v2.4.0-checksums.txt',
  archive: true,
});
await install({
  name: 'k9s',
  url: `https://github.com/derailed/k9s/releases/download/v0.51.0/k9s_${k9sOs}_${arch}.${os === 'windows' ? 'zip' : 'tar.gz'}`,
  checksum: 'https://github.com/derailed/k9s/releases/download/v0.51.0/checksums.sha256',
  archive: true,
});
await install({
  name: 'kubectl',
  url: `https://dl.k8s.io/release/v1.37.2/bin/${os}/${arch}/kubectl${os === 'windows' ? '.exe' : ''}`,
  checksum: `https://dl.k8s.io/release/v1.37.2/bin/${os}/${arch}/kubectl${os === 'windows' ? '.exe' : ''}.sha256`,
});
await install({
  name: 'kind',
  url: `https://github.com/kubernetes-sigs/kind/releases/download/v0.33.0/kind-${os}-${arch}`,
  checksum: `https://github.com/kubernetes-sigs/kind/releases/download/v0.33.0/kind-${os}-${arch}.sha256sum`,
});
await writeFile(
  '.tools/qa-tools.json',
  JSON.stringify(
    {
      k6: '2.4.0',
      k9s: '0.51.0',
      kubectl: '1.37.2',
      kind: '0.33.0',
      installedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
for (const name of ['k6', 'kubectl', 'kind']) {
  const result = spawnSync(
    join(dir, name + (os === 'windows' ? '.exe' : '')),
    name === 'kubectl' ? ['version', '--client=true', '-o', 'json'] : ['version'],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(name + ' não executou: ' + result.stderr);
  console.log(name + ': OK');
}
console.log('Ferramentas verificadas por SHA256. Nenhuma instalação global foi substituída.');
