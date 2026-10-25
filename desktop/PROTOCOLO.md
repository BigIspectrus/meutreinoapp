# Protocolo LAN v1

`web/lan-protocol.js` contém o manifesto de chaves e a conciliação compartilhada. Mudanças incompatíveis no manifesto/formato exigem incrementar a versão de protocolo e atualizar APK e companion juntos.

O PC mantém `config.json` (certificado, chave privada e token do aparelho autorizado) e `dados.json` (snapshot canônico, revisão e tombstones) em LocalAppData/TreinoAppPC. Não versionar, publicar nem incluir esses arquivos em pacotes de distribuição. O runtime só os cria ao ser executado pelo usuário.

## Transporte

- Navegador: HTTP loopback 127.0.0.1:43127, Host estrito; cookie HttpOnly SameSite=Strict obtido com segredo do launcher, sem CORS. POST exige Origin exato. Interface não usa service worker.
- Android: HTTPS na porta 43128, IP privado literal, certificado com SHA-256 conferido no TrustManager e HostnameVerifier daquela conexão. Segredo de pareamento aleatório de 256 bits, único e de dez minutos. Após parear, token privado nas SharedPreferences, excluído do backup Android. Não alterar a política global de certificados/HTTP.
- Bodies/respostas até 64 MiB; timeouts, conexões limitadas e ausência de redirecionamento no APK.

## Conciliação

POST /api/sync contém protocolo, base (último snapshot aplicado pelo cliente), local (snapshot atual), resoluções por token e revisão quando houver escolhas. Arrays usam IDs; perfis usam nome do exercício; mapas usam sua chave. Configurações atômicas entram como uma unidade. Snapshots contêm strings originais do armazenamento, nunca toda a localStorage.

Se local=base, recebe remoto; se remoto=base, publica local; se local=remoto, mantém; divergência nos dois lados exige escolha. Ausência também conta como alteração. Conflitos tornam a requisição inteira uma prévia sem commit. Resoluções são recusadas se a revisão remota mudar; o cliente também recusa escolhas se seu snapshot local mudar. Identificadores excluídos são lembrados para que um cliente novo com base vazia precise autorizar uma restauração.

Requisições de commit são serializadas no servidor. Cada mudança faz backup e substituição do arquivo, com fsync do temporário. Só depois a revisão em memória avança. O cliente cria journal e cópia em IndexedDB, reconfere alterações/edições, aplica as chaves e confirma a base/journal em uma transação IndexedDB. Na retomada, se a aplicação não ficou inteira, conserva a base anterior para reconciliar novamente sem apagar alterações locais.

Snapshots não são criptografados no disco pelo programa; permanecem protegidos pela conta/pasta do usuário do sistema. TLS protege o transporte. Cache Health é recebido do Android; o servidor ignora tentativas do navegador de publicar alterações nessas chaves. Rascunhos nunca são transportados.

## Distribuição

`npm run prepare:android` prepara os arquivos web. `node scripts/build-desktop.mjs` compila o launcher C# e empacota servidor ESM com dependências, web, runtime Node e licenças. Não executa o programa. A distribuição é um ZIP portátil; exige extração completa. Dados do usuário permanecem fora da pasta do programa entre versões.
