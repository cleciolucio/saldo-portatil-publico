# Validação da edição pública

O código público contém dados fictícios e namespace de armazenamento independente.
Os presets originais, backups, relatórios locais, builds nativos e histórico de
outra edição não integram esta distribuição.

Execute os comandos abaixo para produzir evidências no seu ambiente:

```bash
npm ci
npm run browsers:install
npm run qa:check
npm run qa:mobile:dry
npm run qa:cluster:validate
npm run docs:check
```

`qa:check` valida lint, tipos, regras financeiras, build, arquivo portátil offline,
PWA, matriz Playwright e Cucumber. A galeria de mídia fica em `reports/evidence/`.
Os cenários específicos da edição pública estão em `tests/e2e/publico.spec.ts`.

Build iOS e Appium nativo dependem de macOS/aparelhos. Kubernetes/K9s depende de
Docker e cluster ativo. Dry-run e validação YAML não comprovam execução nativa ou
em cluster. Os workflows estão disponíveis para execução no seu repositório;
resultados de outra máquina não são apresentados como aprovação automática aqui.
