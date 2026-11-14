param([switch]$InstallEmulator)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$localTools = Join-Path $projectRoot '.tools'
New-Item -ItemType Directory -Force $localTools | Out-Null
$jdkFolder = Join-Path $localTools 'jdk'
$jdkArchive = Join-Path $localTools 'jdk-21.zip'
if (-not (Test-Path -LiteralPath $jdkFolder)) {
  Write-Host 'Baixando OpenJDK 21 da Microsoft para este projeto...'
  & curl.exe --fail --location --silent --show-error --continue-at - --output $jdkArchive 'https://aka.ms/download-jdk/microsoft-jdk-21-windows-x64.zip'
  if ($LASTEXITCODE -ne 0) { throw 'Download do JDK falhou. Execute novamente para continuar.' }
  Expand-Archive -LiteralPath $jdkArchive -DestinationPath $jdkFolder
}
$jdkHome = (Get-ChildItem -LiteralPath $jdkFolder -Directory | Select-Object -First 1).FullName
if (-not (Test-Path -LiteralPath (Join-Path $jdkHome 'bin/java.exe'))) { throw 'JDK incompleto.' }
$sdkHome = Join-Path $localTools 'android-sdk'
$sdkManager = Join-Path $sdkHome 'cmdline-tools/latest/bin/sdkmanager.bat'
if (-not (Test-Path -LiteralPath $sdkManager)) {
  Write-Host 'Baixando Android Command Line Tools do Google...'
  $commandArchive = Join-Path $localTools 'commandline-tools.zip'
  & curl.exe --fail --location --silent --show-error --continue-at - --output $commandArchive 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip'
  if ($LASTEXITCODE -ne 0) { throw 'Download das ferramentas Android falhou. Execute novamente para continuar.' }
  $unpack = Join-Path $localTools 'commandline-unpack'
  Expand-Archive -LiteralPath $commandArchive -DestinationPath $unpack -Force
  $sourceFolder = [IO.Path]::GetFullPath((Join-Path $unpack 'cmdline-tools'))
  $targetFolder = [IO.Path]::GetFullPath((Join-Path $sdkHome 'cmdline-tools/latest'))
  $allowedPrefix = [IO.Path]::GetFullPath($localTools) + [IO.Path]::DirectorySeparatorChar
  if (-not $sourceFolder.StartsWith($allowedPrefix) -or -not $targetFolder.StartsWith($allowedPrefix)) { throw 'Pasta fora do projeto.' }
  New-Item -ItemType Directory -Force (Split-Path -Parent $targetFolder) | Out-Null
  Move-Item -LiteralPath $sourceFolder -Destination $targetFolder
}
$env:JAVA_HOME = $jdkHome
$env:ANDROID_HOME = $sdkHome
$env:Path = (Join-Path $jdkHome 'bin') + ';' + (Join-Path $sdkHome 'platform-tools') + ';' + $env:Path
Write-Host 'Preparando licenças e SDK API 36...'
$licenseLog = Join-Path $localTools 'android-licenses.log'
1..100 | ForEach-Object { 'y' } | & $sdkManager "--sdk_root=$sdkHome" --licenses | Out-File -LiteralPath $licenseLog -Encoding utf8
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível preparar as licenças Android.' }
& $sdkManager "--sdk_root=$sdkHome" 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0'
if ($LASTEXITCODE -ne 0) { throw 'Instalação do SDK falhou.' }
@{JAVA_HOME=$jdkHome;ANDROID_HOME=$sdkHome;ANDROID_SDK_ROOT=$sdkHome} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $localTools 'environment.json') -Encoding utf8
('sdk.dir=' + $sdkHome.Replace('\','/')) | Set-Content -LiteralPath (Join-Path $projectRoot 'android/local.properties') -Encoding ascii
if ($InstallEmulator) {
  & $sdkManager "--sdk_root=$sdkHome" 'emulator' 'system-images;android-36;google_apis;x86_64'
  if ($LASTEXITCODE -ne 0) { throw 'Instalação do emulador falhou.' }
  $avdManager = Join-Path $sdkHome 'cmdline-tools/latest/bin/avdmanager.bat'
  'no' | & $avdManager create avd -n 'Saldo_QA_API_36' -k 'system-images;android-36;google_apis;x86_64' --device 'pixel_7' --force
  if ($LASTEXITCODE -ne 0) { throw 'Criação do AVD falhou.' }
}
Write-Host 'Ambiente Android local preparado. Use saldo.cmd doctor e saldo.cmd mobile:android:build.'
