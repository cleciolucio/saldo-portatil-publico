# Performance com k6

## Instalação e execução

```powershell
.\saldo.cmd qa:tools:setup
.\saldo.cmd build:qa
.\saldo.cmd qa:k6:smoke
.\saldo.cmd qa:k6:load
.\saldo.cmd qa:k6:browser
.\saldo.cmd qa:k6:mobile
.\saldo.cmd qa:k6:stress
.\saldo.cmd qa:k6:soak
```

O runner usa a build QA de produção, com dados fictícios, em localhost:4173 e
encerra o servidor ao terminar. Para testes de browser, instale também os browsers
Playwright. A URL pode ser substituída por `BASE_URL`; para o cluster local use
`qa:cluster:k6`, que verifica o kubeconfig e aponta para localhost:8787.
Não execute dois perfis locais ao mesmo tempo na mesma porta. Execute benchmarks
com os demais testes encerrados para uma comparação rigorosa entre versões.

## Perfis e critérios

| Perfil         | Carga                            | Critério                                            |
| -------------- | -------------------------------- | --------------------------------------------------- |
| smoke          | 2 VUs / 10 segundos              | p95 HTTP <500ms; falhas <1%; checks e jornadas 100% |
| load           | rampa 0→5→10→0 VUs / 25 segundos | mesmos thresholds                                   |
| stress         | rampa até 50 VUs / 50 segundos   | mesmos thresholds; não comprova ponto de saturação  |
| soak           | 5 VUs / 2 minutos                | estabilidade curta; não substitui ensaio de horas   |
| browser        | 1 VU, 3 iterações, Chromium      | 500 registros extras; p95 painel <5s e filtro <1s   |
| browser-mobile | mesma carga, viewport 390x900    | mesmos budgets de interface                         |

`K6_ROWS` altera o volume de dados nos testes browser. `K6_SOAK_DURATION` altera o
soak. Os budgets são gates locais iniciais; devem ser calibrados com hardware,
latência e objetivos reais de serviço. Não são uma promessa de SLA em produção.

O aplicativo não tem API financeira no servidor. Portanto, o k6 HTTP mede a entrega
do HTML/JS/CSS; o k6 browser mede renderização e filtro no cliente. O número de VUs
HTTP não representa contas concorrentes nem gravações em um banco de dados.
O perfil mobile é navegador Chromium com viewport reduzido, não um ensaio de
performance de aplicativo Android/iOS nativo.

## Evidências e integridade do resultado

Cada perfil gera em `reports/k6/`:

- `<perfil>-summary.json`: métricas e thresholds do k6.
- `<perfil>-result.json`: código de saída, erros de runtime e horário.
- `<perfil>-dashboard.html`: relatório local com gráficos.
- `<perfil>.log`: log JSON da execução.
- Perfis browser: três screenshots PNG de execução, com os registros filtrados.

O runner zera o log do perfil antes de começar e retorna falha em threshold violado
**ou erro de script**, evitando declarar sucesso somente porque o HTTP respondeu.
As métricas de UI têm uma taxa de sucesso própria. Uma espera que falha não vira
uma amostra de latência zero aprovada.

Resultados desta máquina estão no [registro de validação](VALIDACAO.md). Os
relatórios devem ser preservados junto com versão do código, massa, VUs e ambiente.
Para comparar duas versões, mantenha a mesma massa e perfil e use execução dedicada.

## Referências oficiais

- [Thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/)
- [Browser testing](https://grafana.com/docs/k6/latest/using-k6-browser/running-browser-tests/)
- [Métricas do navegador](https://grafana.com/docs/k6/latest/using-k6-browser/metrics/)
