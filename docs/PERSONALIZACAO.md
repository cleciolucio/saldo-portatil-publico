# Personalização e privacidade

Esta edição contém somente dados demonstrativos. A interface permite editar
transações, valores, datas, cartões, metas, nomes e saldos de investimentos.
O botão Limpar dados desta cópia remove o estado local após confirmação, mantém
carteiras zeradas para você preencher e não recria os exemplos ao reabrir.

Para alterar os exemplos distribuídos no código, edite
`web/src/data/initial-data.js`, usando centavos inteiros, e execute `build`.
Para sua utilização real, prefira editar pela interface: os registros ficam no
navegador, e não são incorporados automaticamente ao código ou publicados.

Cada navegador, origem e instalação de app possui sua própria base. Use o JSON
exportado por Salvar backup completo para migrar. Confirme os valores depois da
restauração. CSV serve para consulta e não é o formato de restauração.

Não versione arquivos de backup, extratos, credenciais ou relatórios com valores
reais. Os exports comuns e pastas de ambiente são ignorados pelo Git. Se alterar
os exemplos do código para dados reais, mantenha essa cópia privada: o gitignore
não identifica automaticamente se um número de um arquivo fonte é pessoal.

Os dados não são criptografados, e o app não substitui extratos bancários. O botão
de ocultação protege somente a visualização dos valores.
