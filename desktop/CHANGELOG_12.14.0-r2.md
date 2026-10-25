# PC 12.14.0-r2

- Launcher verifica se o servidor já está disponível antes de iniciar outro processo.
- A abertura do navegador é feita diretamente pelo processo iniciado pelo usuário, usando o Windows, em vez de depender do processo Node oculto com rundll32.
- Ao iniciar um servidor novo, aguarda prontidão da interface e da API local antes de abrir a página.
- URL de entrada diferente a cada abertura para solicitar navegação nova, sem reutilizar apenas um fragmento antigo.
- Navegação do PC vinculada antes de renderizar gráficos; se houver falha de inicialização, exibe um aviso com o erro e mantém acesso aos menus. Adaptação exclusiva dos arquivos empacotados do PC, sem alterar o APK.
- Mantém a correção de fsync da r1, os dados, o pareamento e a compatibilidade com APK 12.14.0.

Diagnóstico da tela vazia: cópia dos dados abriu com sucesso em contextos isolados Chrome e Firefox. O servidor existente respondeu normalmente e o usuário confirmou que a página completa apareceu ao abrir diretamente http://127.0.0.1:43127/. Não foi identificada alteração necessária nos dados ou no APK.
