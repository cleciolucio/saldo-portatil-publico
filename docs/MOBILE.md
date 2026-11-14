# Android, iOS e automação nativa

## O que está disponível

Projetos nativos reais: `android/` (Gradle/Java) e `ios/App/` (Xcode/Swift/SPM),
gerados pelo Capacitor 8. O código web é compartilhado; a exportação de backups
usa Filesystem + Share na plataforma nativa. App id de release: `app.saldoportatil.publico`; builds automatizados de QA: `app.saldoportatil.publico.qa`.

O Windows compila Android. A compilação, assinatura, simulador e automação iOS
precisam de **macOS com Xcode 26+**. O projeto iOS pode ser editado em qualquer IDE
no Windows, mas `ios-web` testa apenas o navegador emulado, não substitui Xcode.

## Android no Windows — preparação local

```powershell
.\saldo.cmd ci
.\saldo.cmd mobile:android:setup
.\saldo.cmd qa:mobile:sync
.\saldo.cmd mobile:android:build
.\saldo.cmd doctor
```

`mobile:android:setup` baixa OpenJDK 21 da Microsoft e as ferramentas oficiais do
Android para `.tools/`, instala Platform API 36, Build Tools 36 e platform-tools.
O script prepara as licenças do SDK. Não substitui o Java nem o SDK que já existem
no sistema. `saldo.cmd` lê os caminhos de `.tools/environment.json` nas próximas
execuções. Esse arquivo é local e não deve ser transportado para outra máquina.
A preparação inicial precisa de internet e espaço para SDK, JDK e cache Gradle.

Para também instalar a imagem e criar um emulador:

```powershell
.\saldo.cmd mobile:android:setup -- -InstallEmulator
.\saldo.cmd mobile:android:emulator
```

O segundo comando fica ativo enquanto o emulador estiver aberto. O AVD é
`Saldo_QA_API_36`; o Windows precisa de virtualização e aceleração compatíveis
habilitadas. Alternativa: aparelho Android 7+ com depuração USB autorizada.

Se preferir Android Studio, configure JDK 21+, API 36 e Build Tools 36 pelo SDK
Manager. No terminal, defina `JAVA_HOME` e `ANDROID_HOME`. Não misture um SDK32
antigo com este projeto, que compila para API36.

Artefato: `android/app/build/outputs/apk/debug/app-debug.apk`.
`mobile:android` abre o projeto no Android Studio, se ele estiver instalado.
O APK é de desenvolvimento e não é uma versão assinada para Play Store.

## iOS no Mac

Copie o repositório com os arquivos fonte, não `node_modules`, `.tools` ou caminhos
do Windows. Instale a versão de Node de `.nvmrc`, Xcode 26+, ferramentas de linha
de comando e um runtime de simulador iOS compatível.

```bash
npm ci
xcode-select -p
xcodebuild -version
xcrun simctl list devices available
npm run qa:mobile:sync
npm run mobile:ios:build
```

O projeto usa Swift Package Manager: não exige CocoaPods. O build de teste usa
`CODE_SIGNING_ALLOWED=NO` e o SDK de simulador. Artefato esperado:
`.tools/ios-build/Build/Products/Debug-iphonesimulator/App.app`.
Para instalar em iPhone físico é necessário configurar Team/assinatura no Xcode,
build para iphoneos e o WebDriverAgent assinado; não use o `.app` de simulador.

Escolha um simulador disponível na lista anterior:

```bash
xcrun simctl boot '<UDID-do-simulador>'
open -a Simulator
export MOBILE_UDID='<UDID-do-simulador>'
export MOBILE_DEVICE_NAME='nome-exato-do-simulador'
```

`mobile:ios` abre o projeto no Xcode. Não é necessário executar `cap add` novamente:
os projetos nativos já estão incluídos no repositório.

## Appium: instalação e servidor

Execute na raiz do projeto, em qualquer host nativo compatível:

```powershell
.\saldo.cmd appium:drivers
$env:APPIUM_CHROMEDRIVER_AUTODOWNLOAD='1'
.\saldo.cmd appium
```

No Mac: `npm run appium:drivers` e `npm run appium`. O comando instala UiAutomator2
8.0.0 e, no macOS, XCUITest 12.0.0, versões compatíveis com Appium 3.9.0. As versões
mais recentes dos drivers podem exigir Appium 4; não atualize isoladamente.
Os drivers ficam em `.appium/` e são reutilizados se já estiverem instalados.

