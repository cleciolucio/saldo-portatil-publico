# Cobertura funcional completa dos módulos atuais

A bateria contém **58 cenários E2E, executados nos cinco projetos (290 execuções)**.
Esta é cobertura dos fluxos catalogados abaixo; não significa provar todos os
estados possíveis do programa nem substitui exploração em aparelhos reais.
As implementações estão em `tests/e2e/`, com helpers e fixtures compartilhados.

| Módulo             | Positivos/regressão                                                                              | Negativos/integração                                                                                                                               | Casos                                     |
| ------------------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Transações         | Criar, editar, cancelar edição, excluir, confirmar/desfazer pagamento e recebimento              | Zero, negativo, formato incorreto, valor acima do limite, descrição vazia, HTML tratado como texto                                                 | FUN-01/02/05, NEG-MONEY, NEG-DESC, QA-001 |
| Busca e filtros    | Descrição, categoria, tipo, mês e combinações; lista vazia                                       | Filtros sem resultado e exportação sem linhas                                                                                                      | FUN-03/04/07                              |
| CSV                | Respeitar filtros e situação                                                                     | Neutralizar fórmulas de planilha                                                                                                                   | FUN-04                                    |
| Dashboard          | Totais, mês vazio, gráficos, demonstrativo por competência e tabela comparativa                  | Acessibilidade e scroll responsivo                                                                                                                 | FUN-06/07, QA-006                         |
| Cópia de mês       | Cópia completa ou só receita, calendário de fevereiro, idempotência e preservação de exclusões   | Origem igual ao destino, mês vazio, cancelamento, não duplicar fatura detalhada                                                                    | QA-002, PLAN-01/02                        |
| Cartões/compras    | Cadastro, parcelas com centavos exatos, editar e excluir compra, edição de vencimento, pagamento | Dia inválido, parcela abaixo de um centavo, cartão com compras, despesa avulsa duplicada, fatura paga reaberta, cancelamento/aceite de conciliação | QA-003, CARD-01 a CARD-08                 |
| Metas              | Progresso, exceder 100%, separação por mês e ausência de despesa automática                      | Valor inválido e falha de gravação                                                                                                                 | QA-004/007, GOAL-01/02                    |
| Investimentos      | Saldo, composição, diferença, data, persistência e independência do mês                          | Saldo inválido e campos ocultos                                                                                                                    | QA-004, INV-01/02                         |
| Backup             | Exportar/restaurar completo, lembrete e migração v1                                              | JSON malformado, versão desconhecida, IDs duplicados, data/categoria/valor inválidos, compra órfã, >10MB, cancelamento                             | QA-005, BACKUP-NEG, BACKUP-08 a 11        |
| Persistência       | Migração antiga, reload, duas abas e estado consistente                                          | Quota, conflito concorrente, estado/configuração corrompidos preservados                                                                           | INT-01/02, MIG-01/NEG, QA-007             |
| Dados de exemplo   | Cancelar ou confirmar limpeza                                                                    | Somente amostras removidas; registros pessoais mantidos                                                                                            | SAMPLE-01                                 |
| Privacidade visual | Ocultar totais, meta e campos de investimentos                                                   | HTML/CSV continuam dados reais por definição, sem prometer criptografia                                                                            | QA-004, QA-104                            |

Os quatro cenários `PUBLIC-01` a `PUBLIC-04` verificam edição dos nomes e saldos,
limpeza dos exemplos, cancelamento e isolamento do armazenamento da edição pública.

## Cucumber

11 cenários e 68 passos por perfil, em `planejamento.feature` e `gestao.feature`:
confirmar pagamento, copiar mês, meta, privacidade, CRUD básico, valores inválidos,
parcelamento, investimentos e backup malformado. São executados em desktop,
Android web e iPhone web, com mídia por cenário.

## Performance

Seis perfis k6: smoke, load, stress, soak, browser e browser-mobile. Os HTTP validam
HTML e assets; os browser validam uma massa de 500 registros adicionais e filtro.
Thresholds e interpretação: [PERFORMANCE.md](PERFORMANCE.md).

## Infraestrutura

Contratos YAML, Deployment/Service, namespace, probes e NodePort têm validação
estática. Integração real Kubernetes/K9s depende do cluster local e está bloqueada
neste host até os pré-requisitos serem preparados. Não é contada entre as 255
execuções de navegador. O roteiro e os comandos estão em [KUBERNETES-K9S.md](KUBERNETES-K9S.md).

## Native

A suíte Appium mantém três cenários smoke de instalação/WebView, persistência após
reinício e privacidade, com PNG/MP4 quando executados. A matriz em viewport mobile
não equivale a executar os 51 cenários em aparelhos Android/iOS. Os testes de arquivo
nativo e comportamento do sistema continuam dependentes de dispositivo/macOS.

## Navegação entre módulos

`NAV-01` a `NAV-03` verificam os atalhos sem alteração de mês ou dados, foco e
identificação da área selecionada, menu compacto por teclado/Escape, ausência
de rolagem horizontal, links diretos e voltar/avançar do navegador.
