# language: pt
@mobile @native @smoke
Funcionalidade: Aplicativo Saldo no Android e iOS
  Contexto:
    Dado que o aplicativo nativo está aberto com dados fictícios

  @QA-M01
  Cenário: Consultar o painel na WebView do aplicativo
    Então vejo a receita fictícia de "1.000,00" no aplicativo
    E vejo a despesa fictícia de "250,00" no aplicativo

  @QA-M02
  Cenário: Registrar confirmação e persistir após reiniciar o aplicativo
    Quando confirmo o aluguel no aplicativo
    E reinicio o aplicativo
    Então o aluguel permanece pago no aplicativo

  @QA-M03
  Cenário: Proteger a visualização dos valores no aplicativo
    Quando oculto os valores no aplicativo
    Então o saldo do aplicativo fica oculto
