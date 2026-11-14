# Casos de teste e rastreabilidade

## Matriz automatizada

| ID      | Risco / critério                                          | Implementação                              | Evidência                      |
| ------- | --------------------------------------------------------- | ------------------------------------------ | ------------------------------ |
| UNIT-01 | Valores em centavos, parsing pt-BR e limites              | `tests/unit/finance.test.mjs`              | TAP / console                  |
| UNIT-02 | Divisão exata de centavos e parcelas inválidas            | mesmo arquivo                              | TAP                            |
| UNIT-03 | Ano bissexto, mês inválido, virada de ano                 | mesmo arquivo                              | TAP                            |
| UNIT-04 | Primeiro vencimento antes/no/depois do fechamento         | mesmo arquivo                              | TAP                            |
| QA-001  | Pagamento não cria outra despesa e persiste no reload     | `tests/e2e/saldo.spec.ts`                  | HTML/JUnit/trace               |
| QA-002  | Cópia idempotente e ajuste de 31/01 para 28/02            | mesmo arquivo                              | HTML/JUnit                     |
| QA-003  | Parcelas somam o total; apenas a fatura é despesa         | mesmo arquivo                              | HTML/JUnit                     |
| QA-004  | Meta e patrimônio não alteram saldo; ocultação de valores | mesmo arquivo                              | HTML/JUnit                     |
| QA-005  | Backup completo e rejeição de JSON inválido               | mesmo arquivo                              | HTML/JUnit                     |
| QA-006  | Sem overflow; WCAG A/AA serious/critical                  | mesmo arquivo                              | HTML/JUnit                     |
| QA-007  | Falha de gravação não deixa dados parciais                | mesmo arquivo                              | HTML/JUnit                     |
| QA-101  | Pagamento confirmado com despesa estável                  | `tests/bdd/features/planejamento.feature`  | Cucumber HTML/JSON/JUnit       |
| QA-102  | Cópia entre meses sem duplicidade                         | mesmo arquivo                              | Cucumber                       |
| QA-103  | Meta não cria uma despesa                                 | mesmo arquivo                              | Cucumber                       |
| QA-104  | Saldo e investimentos ocultos                             | mesmo arquivo                              | Cucumber                       |
| QA-M01  | App nativo abre e mostra dados na WebView                 | `tests/mobile/features/aplicativo.feature` | Cucumber + screenshot em falha |
| QA-M02  | Confirmação persiste ao terminar/reativar o app           | mesmo arquivo                              | Cucumber                       |
| QA-M03  | Ocultação no app instalado                                | mesmo arquivo                              | Cucumber                       |

Os 51 cenários E2E atuais são executados nos cinco projetos configurados: Chromium, Firefox,
WebKit desktop, Android web e iPhone web. As suítes BDD compartilham cenários de
negócio, mas têm runners independentes. Não use contagem de passos como sinônimo
de cobertura de requisitos.

## Testes de distribuição automatizados

- `qa:portable`: abre o HTML local offline, com fixtures sintéticas e sem erros de JS.
- `qa:production`: instala o cache da build PWA e recarrega a página com a rede desligada.
- `qa:appium:server`: inicia o servidor local e verifica sua prontidão, encerrando-o ao fim.

## Exploração complementar antes de distribuir

| Caso                    | Passos                                                                                      | Resultado esperado                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| NAT-01 Backup nativo    | No app de QA, exportar, escolher Arquivos, alterar registro, restaurar o JSON               | Arquivo acessível, metas/compras/investimentos restaurados              |
| NAT-02 Cancelamento     | Cancelar compartilhar e cancelar seletor de arquivos                                        | Sem perda de dados; usuário pode tentar novamente                       |
| NAT-03 Background       | Confirmar pagamento, alternar para outro app e voltar                                       | Estado mantido e interface responsiva                                   |
| NAT-04 Orientação/notch | Retrato/paisagem, teclado aberto e safe area                                                | Controles visíveis e tabelas com rolagem própria                        |
| PWA-01 Offline          | Fazer build, abrir preview online, fechar/reabrir após instalação do cache, desligar a rede | Painel abre com dados preservados                                       |
| MIG-01 Origem nova      | Exportar do arquivo local e restaurar em localhost/app                                      | Mesmo conteúdo de backup, sem esperar migração automática entre origens |
| ACC-01 Teclado/leitor   | Tab, foco visível, nomes dos botões, leitor de tela                                         | Operação compreensível sem depender somente de cor                      |

Esses casos são manuais até que haja implementação automatizada específica.
Registrar sistema, versão do app, resultado e evidência; não marcar como aprovados
somente porque existem nesta tabela.

## Exemplo de bug reproduzível

```text
Título: QA-003 — fatura soma centavo adicional na terceira parcela
Ambiente: commit/versão, SO, navegador/dispositivo, versão do WebView
Pré-condição: fixtures sintéticas padrão, cartão de QA
Passos: cadastrar compra de R$100,00 em três parcelas
Esperado: R$33,34 + R$33,33 + R$33,33 = R$100,00
Obtido: informar valor observado
Evidência: trace/screenshot e relatório JUnit
Impacto: total financeiro incorreto
```

O catálogo de novos casos está em [COBERTURA-COMPLETA.md](COBERTURA-COMPLETA.md).
