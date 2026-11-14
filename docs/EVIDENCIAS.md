# Evidências em imagens, vídeos e traces

## Web: todos os resultados, não somente falhas

`qa:web` grava screenshot PNG de página inteira, vídeo WebM e trace para cada
execução, tanto aprovada quanto reprovada. A matriz contém cinco projetos; a mesma
regra vale para casos positivos, negativos, integração e regressão.

Abra `reports/evidence/index.html` para a galeria, ou o relatório Playwright. Cada
cartão relaciona caso, projeto, resultado, duração, tentativa, imagem, vídeo e trace.
O índice estruturado é `reports/evidence/manifest.json`; os arquivos originais
ficam em `reports/playwright-artifacts/`.

As imagens representam a tela final; os vídeos mostram a interação durante o teste.
A imagem de um teste negativo pode mostrar uma entrada rejeitada: sua aprovação
significa que a rejeição/preservação de dados foi confirmada pelas assertions.

Cada execução Playwright substitui a galeria e seus artefatos daquela rodada. Para
preservar um histórico, copie a pasta `reports/` completa para outro diretório após
a execução. Não transporte somente o HTML da galeria: os caminhos da mídia são
relativos e precisam dos arquivos de artefatos.

## Cucumber e aplicativo nativo

BDD web grava PNG, WebM e trace por cenário em `reports/cucumber/media/`.
O HTML Cucumber inclui o screenshot e o caminho do vídeo; a mídia permanece na
pasta local. Os perfis desktop e mobile-web usam contextos novos e dados fictícios.

Appium está configurado para gravar PNG e MP4 por cenário em
`reports/mobile/media/`, usando a gravação de tela real do dispositivo. Esses
arquivos só são gerados quando houver execução real. No iOS, a gravação pode exigir
ffmpeg no host macOS; configure antes de rodar o cenário. O dry-run não produz mídia
nativa e não é usado como evidência de comportamento no aparelho.

O build QA nativo usa dados fictícios e o identificador `app.saldoportatil.publico.qa`.
Use `qa:mobile:sync` antes do build de teste, evitando embarcar os seus presets
financeiros na gravação. A sessão Appium limpa a instalação de QA; não a use para
guardar lançamentos pessoais que queira preservar.

## k6 e Kubernetes

O k6 produz gráficos HTML, métricas JSON, logs e PNGs dos ensaios de navegador.
Os testes HTTP não produzem vídeo de interface porque não abrem uma interface.

Os comandos Kubernetes coletam objetos, eventos e logs reais quando o cluster está
disponível. Nesta máquina essa etapa está bloqueada pelos pré-requisitos do host;
não há imagem ou vídeo de K9s conectado a um cluster, e isso não é apresentado como
aprovado. Depois da preparação, use o roteiro em [KUBERNETES-K9S.md](KUBERNETES-K9S.md)
para executar e registrar a operação real.

Todos os relatórios web devem ser produzidos no modo QA, com fixtures fictícias.
O projeto mantém separada a build padrão em `dist/` e a build QA em `.tools/qa-dist`.
