# Passo a passo — TreinoApp Android

Repositório alvo: `https://github.com/BigIspectrus/meutreinoapp`

## 1. Faça um backup da versão web atual

Antes de substituir o conteúdo do repositório, abra o TreinoApp atual no celular e use **Mais > Backup > Baixar Backup**. Guarde o JSON. O armazenamento do Chrome/GitHub Pages e o armazenamento do APK são separados. Na primeira instalação do APK, importe esse JSON. Depois disso, atualizações futuras do APK manterão o banco/dados normalmente.

## 2. Instale as ferramentas no Windows

Instale Git e Java/JDK 21. O Android Studio é recomendado para abrir/depurar o projeto, mas o GitHub Actions consegue compilar o APK mesmo sem Android Studio instalado no seu computador.

## 3. Substitua o repositório pelo projeto v12

Abra PowerShell na pasta onde deseja trabalhar:

```powershell
git clone https://github.com/BigIspectrus/meutreinoapp.git
cd meutreinoapp
git checkout -b backup-pwa-antigo
git push -u origin backup-pwa-antigo
git checkout main
```

Extraia o ZIP v12 fornecido pelo ChatGPT e copie **todo o conteúdo da pasta extraída** para dentro de `meutreinoapp`, substituindo os arquivos antigos.

Depois:

```powershell
git add -A
git commit -m "TreinoApp v12 Android + Capacitor"
git push origin main
```

## 4. Configure o GitHub Pages para Actions

No GitHub: **Settings > Pages > Build and deployment > Source > GitHub Actions**.

O workflow `.github/workflows/pages.yml` publicará a pasta `web/` automaticamente.

## 5. Crie a chave DEFINITIVA de assinatura

No PowerShell, dentro do repositório:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\generate-keystore.ps1
```

Defina uma senha forte. Guarde:

- arquivo `treinoapp-release.keystore`
- senha do keystore
- alias: `treinoapp`
- senha da chave

NÃO faça commit do `.keystore`. Faça duas cópias seguras. Se essa chave for perdida, você não conseguirá atualizar a instalação Stable existente com novos APKs assinados por outra chave.

## 6. Transforme a chave em Base64 para o GitHub

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\keystore-base64.ps1
```

Abra `treinoapp-keystore-base64.txt`, copie todo o conteúdo e depois apague esse TXT.

## 7. Crie os GitHub Secrets

No repositório: **Settings > Secrets and variables > Actions > New repository secret**.

Crie exatamente:

- `TREINOAPP_KEYSTORE_BASE64` = conteúdo Base64
- `TREINOAPP_KEYSTORE_PASSWORD` = senha do keystore
- `TREINOAPP_KEY_ALIAS` = `treinoapp`
- `TREINOAPP_KEY_PASSWORD` = senha da chave

Nunca coloque essas informações no código ou em commits.

## 8. Gere a primeira versão Stable

A v12 já usa `VERSION = 12.0.0` e `versionCode = 120000`.

No PowerShell:

```powershell
git tag v12.0.0
git push origin v12.0.0
```

Abra **GitHub > Actions > TreinoApp Stable Release**. Quando ficar verde, abra **Releases**. Você encontrará:

- `TreinoApp-v12.0.0.apk` — instalar diretamente no Android
- `TreinoApp-v12.0.0.aab` — reservado para futura Play Store
- `SHA256SUMS.txt` — hash dos arquivos

## 9. Instale a Stable

Baixe `TreinoApp-v12.0.0.apk` no celular. Autorize instalação de apps desconhecidos para o navegador/Gerenciador de Arquivos usado e instale.

Na primeira abertura:

1. importe o backup JSON da versão web;
2. conceda notificações e atividade física quando solicitado;
3. em **Mais**, conecte o Health Connect;
4. permita leitura/escrita dos dados necessários;
5. se disponível, permita leitura em segundo plano;
6. adicione o widget pela tela inicial do Android.

## 10. Crie o canal Beta

Depois que a Stable estiver funcionando:

```powershell
git checkout -b beta
git push -u origin beta
```

Toda implementação experimental deve ser feita primeiro nessa branch. Push em `beta` aciona o workflow **TreinoApp Beta APK**, gerando um APK assinado com package `com.treinoapp.beta`. Stable e Beta podem ficar instalados simultaneamente e têm dados separados.

## 11. Fluxo da v12.1.0 Beta

A v12.1.0 deste pacote já está com `VERSION = 12.1.0` e `versionCode = 120100`. Para testar primeiro na Beta:

```powershell
git checkout beta
# copie o patch v12.1.0 por cima do repositório
python .\scripts\validate_project.py
git add -A
git commit -m "TreinoApp v12.1.0 Beta - Health detalhado e performance"
git push origin beta
```

Baixe o APK em **Actions > TreinoApp Beta APK > Artifacts** e instale por cima da Beta atual. Não desinstale a Beta anterior.

Quando a v12.1.0 estiver validada no aparelho e você decidir promovê-la para Stable:

```powershell
git checkout main
git merge beta
git push origin main
git tag v12.1.0
git push origin v12.1.0
```

Não execute novamente o bump para `12.1.0`, pois este pacote já está nessa versão. O APK Stable gerado com `com.treinoapp.app`, mesma chave e versionCode maior que a Stable anterior poderá ser instalado por cima preservando os dados.

## 12. Regra obrigatória para não perder a capacidade de atualizar

Nunca altere o package Stable `com.treinoapp.app` e nunca troque a chave de assinatura. Nunca desinstale a Stable apenas para instalar uma atualização comum. Instale o APK novo por cima e escolha **Atualizar**.

## Fluxo v12.2.0 Beta

Este pacote já está em `VERSION = 12.2.0` e `versionCode = 120200`.

Use a branch `beta`, aplique o patch, rode `py .\scripts\validate_project.py`, faça commit e push. O workflow `TreinoApp Beta APK` deve compilar a variante `com.treinoapp.beta`.

Não promova para Stable antes de completar `TESTE_v12.2.0_BETA.md` e confirmar migração Room, Health Connect, Detalhes, RIR/RPE, recuperação cardíaca, agenda e exportações nativas.
