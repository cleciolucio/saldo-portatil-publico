# language: pt
@web @regressao
Funcionalidade: Planejamento financeiro portátil
  Contexto:
    Dado que abri o Saldo com dados fictícios de QA

  @smoke @QA-101
  Cenário: Confirmar pagamento sem duplicar despesas
    Quando confirmo o pagamento do aluguel fictício
    Então o total de despesas deve continuar em "250,00"
    E o resumo realizado deve mostrar "250,00"

  @QA-102
  Cenário: Copiar janeiro para fevereiro respeitando o calendário
    Quando copio janeiro de 2027 para fevereiro de 2027
    Então devem existir 2 lançamentos copiados em "2027-02-28"
    Quando repito a mesma cópia
    Então não devem existir novos lançamentos duplicados

  @QA-103
  Cenário: Reservar dinheiro sem criar uma despesa
    Quando defino uma meta de "1.000,00" com "250,00" reservados
    Então o progresso da meta deve ser 25 por cento
    E o total de despesas deve continuar em "250,00"

  @QA-104
  Cenário: Ocultar valores pessoais
    Quando oculto os valores
    Então o saldo deve estar oculto
    E os campos de investimentos devem estar protegidos
