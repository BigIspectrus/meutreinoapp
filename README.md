# 🏋️ Treino App v14 — PWA

17/03/26 - 10h42

## Como colocar no ar (GitHub Pages)

### 1. Criar o repositório
1. Acesse **github.com** e faça login
2. Clique em **"New repository"** (botão verde no canto superior direito)
3. Dê o nome: `treino-app` (ou qualquer nome)
4. Deixe como **Public**
5. Clique em **"Create repository"**

### 2. Fazer upload dos arquivos
1. Na página do repositório recém-criado, clique em **"uploading an existing file"**
2. Arraste **todos os 5 arquivos** de uma vez:
   - `index.html`
   - `sw.js`
   - `manifest.json`
   - `icon-192.png`
   - `icon-512.png`
3. Clique em **"Commit changes"**

### 3. Ativar o GitHub Pages
1. Vá em **Settings** (aba no menu do repositório)
2. No menu lateral, clique em **Pages**
3. Em "Branch", selecione **main** e clique **Save**
4. Aguarde ~1 minuto. Vai aparecer a URL do seu app, algo como:
   ```
   https://SEU_USUARIO.github.io/treino-app/
   ```

### 4. Instalar no celular como app
**Android (Chrome):**
- Abra a URL no Chrome
- Toque no menu ⋮ → "Adicionar à tela inicial"
- O app vai aparecer na sua tela inicial igual um app nativo!

**iPhone (Safari):**
- Abra a URL no Safari (não funciona no Chrome do iPhone)
- Toque no botão de compartilhar (quadrado com seta pra cima)
- Toque em "Adicionar à tela de início"

---

## Sobre as notificações de descanso
- Na primeira vez, o app vai pedir permissão para notificações
- Depois de ativar, o timer notifica **mesmo com o app em segundo plano**
- No iPhone, notificações só funcionam se o app estiver instalado via Safari

## Backup e dados
- Todos os dados ficam salvos **no próprio celular** (localStorage)
- Para transferir para o PC: use a função **Baixar Backup** no app
- Para restaurar: use **Importar Backup**

---

## Arquivos do projeto
| Arquivo | Função |
|---|---|
| `index.html` | App completo (HTML + CSS + JS) |
| `sw.js` | Service Worker — cache offline + notificações background |
| `manifest.json` | Configuração do PWA (ícone, nome, cor) |
| `icon-192.png` | Ícone do app (tela inicial) |
| `icon-512.png` | Ícone do app (splash screen) |
