import { writeFileSync, mkdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';
const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export default class EvidenceReporter {
  rows = [];
  onTestEnd(test, result) {
    this.rows.push({
      id: test.id,
      title: test.title,
      project: test.parent.project().name,
      file: relative(process.cwd(), test.location.file),
      status: result.status,
      expected: test.expectedStatus,
      durationMs: result.duration,
      retry: result.retry,
      attachments: result.attachments
        .filter((a) => a.path)
        .map((a) => ({
          name: a.name,
          type: a.contentType,
          path: relative(resolve('reports/evidence'), a.path).replaceAll('\\', '/'),
        })),
    });
  }
  onEnd(result) {
    mkdirSync('reports/evidence', { recursive: true });
    const manifest = {
      createdAt: new Date().toISOString(),
      status: result.status,
      tests: this.rows,
    };
    writeFileSync('reports/evidence/manifest.json', JSON.stringify(manifest, null, 2));
    const cards = this.rows
      .map(
        (t) =>
          `<article><h2>${escape(t.project)} · ${escape(t.title)}</h2><p>${escape(t.status)} · ${(t.durationMs / 1000).toFixed(2)}s · tentativa ${t.retry + 1}</p>${t.attachments
            .map((a) => {
              const p = encodeURI(a.path);
              return a.type.startsWith('image/')
                ? `<a href="${p}"><img loading="lazy" src="${p}" alt="Evidência ${escape(t.title)}"></a>`
                : a.type.startsWith('video/')
                  ? `<video controls preload="none" src="${p}" aria-label="Vídeo ${escape(t.title)}"></video>`
                  : `<a href="${p}">${escape(a.name)}</a>`;
            })
            .join(' ')}</article>`,
      )
      .join('');
    writeFileSync(
      'reports/evidence/index.html',
      `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Evidências QA · Saldo</title><style>body{margin:24px;font:16px system-ui;background:#101713;color:#edf3ed}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}article{border:1px solid #415331;padding:18px;border-radius:16px;min-width:0}h2{font-size:17px}img,video{max-width:100%;max-height:340px}a{color:#c2f570}</style><h1>Evidências reais da bateria de testes</h1><p>${escape(result.status)} · ${this.rows.length} execuções · dados fictícios · imagens, vídeos e traces por cenário.</p><main>${cards}</main></html>`,
    );
  }
}
