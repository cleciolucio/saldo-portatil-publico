# Guia operacional de QA

Este guia corresponde aos comandos do `package.json` e aos cenários executáveis
em `tests/`. O [catálogo](CASOS-DE-TESTE.md) relaciona riscos, casos e evidências.

## Roteiro para o primeiro dia de QA

Siga as etapas na ordem abaixo a partir da raiz do repositório. Use uma cópia
privada do projeto e não use arquivos ou dados financeiros pessoais nos testes.

### 1. Preparar o terminal e o projeto

No Windows, abra PowerShell na pasta do projeto. Confirme que o wrapper, Node e
npm estão disponíveis:

```powershell
Get-Location
node --version
npm --version
```

O Node suportado é 22.23.5 (indicado em `.nvmrc`) ou uma versão compatível com
`engines` no `package.json`; npm 10 ou superior. Prefira `saldo.cmd` no Windows:
ele usa a versão de Node em cache quando a instalada é antiga, carrega as
configurações locais do Android e evita a restrição comum de execução de
`npm.ps1`. Se o Node/npm não estiverem disponíveis no terminal, instale-os antes.

Instale as dependências exatamente como estão registradas no lockfile:

```powershell
.\saldo.cmd ci
```

Não use `npm install` para preparar uma execução reproduzível. Em macOS/Linux,
instale a versão indicada em `.nvmrc` e rode `npm ci`.

### 2. Instalar navegadores e conferir o ambiente

```powershell
.\saldo.cmd browsers:install
.\saldo.cmd doctor
.\saldo.cmd docs:check
.\saldo.cmd format:check
```

`browsers:install` instala Chromium, Firefox e WebKit usados pelo Playwright.
No Linux/CI, instale também as bibliotecas do sistema:
`npx playwright install --with-deps chromium firefox webkit`.
`doctor` grava `reports/environment.json`; leia os itens `OK` e `PENDENTE`.
No Windows, pendências Android/iOS não bloqueiam QA web. **Não use `doctor -- --strict`
como gate web**: o modo estrito também exige pré-requisitos mobile (incluindo
Xcode, indisponível no Windows).

Se uma etapa falhar, pare e resolva a causa antes de seguir; não trate navegador
ausente, dependência faltante ou comando com código diferente de zero como
aprovação. Consulte [TROUBLESHOOTING.md](TROUBLESHOOTING.md) para erros comuns.

### 3. Executar a regressão completa web

```powershell
.\saldo.cmd qa:check
```

Esse gate roda, em sequência: ESLint, TypeScript, unitários, build, validação do
HTML portátil offline, validação da PWA de produção offline, Playwright nos cinco
projetos e Cucumber web. Aguarde o fim do comando e confirme o código de saída
zero; qualquer falha interrompe a cadeia e deve ser investigada.

Depois execute também os perfis BDD responsivos emulados:

```powershell
.\saldo.cmd qa:bdd:mobile-web
.\saldo.cmd qa:bdd:iphone-web
```

Esses comandos testam viewports/dispositivos em navegador; **não** substituem
Appium em Android ou iOS nativos.

### 4. Executar uma camada ou cenário específico

```powershell
.\saldo.cmd test:unit
.\saldo.cmd qa:web -- --project=chromium
.\saldo.cmd qa:web -- --project=firefox
.\saldo.cmd qa:web -- --project=webkit
.\saldo.cmd qa:web -- --project=android-web
.\saldo.cmd qa:web -- --project=ios-web
.\saldo.cmd qa:bdd -- --tags "@smoke"
.\saldo.cmd qa:bdd -- --tags "@QA-102"
```

Playwright abre Vite em `127.0.0.1:5173` automaticamente. Os cenários BDD web
também iniciam/encerram Vite; se `BASE_URL` estiver definida, usam a instância
indicada em vez de iniciar o servidor. Para escolher o navegador do BDD, defina
`BDD_BROWSER` como `chromium`, `firefox` ou `webkit`. No PowerShell, por exemplo:

