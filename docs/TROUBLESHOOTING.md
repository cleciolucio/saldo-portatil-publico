# Diagnóstico e solução de problemas

Execute `doctor` antes de investigar mobile. O comando mostra cada pré-requisito
como OK/PENDENTE e gera `reports/environment.json`.

| Sintoma                                      | Verificação e solução                                                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Node incompatível / Cucumber não inicia      | No Windows use `saldo.cmd`; em outro SO instale a versão de `.nvmrc` e execute `npm ci` novamente                                |
| PowerShell bloqueia npm.ps1                  | Use `saldo.cmd` ou `npm.cmd` em vez de alterar a política global                                                                 |
| Navegador Playwright não encontrado          | Execute `browsers:install` e aguarde todos os downloads                                                                          |
| Bibliotecas faltando no Linux                | Execute `npx playwright install --with-deps chromium firefox webkit`                                                             |
| Porta 5173 ocupada                           | Encerre o servidor anterior ou defina `BASE_URL` para a instância local existente no BDD                                         |
| Tag Cucumber não funciona no PowerShell      | Use aspas: `saldo.cmd qa:bdd -- --tags "@smoke"`; `@smoke` sem aspas pode ser interpretado como splatting                        |
| Dry-run informa zero cenários                | Confira `paths` e imports no perfil default da configuração Cucumber; deve listar 4 cenários web ou 3 nativos                    |
| Dados pessoais não aparecem no localhost/app | Cada origem tem armazenamento próprio; exporte no arquivo/navegador antigo e restaure o backup no novo                           |
| Código mudou, página portátil não            | Execute `build`; a fonte está em `web/`, o HTML da raiz é gerado                                                                 |
| App usa versão anterior                      | Execute `mobile:sync` e recompile/reinstale o build                                                                              |
| PWA ainda usa cache antigo                   | Feche todas as abas da PWA e reabra; em desenvolvimento use Vite sem service worker                                              |
| Gradle pede SDK36 ou Java21                  | Execute `mobile:android:setup` ou atualize SDK/JDK e confira JAVA_HOME/ANDROID_HOME                                              |
| Setup Android não conclui                    | Confira conexão, espaço, proxy e o log; repita após corrigir o download. Instalação parcial não é validação de build             |
| ADB mostra unauthorized                      | Autorize a depuração USB na tela do aparelho                                                                                     |
| ADB sem device                               | Inicie o AVD ou conecte aparelho com depuração USB                                                                               |
| Emulator sem aceleração                      | Configure virtualização/Windows Hypervisor Platform conforme o host; como alternativa use aparelho físico                        |
| Appium informa driver ausente                | Execute `appium:drivers` na raiz; o servidor deve iniciar por `appium` para usar o mesmo APPIUM_HOME                             |
| Driver exige Appium4                         | Use as versões fixadas no script, não `driver install` sem versão                                                                |
| WebView não encontrada                       | Use build debug, confirme WebView inspecionável, aguarde página e verifique Chromedriver compatível                              |
| Chromedriver incompatível                    | Reinicie Appium com APPIUM_CHROMEDRIVER_AUTODOWNLOAD=1 e rede disponível para o driver                                           |
| iOS no Windows                               | Edite os arquivos aqui; compile/teste o app em macOS com Xcode. `ios-web` não é iOS nativo                                       |
| XCUITest falha ao iniciar                    | Confira runtime/UDID, Xcode selecionado, `xcrun simctl list devices available` e assinatura do WebDriverAgent em aparelho físico |
| Exportação no app não abre Downloads         | No app a exportação abre compartilhar; escolha Arquivos. Confira plugins após `mobile:sync`                                      |
| Meta/investimento aparece no backup antigo   | Backup antigo não possui esses dados; restauração substitui o estado completo. Use backup versão2 recente                        |

Para registrar falha, anexe a identificação QA, os passos, versões, resultado e
trace/screenshot. Relatório de comando falho deve ser mantido como falha, mesmo
que lint, dry-run ou outra plataforma tenha passado.