O servidor fica em `http://127.0.0.1:4723`, rota base `/`. Defina
`APPIUM_CHROMEDRIVER_AUTODOWNLOAD=1` antes de iniciá-lo para permitir o download do
Chromedriver compatível com a WebView Android. Essa permissão é limitada ao driver
UiAutomator2; o servidor continua ligado apenas à interface local.
O processo fica ativo; encerre com Ctrl+C após os testes.

## Executar os cenários nativos

Com app compilado, dispositivo iniciado e Appium ativo, abra outro terminal.
Windows/Android:

```powershell
$env:MOBILE_UDID='emulator-5554'
.\saldo.cmd qa:mobile:android
```

Use o UDID real retornado por `adb devices -l`. Se estiver usando o SDK local,
`saldo.cmd doctor` também lista o aparelho. O nome de exemplo só funciona se o
ADB realmente atribuiu esse identificador.

Mac/iOS:

```bash
export MOBILE_UDID='<UDID-do-simulador>'
export MOBILE_DEVICE_NAME='nome-exato-do-simulador'
npm run qa:mobile:ios
```

Os runners verificam a existência do APK/APP, abrem uma sessão nativa, aguardam a
WebView, usam fixtures fictícias e testam consulta, confirmação/persistência após
reinício e ocultação. Não apontar para uma instalação com seus dados pessoais.

Para outro build ou servidor, exporte as variáveis:

| Variável                           | Uso                                                              |
| ---------------------------------- | ---------------------------------------------------------------- |
| `MOBILE_APP`                       | Caminho absoluto de APK/APP, inclusive de aparelho físico        |
| `MOBILE_UDID`                      | Serial ADB ou UDID do simulador/aparelho                         |
| `MOBILE_DEVICE_NAME`               | Nome do dispositivo                                              |
| `MOBILE_PLATFORM_VERSION`          | Versão do sistema operacional, quando necessária                 |
| `MOBILE_APP_ID`                    | Outro applicationId/bundleId, padrão `app.saldoportatil.publico` |
| `APPIUM_HOST`, `APPIUM_PORT`       | Servidor Appium, padrão `127.0.0.1:4723`                         |
| `APPIUM_CHROMEDRIVER_AUTODOWNLOAD` | Autoriza download do driver Android no servidor local            |

`.env.example` é referência: não é carregado automaticamente. Exporte as variáveis
no terminal. No Windows o wrapper carrega os caminhos do SDK local automaticamente.
Em macOS/Linux esses caminhos são configurados pelo ambiente.

## Build de QA e release

A WebView é inspecionável por padrão nesta configuração de desenvolvimento.
Para release defina `MOBILE_DEBUG=0`, execute `mobile:sync` novamente e configure
assinatura, ícones e metadados antes de distribuir. O controle de finanças não
inclui sincronização em nuvem, autenticação nem criptografia do localStorage.
O backup é o mecanismo de migração entre web e app.

## CI nativo

O workflow manual `mobile.yml` gera APK no Ubuntu e APP de simulador no macOS.
O job de execução Appium é opcional e usa runner self-hosted com label
`saldo-android` (Linux) ou `saldo-ios` (macOS), com aparelho já conectado/bootado,
JDK/SDK ou Xcode configurados e `MOBILE_UDID` definido. O job inicia e encerra
Appium automaticamente. Não habilite esse job sem disponibilizar o runner.

A existência do workflow e o dry-run dos passos não significam testes nativos
aprovados. Veja o registro real em [VALIDACAO.md](VALIDACAO.md).

## Referências oficiais

- [Ambiente Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup)
- [Android SDK](https://developer.android.com/studio)
- [Microsoft OpenJDK](https://learn.microsoft.com/en-us/java/openjdk/download)
- [Appium Quickstart](https://appium.io/docs/en/latest/quickstart/)
- [UiAutomator2](https://github.com/appium/appium-uiautomator2-driver)
- [XCUITest](https://github.com/appium/appium-xcuitest-driver)

## Build específico para QA e gravações

Para testes com Appium e evidências sem os seus presets demonstrativos:

```powershell
.\saldo.cmd qa:mobile:sync
.\saldo.cmd mobile:android:build
```

No Mac, use `npm run qa:mobile:sync` e `npm run mobile:ios:build`.
O identificador do APK debug e do APP de simulador é `app.saldoportatil.publico.qa`;
o applicationId de release continua `app.saldoportatil.publico`. O runner Appium usa
`.qa` como padrão. A MainActivity Android continua em `app.saldoportatil.publico.MainActivity`.
A gravação PNG/MP4 é automática em execução real; o simulador iOS pode exigir
ffmpeg no host. Os workflows nativos usam essa sincronização QA.