```powershell
$env:BDD_BROWSER = 'firefox'
.\saldo.cmd qa:bdd
Remove-Item Env:BDD_BROWSER
```

Para observar o BDD, defina `HEADED=1`. Remova as variáveis depois da execução.
Não rode vários runners na mesma porta ao mesmo tempo; Playwright reutiliza um
servidor existente fora do CI, portanto confirme que ele pertence a esta cópia do
projeto. Use filtros de tag sempre entre aspas no PowerShell.

Para usar o Google Chrome instalado, em vez do Chromium distribuído pelo Playwright,
selecione o canal `chrome`:

```powershell
$env:PLAYWRIGHT_USE_CHROME = '1'
.\saldo.cmd qa:web:headed -- --project=chrome
Remove-Item Env:PLAYWRIGHT_USE_CHROME

$env:HEADED = '1'
$env:BDD_BROWSER = 'chromium'
$env:BDD_BROWSER_CHANNEL = 'chrome'
$env:BDD_REPORT_NAME = 'web-chrome'
.\saldo.cmd qa:bdd
Remove-Item Env:HEADED, Env:BDD_BROWSER, Env:BDD_BROWSER_CHANNEL, Env:BDD_REPORT_NAME
```

Com `PLAYWRIGHT_USE_CHROME=1`, o projeto e o relatório aparecem como `chrome` e
usam o Google Chrome instalado no sistema.

Para executar todas as features BDD em cada navegador visível e manter relatórios
e mídias separados por navegador:

```powershell
$env:HEADED = '1'
foreach ($browser in @('chromium', 'firefox', 'webkit')) {
  $env:BDD_BROWSER = $browser
  $env:BDD_REPORT_NAME = "web-$browser"
  .\saldo.cmd qa:bdd
  if ($LASTEXITCODE -ne 0) { break }
}
Remove-Item Env:HEADED, Env:BDD_BROWSER, Env:BDD_REPORT_NAME -ErrorAction SilentlyContinue
```

Os relatórios ficam em `reports/cucumber/web-<navegador>.html`; screenshots,
vídeos e traces ficam em `reports/cucumber/media/` com prefixo do navegador.
O dashboard de screenshots e vídeos da suíte Playwright fica em
`reports/evidence/index.html`.

### 5. Executar testes nativos (somente quando solicitado)

Android nativo precisa de JDK 21+, Android SDK API 36+, aparelho/AVD autorizado,
APK de debug e Appium com UiAutomator2. iOS nativo requer macOS com Xcode 26+,
simulador/aparelho e driver XCUITest. Siga os comandos e configurações completos
em [MOBILE.md](MOBILE.md). `qa:mobile:dry` valida apenas o mapeamento dos passos
Gherkin; não inicia Appium e não conta como teste nativo executado.

### 6. Fechar a execução e registrar evidências

Abra os relatórios após a execução:

```powershell
.\saldo.cmd qa:report
```

Verifique também `reports/playwright-junit.xml`, os relatórios Cucumber em
`reports/cucumber/` e `reports/environment.json`. Para cada falha, registre o
comando, código de saída, cenário/caso, passos para reproduzir, versões do SO/
navegador/dispositivo e evidência relevante (trace, screenshot e relatório).
Não apague nem reclassifique uma falha como sucesso só porque outras suítes
passaram. Os artefatos são locais; gere-os novamente em cada máquina.

## Instalação limpa

Windows, na raiz do projeto:

```powershell
.\saldo.cmd ci
.\saldo.cmd browsers:install
.\saldo.cmd doctor
.\saldo.cmd docs:check
```

Em macOS/Linux com Node 22.23.5: `npm ci`, `npm run browsers:install` e
`npm run doctor`. No Linux/CI instale também as bibliotecas dos navegadores:
`npx playwright install --with-deps chromium firefox webkit`.

