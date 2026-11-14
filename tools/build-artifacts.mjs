import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const qa = process.argv.includes('--qa');
const outDir = qa ? '.tools/qa-dist' : 'dist';
const html = await readFile(join(outDir, 'index.html'), 'utf8');
const jsName = html.match(/<script[^>]*src="([^"]+)"[^>]*><\/script>/)?.[1];
const cssName = html.match(/<link[^>]*href="([^"]+\.css)"[^>]*>/)?.[1];
if (!jsName || !cssName) throw new Error('Artefatos principais do Vite não encontrados.');
const js = await readFile(join(outDir, jsName), 'utf8'),
  css = await readFile(join(outDir, cssName), 'utf8');
if (/^import\s/m.test(js))
  throw new Error('O modo portátil não aceita imports externos estáticos.');
let portable = html
  .replace(
    /<script[^>]*src="[^"]+"[^>]*><\/script>/,
    () => `<script type="module">${js.replaceAll('</script', '<\\/script')}</script>`,
  )
  .replace(/<link[^>]*href="[^"]+\.css"[^>]*>/, () => `<style>${css}</style>`)
  .replace(/<link[^>]*(?:rel="modulepreload"|rel="manifest")[^>]*>/g, '')
  .replace(
    /<meta\b(?=[^>]*http-equiv="Content-Security-Policy")[^>]*>/,
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">`,
  );
if (!portable.includes("script-src 'unsafe-inline'"))
  throw new Error('CSP portátil não foi aplicada.');
if (!qa) await writeFile('index.html', portable);
async function files(dir, prefix = '') {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) result.push(...(await files(join(dir, entry.name), name + '/')));
    else if (!name.endsWith('.map') && name !== 'service-worker.js') result.push('./' + name);
  }
  return result;
}
const assets = await files(outDir),
  version = createHash('sha256')
    .update(js + css + html)
    .digest('hex')
    .slice(0, 12);
const sw = `const CACHE='saldo-${version}',ASSETS=${JSON.stringify(assets)};self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('saldo-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.match(e.request,{ignoreVary:true}).then(r=>r||(e.request.mode==='navigate'?caches.match(new URL('./index.html',self.registration.scope),{ignoreVary:true}).then(page=>page||fetch(e.request)):fetch(e.request))));});`;
await writeFile(join(outDir, 'service-worker.js'), sw);
await mkdir('reports', { recursive: true });
console.log(
  qa
    ? 'Build QA sintético em .tools/qa-dist, sem alterar o HTML pessoal.'
    : 'Build web/PWA em dist/ e arquivo portátil index.html atualizados.',
);
