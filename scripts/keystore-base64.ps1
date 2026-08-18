$ErrorActionPreference = 'Stop'
$path = Join-Path $PSScriptRoot '..\treinoapp-release.keystore'
if (!(Test-Path $path)) { throw 'treinoapp-release.keystore não encontrado. Rode generate-keystore.ps1 primeiro.' }
$b=[Convert]::ToBase64String([IO.File]::ReadAllBytes($path))
Set-Content -Path (Join-Path $PSScriptRoot '..\treinoapp-keystore-base64.txt') -Value $b -NoNewline
Write-Host 'Base64 salvo em treinoapp-keystore-base64.txt. Copie o conteúdo para o GitHub Secret TREINOAPP_KEYSTORE_BASE64 e depois APAGUE o txt.' -ForegroundColor Green
