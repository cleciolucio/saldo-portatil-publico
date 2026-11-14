# Desenvolvimento

## Pré-requisitos e comandos

Node 22.23.5 e npm 10+; versões exatas das dependências em `package-lock.json`.
No Windows, `saldo.cmd` inicia a versão compatível em cache automaticamente. Para
qualquer IDE basta abrir a pasta do projeto. Não é necessário plugin proprietário.
Há tarefas e configurações opcionais para VS Code em `.vscode/`.

```powershell
.\saldo.cmd ci
.\saldo.cmd dev
.\saldo.cmd build
.\saldo.cmd preview
```

`dev` atende somente em `127.0.0.1:5173`, com recarga automática. `preview` abre a
build de produção em `127.0.0.1:4173`. Os comandos de servidor ficam ativos: encerre
com Ctrl+C. Em macOS/Linux use `npm ci` e `npm run <tarefa>`.

## Estrutura

```text
web/
  index.html                Estrutura acessível da interface
  src/
    main.js                 Entrada e registro do service worker
    app.js                  Interface, persistência e funcionalidades
    styles.css              Estilos do produto e telas pequenas
    utilities.css           Utilitários CSS herdados do projeto original
    domain/finance.js       Moeda, datas, calendário e parcelamento
    native-io.js            Exportação web / Filesystem e Share nativos
    data/initial-data.js    Dados financeiros iniciais privados
  public/                   Ícone e manifesto PWA
android/                    Projeto Gradle/Android Studio
  app/src/main/             MainActivity e manifesto
ios/App/                    Projeto Xcode, Swift e integração SPM
  CapApp-SPM/                Plugins nativos Swift Package Manager
tests/
  unit/                     Regras financeiras, node:test
  e2e/                      Playwright Test com TypeScript
  bdd/                      Gherkin em português + Playwright
  mobile/                   Gherkin em português + Appium/WebdriverIO
  fixtures/                 Dados fictícios compartilhados
scripts em tools/           Build, execução, diagnóstico e automação
```

## Persistência e compatibilidade

O estado canônico é `saldo.public.dashboard.v1.state.v2`, gravado em uma única operação do
localStorage. O carregamento mantém compatibilidade com o armazenamento anterior
`saldo.public.dashboard.v1` e os backups JSON v1/v2. Marcadores de importação impedem
recriação dos dados iniciais após edições/exclusões. Investimentos são uma posição
geral independente do filtro mensal; parcelas geram faturas, que são os únicos
registros do cartão somados nas despesas.

O demonstrativo salarial é uma referência fixa: alterar uma transação não modifica
o recibo original. Dados de outro navegador/origem exigem backup/restauração.
Não altere os nomes das chaves de persistência sem uma migração testada.

## Build e distribuição

`build` usa Vite e gera `dist/`, com JS/CSS, mapas de código e service worker. A
primeira visita online instala o cache da PWA; visitas seguintes à mesma versão
funcionam offline. Mudanças de versão são ativadas quando as abas anteriores são
fechadas. Não use cache PWA para validar mudanças do servidor de desenvolvimento.

O mesmo build atualiza `index.html` na raiz, com JS/CSS incorporados. Esse é o modo
portátil sem servidor, preservando o caminho usado anteriormente pelo usuário.
O `build-artifacts.mjs` falha se houver imports estáticos incompatíveis com esse
modo. Um teste de regressão verifica também o arquivo local gerado.

`mobile:sync` executa o build e copia `dist/` para os projetos nativos. O projeto
mobile não depende do servidor Vite para abrir: os assets são embarcados.
No Android/iOS, a exportação chama a folha de compartilhamento do sistema; escolha
Arquivos/Downloads para guardar o JSON. A restauração usa o seletor de arquivos.
As operações de compartilhar/restaurar precisam de verificação adicional em cada
versão real de Android/iOS antes de uma distribuição.

## Qualidade e dependências

```powershell
.\saldo.cmd lint
.\saldo.cmd typecheck
.\saldo.cmd format:check
.\saldo.cmd test:unit
.\saldo.cmd docs:check
```

Para aplicar a formatação: `format`. Atualize dependências em branch própria,
revise o lockfile e execute `qa:check`, os BDD mobile-web e o smoke nativo.
`security:production` (`npm audit --omit=dev`) verifica bibliotecas de produção; a árvore completa de QA
inclui dependências transitivas do Appium, e seu resultado deve ser avaliado
separadamente. Não execute `npm audit fix --force` sem revisar as mudanças.

## Referências oficiais

- [Vite](https://vite.dev/guide/)
- [Capacitor e ambiente nativo](https://capacitorjs.com/docs/getting-started/environment-setup)
- [Playwright e projetos](https://playwright.dev/docs/test-projects)
- [Cucumber JS](https://github.com/cucumber/cucumber-js)