`ci` instala exatamente o lockfile. Não usa o perfil pessoal do navegador.
`doctor` gera `reports/environment.json`; `doctor -- --strict` falha se faltar
qualquer pré-requisito, incluindo os de mobile. Uma pendência de Xcode no Windows
é esperada e não bloqueia a execução web.

## Pirâmide e escopo

| Camada     | Ferramentas                     | O que valida                                 | O que não prova                     |
| ---------- | ------------------------------- | -------------------------------------------- | ----------------------------------- |
| Unidade    | node:test                       | Centavos, calendário, fechamento, parcelas   | Interface e integrações             |
| E2E web    | Playwright Test                 | Fluxos, persistência, backup, acessibilidade | Aplicativo nativo                   |
| BDD web    | Cucumber + Playwright           | Critérios de negócio em português            | SDK nativo e aparelho               |
| Mobile web | Playwright com dispositivos     | Layout e interação em viewport/touch         | Safari iOS/Chrome Android reais     |
| Nativo     | Cucumber + Appium + WebdriverIO | Instalação, WebView, reinício e fluxo no app | Hardware e integrações não cobertas |

Os projetos `android-web` e `ios-web` usam emulação de navegador. **Eles não são
emuladores Android/iOS.** O Appium usa um aparelho, AVD ou simulador iOS de verdade.

## Execução de referência

```powershell
.\saldo.cmd qa:check
.\saldo.cmd qa:bdd:mobile-web
.\saldo.cmd qa:bdd:iphone-web
.\saldo.cmd qa:bdd:dry
.\saldo.cmd qa:mobile:dry
.\saldo.cmd qa:report
```

`qa:check`: lint → tipos → unitários → build → arquivo portátil offline → PWA offline → Playwright (5 projetos) → Cucumber
web. Não inclui os dois perfis BDD emulados (`qa:bdd:mobile-web` e
`qa:bdd:iphone-web`), que devem ser executados à parte quando a matriz responsiva
completa for exigida. O código de saída é diferente de zero em falha.
`qa:mobile:dry` somente verifica se os passos Gherkin têm implementação; não abre
Appium e não comprova execução em aparelho.

## Selecionar cenários e depurar

```powershell
.\saldo.cmd qa:web -- --project=chromium
.\saldo.cmd qa:web -- --project=android-web
.\saldo.cmd qa:web -- --project=ios-web
.\saldo.cmd qa:web:headed -- --project=chromium
.\saldo.cmd qa:web:ui
.\saldo.cmd qa:bdd -- --tags "@smoke"
.\saldo.cmd qa:bdd -- --tags "@QA-102"
```

Em macOS/Linux use `npm run qa:web -- --project=chromium`, por exemplo.
Para Cucumber em outro navegador, exporte `BDD_BROWSER=firefox` ou `webkit`.
No PowerShell: `$env:BDD_BROWSER='firefox'`; depois execute `qa:bdd`.
Remova a variável após o uso: `Remove-Item Env:BDD_BROWSER`.
`HEADED=1` permite observar o BDD. `BASE_URL` pode apontar para uma instância local
já iniciada; sem ela o runner inicia e encerra Vite automaticamente.

Não execute dois runners na mesma porta. Playwright reutiliza um servidor local
fora do CI; os runners Cucumber escolhem uma porta livre automaticamente ou usam `BASE_URL` explícita.

## Dados e isolamento

Cada teste Playwright usa novo contexto, e cada cenário Cucumber abre navegador
isolado. `tests/fixtures/state.js` cria apenas receitas, despesas e investimentos
**fictícios**. Marcadores impedem a importação das informações pessoais do produto
no estado de teste. O reload não redefine as fixtures, permitindo verificar
persistência. No Appium cada cenário limpa somente o estado da instalação de QA.
Não aponte esses testes para seu aplicativo pessoal com dados que queira manter.

