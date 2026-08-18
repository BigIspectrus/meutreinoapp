$ErrorActionPreference = 'Stop'
$alias = 'treinoapp'
$out = Join-Path $PSScriptRoot '..\treinoapp-release.keystore'
Write-Host 'Será criada a chave DEFINITIVA de assinatura do TreinoApp.' -ForegroundColor Yellow
Write-Host 'Guarde este arquivo e as senhas em pelo menos dois locais seguros.' -ForegroundColor Yellow
keytool -genkeypair -v -keystore $out -alias $alias -keyalg RSA -keysize 4096 -validity 10000
Write-Host "Criado: $out" -ForegroundColor Green
Write-Host "Alias: $alias" -ForegroundColor Green
