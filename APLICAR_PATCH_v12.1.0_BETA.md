# Aplicar o patch v12.1.0 Beta

Use a branch `beta`. Não aplique diretamente em `main` antes dos testes no celular.

## 1. Confirmar branch

```powershell
cd "C:\Users\bigis\Documents\Projetos\meutreinoapp"
git checkout beta
git branch --show-current
```

O resultado deve ser `beta`.

## 2. Copiar o patch

Extraia `TreinoApp_v12.1.0_BETA_PATCH_DIRETO.zip`. A pasta extraída deve conter diretamente `android`, `web`, `src`, `scripts`, `VERSION` e os demais arquivos.

Exemplo:

```powershell
robocopy "$HOME\Downloads\TreinoApp_v12.1.0_BETA_PATCH_DIRETO" "C:\Users\bigis\Documents\Projetos\meutreinoapp" /E /COPY:DAT /DCOPY:DAT /R:2 /W:1 /XJ
```

## 3. Validar

```powershell
Get-Content .\VERSION
Get-Content .\BUILD.json
py .\scripts\validate_project.py
git status
git diff --stat
```

Esperado:

- versão `12.1.0`;
- versionCode `120100`;
- build `2026.08.18.7`;
- validador com `OK TreinoApp v12.1.0`.

## 4. Commit e push Beta

```powershell
git add -A
git commit -m "TreinoApp v12.1.0 Beta - Health detalhado e performance"
git push origin beta
```

A `.gitignore` desta versão ignora as pastas locais `apk-beta-*` e `apk-teste`, evitando que artefatos baixados sejam enviados por engano.

## 5. Gerar e baixar o APK

Aguarde o workflow `TreinoApp Beta APK` ficar verde.

```powershell
$runId = gh run list --workflow "TreinoApp Beta APK" --branch beta --limit 1 --json databaseId --jq '.[0].databaseId'
$runId
gh run view $runId
```

Depois:

```powershell
New-Item -ItemType Directory -Force .\apk-beta-v12.1.0 | Out-Null
gh run download $runId -D .\apk-beta-v12.1.0
Get-ChildItem .\apk-beta-v12.1.0 -Recurse -Filter *.apk
```

Copie o primeiro APK Beta para Downloads:

```powershell
$apk = Get-ChildItem .\apk-beta-v12.1.0 -Recurse -Filter *.apk | Select-Object -First 1
Copy-Item $apk.FullName "$HOME\Downloads\TreinoApp-v12.1.0-beta.apk" -Force
```

Instale por cima da Beta atual. Não desinstale a Beta anterior.

## 6. Testar

Siga `TESTE_v12.1.0_BETA.md`. Não promova para Stable antes de validar a associação automática, detalhes Health, gráficos, compartilhamento, relatório, armazenamento, timer e atualização sem perda de dados.
