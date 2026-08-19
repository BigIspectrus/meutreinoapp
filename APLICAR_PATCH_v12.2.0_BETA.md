# Aplicar v12.2.0 Beta

No PowerShell:

```powershell
cd "C:\Users\bigis\Documents\Projetos\meutreinoapp"
git checkout beta
git status
```

Extraia `TreinoApp_v12.2.0_BETA_PATCH_DIRETO.zip` em Downloads e copie:

```powershell
robocopy "$HOME\Downloads\TreinoApp_v12.2.0_BETA_PATCH_DIRETO" "C:\Users\bigis\Documents\Projetos\meutreinoapp" /E /COPY:DAT /DCOPY:DAT /R:2 /W:1 /XJ
```

Valide:

```powershell
Get-Content .\VERSION
py .\scripts\validate_project.py
```

Esperado: `12.2.0` e validação OK.

Depois:

```powershell
git add -A
git commit -m "TreinoApp v12.2.0 Beta - Performance Recovery e agenda"
git push origin beta
gh run list --branch beta --limit 5
```

A compilação real do APK é validada pelo GitHub Actions.