Testes dependem dos resultados observáveis, dos IDs acessíveis e do estado local
para verificar invariantes financeiras. Não usam `waitForTimeout` para esperar a
interface. Playwright usa assertions com espera; Appium aguarda a WebView e os
controles. Retries são zero localmente e 1 no CI, sem transformar falha intermitente
em aprovação automática: revise os traces quando houver retry.

## Relatórios e evidências

| Execução         | Artefato                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------- |
| Playwright       | `reports/playwright/index.html`                                                               |
| JUnit Playwright | `reports/playwright-junit.xml`                                                                |
| Todos os E2E     | `reports/playwright-artifacts/`: screenshot, vídeo e trace                                    |
| Cucumber web     | `reports/cucumber/web.html`, `.json`, `.xml`                                                  |
| Todos os BDD web | Screenshot anexo no HTML; PNG, WebM e trace em `reports/cucumber/media/`                      |
| Cucumber nativo  | `reports/cucumber/native-android.html` ou `native-ios.html`, JSON/JUnit e screenshot em falha |
| Diagnóstico      | `reports/environment.json`                                                                    |

O comando `qa:report` abre o relatório Playwright. Para um trace use
`npx playwright show-trace reports/cucumber/traces/<arquivo>.zip`.
Relatórios são locais e ignorados pelo Git. O workflow retém artefatos por 7 dias;
não publique relatórios gerados com dados pessoais.

Os BDDs emulados geram `reports/cucumber/mobile-web.*` e `iphone-web.*`. Os dry-runs
geram `web-dry.*` e `mobile-dry.*`, sem sobrescrever os resultados de execução.

O smoke `qa:appium:server` inicia Appium, verifica `/status` e encerra seu processo;
ele comprova a disponibilidade do servidor, não a execução de um cenário nativo.

## Critérios de entrada e saída

Antes: lockfile instalado; browsers disponíveis; nenhuma alteração pessoal no
perfil de QA; servidores sem conflito de porta; SDK/dispositivo quando aplicável.
Depois: lint/tipos/unitários aprovados; cenários aplicáveis sem falhas; sem erro de
JavaScript; cópia e pagamento sem duplicidade; backup íntegro; riscos pendentes
registrados. Acessibilidade automatizada considera falhas serious/critical das
regras WCAG A/AA selecionadas; não equivale a uma auditoria manual completa.

Uma entrega nativa exige também execução no dispositivo alvo, exportação/importação
pelo seletor nativo, retomada do app e evidências do sistema operacional. Não
considere o dry-run como resultado nativo aprovado.

## CI

`.github/workflows/qa.yml` executa gates, Playwright e BDD em cada push/PR.
`.github/workflows/mobile.yml` é manual: gera build Android ou iOS e executa
Appium apenas em runner self-hosted com dispositivo quando essa opção é marcada.
As labels e pré-requisitos estão em [MOBILE.md](MOBILE.md). Nenhum workflow foi
enviado a um repositório ou executado remotamente por esta configuração local.

## Bateria ampliada por categoria

```powershell
.\saldo.cmd qa:positive
.\saldo.cmd qa:negative
.\saldo.cmd qa:integration
.\saldo.cmd qa:regression
```

O catálogo ampliado está em [COBERTURA-COMPLETA.md](COBERTURA-COMPLETA.md).
Evidências de todos os resultados: [EVIDENCIAS.md](EVIDENCIAS.md).
Performance: [PERFORMANCE.md](PERFORMANCE.md).
Infraestrutura e interação operacional: [KUBERNETES-K9S.md](KUBERNETES-K9S.md).
Os testes usam `dev:qa` e `build:qa`, que substituem os presets demonstrativos por fictícios.

Para executar a bateria local ampliada em sequência, depois de `qa:tools:setup` e
`browsers:install`, use `qa:full`. Inclui os seis perfis de performance e a checagem
de integridade da mídia. A execução real em Kubernetes e em dispositivos nativos
permanece separada por depender de infraestrutura; não é substituída pela validação
estática dos manifests ou pelos viewports mobile.
