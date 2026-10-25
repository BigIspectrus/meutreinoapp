# PC 12.14.0-r1

Corrige `EPERM: operation not permitted, fsync` no Windows. A gravação e o fsync agora usam o mesmo descritor aberto com permissão de escrita, antes de fechar e substituir o arquivo de destino.

Compatível com o APK 12.14.0 e protocolo LAN v1. Não altera pasta de dados, certificado, pareamento nem formato dos registros. Encerrar o programa antigo pelo painel, extrair o novo ZIP inteiro e abrir TreinoApp-PC.exe. Não apagar %LOCALAPPDATA%\TreinoAppPC.
