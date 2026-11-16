# MeuSaldo.com

Controle financeiro offline, gratuito e personalizável para **Web, Android e iOS**,
com testes automatizados em Playwright, Cucumber, Appium e k6.

**Todos os valores distribuídos neste repositório são fictícios.** Não representam
o patrimônio, salário, despesas ou investimentos de uma pessoa real.

## Experimentar sem instalar

Baixe este repositório como ZIP, extraia e abra `index.html` em um navegador atual.
O arquivo é independente e funciona offline. Os dados que você alterar ficam
somente no armazenamento do seu navegador; não são gravados no GitHub.

## Personalizar para seu patrimônio

1. Para começar vazio, use **Limpar dados desta cópia**. A confirmação apaga apenas
   os dados locais desta versão pública; os campos de investimentos ficam zerados.
2. Cadastre suas receitas e despesas, ou use **Editar** no histórico de exemplos.
3. Em **Meus investimentos**, altere nomes das carteiras, nomes dos itens, valores
   e data de referência. Salve os saldos após editar.
4. Cadastre seus cartões, compras e parcelas. Confirme pagamentos e recebimentos
   quando acontecerem, sem duplicar fatura e compra nas despesas.
5. Defina metas de economia e copie os lançamentos para preparar os próximos meses.
6. Use **Salvar backup completo** para transportar seus dados para outro navegador
   ou aplicativo. A restauração substitui o estado local após confirmação.

Os saldos de investimento não entram como receita ou despesa automática. Valores
pagos/recebidos são separados do planejamento; o saldo exibido não é o saldo bancário.
As diferenças entre total informado e composição de investimentos ficam sinalizadas.

Os exemplos salariais são uma referência fictícia, não um recibo real. Limpar a
cópia oculta esse demonstrativo. Para mudar os exemplos no código, veja
`web/src/data/initial-data.js`: os valores são inteiros em centavos (10000 = R$100,00).

## Desenvolvimento em qualquer IDE

Requisitos: Node da `.nvmrc` e npm 10+. Abra a pasta no editor que preferir.

```bash
npm ci
npm run dev
```

No Windows com Node antigo, o iniciador usa a versão compatível em cache:

```powershell
.\saldo.cmd ci
.\saldo.cmd dev
```

A interface está em `web/index.html`, os estilos em `web/src/styles.css`, o
comportamento em `web/src/app.js` e as regras financeiras em `web/src/domain/finance.js`.
`npm run build` gera `dist/` e atualiza o `index.html` portátil na raiz.
Não edite o HTML gerado diretamente; altere as fontes em `web/`.

## QA e evidências

```bash
npm run browsers:install
npm run qa:check
npm run qa:bdd:mobile-web
npm run qa:bdd:iphone-web
npm run qa:tools:setup
npm run build:qa
npm run qa:k6:load
```

A bateria inclui positivos, negativos, regressão, integração, acessibilidade e
performance. Os testes usam perfis isolados e dados sintéticos. A matriz de
navegador inclui Chromium, Firefox, WebKit e viewports Android/iPhone; isso não
substitui testes nativos em aparelhos.

`reports/evidence/index.html` reúne imagens, vídeos e traces de uma execução local.
Os relatórios não são versionados; gere-os com os comandos acima. Não publique
relatórios produzidos com seus dados reais.

## Mobile

Projetos nativos: `android/` e `ios/`. Para build de QA:

```bash
npm run qa:mobile:sync
npm run mobile:android:build
```

Android requer JDK21 e SDK36. No Windows, `mobile:android:setup` prepara ferramentas
locais. iOS exige macOS/Xcode. O app id público é `app.saldoportatil.publico`, com
sufixo `.qa` nos builds de teste. Não há APK ou APP pessoal dentro deste repositório.

## Documentação

- [Uso e privacidade](docs/PERSONALIZACAO.md)
- [Desenvolvimento](docs/DESENVOLVIMENTO.md)
- [QA operacional](docs/QA.md)
- [Casos e cobertura](docs/COBERTURA-COMPLETA.md)
- [Android e iOS](docs/MOBILE.md)
- [Performance k6](docs/PERFORMANCE.md)
- [Kubernetes e K9s](docs/KUBERNETES-K9S.md)
- [Imagens e vídeos de testes](docs/EVIDENCIAS.md)
- [Solução de problemas](docs/TROUBLESHOOTING.md)
- [Validação da edição pública](docs/VALIDACAO.md)

## Privacidade e licença

Não há servidor financeiro, sincronização em nuvem nem envio automático de lançamentos.
Arquivo local, localhost, PWA e aplicativo têm armazenamentos separados. Esta edição
usa namespace próprio e não lê automaticamente os dados de outras edições.

Os backups JSON/CSV não são criptografados. Ocultar valores protege a tela, não o
arquivo nem o armazenamento. Não faça commit de dados reais, backups ou credenciais;
o `.gitignore` exclui exports comuns. Para manter uma cópia pessoal, use armazenamento
privado e guarde seu backup fora do repositório.

Código sob [licença MIT](LICENSE). Você pode usar, modificar e redistribuir conforme
a licença. Nenhuma conta ou assinatura é necessária para o controle financeiro local.
