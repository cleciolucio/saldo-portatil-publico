# language: pt
@web @regressao @completo
Funcionalidade: Gestão detalhada de lançamentos e patrimônio
  Contexto:
    Dado que abri o Saldo com dados fictícios de QA

  @positivo @BDD-201
  Cenário: Criar e remover uma despesa
    Quando cadastro uma despesa fictícia de "10,00"
    Então existe uma despesa de "10,00" no histórico
    Quando excluo a despesa criada
    Então o histórico retorna a 2 lançamentos

  @negativo @BDD-202
  Esquema do Cenário: Impedir valores financeiros inválidos
    Quando tento cadastrar a despesa com valor "<valor>"
    Então o histórico retorna a 2 lançamentos
    E o campo de valor deve indicar erro
    Exemplos:
      | valor |
      | 0,00 |
      | -1,00 |
      | 1.23 |

  @integracao @BDD-203
  Cenário: Detalhar parcelas sem duplicar fatura
    Quando cadastro um cartão com uma compra de "100,00" em 3 parcelas
    Então as faturas devem somar 10000 centavos
    E devem existir 3 faturas

  @positivo @BDD-204
  Cenário: Atualizar investimentos sem criar receita
    Quando atualizo a carteira fictícia para "120,00"
    Então o total de despesas deve continuar em "250,00"
    E os investimentos sinalizam diferença de "20,00"

  @negativo @BDD-205
  Cenário: Rejeitar backup malformado
    Quando tento restaurar um JSON malformado
    Então a restauração é rejeitada
    E o histórico retorna a 2 lançamentos
