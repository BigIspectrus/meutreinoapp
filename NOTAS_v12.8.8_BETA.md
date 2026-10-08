# v12.8.8 — backup externo e painel inicial

Implementados somente os tópicos 13 e 14. Água e medidas/fotos foram descartados por pedido do usuário.

## Backup automático

Em Mais → Dados → Backup automático em pasta, escolha/crie uma pasta pelo seletor Android. Esse botão ativa a cópia automática. O intervalo padrão é diário, com opções de 12 horas ou semanal. O Android pode adiar o trabalho por bateria ou indisponibilidade da pasta.

O aplicativo prepara um espelho completo do arquivo JSON ao alterar os dados e antes de ir para segundo plano. O worker copia esse espelho com o app fechado. O status distingue o horário dos dados preparados do horário da gravação externa. Não é acesso contínuo ao WebView/Health Connect.

“Salvar cópia agora” prepara os dados atuais e cria uma versão nova. As gravações usam nomes únicos; uma falha não substitui cópias anteriores. Inicialmente todas as versões são preservadas. Se escolher retenção 7/30, somente versões automáticas rastreadas pelo app e na pasta atual são elegíveis a exclusão após a nova gravação. Cópias manuais e arquivos de terceiros ficam fora dessa limpeza.

O JSON pode ser enviado pelo compartilhamento Android e importado em outro aparelho pela função existente. A organização do painel e o rascunho do treino também são incluídos; permissão e destino da pasta não são transferidos. Backups internos continuam disponíveis. No novo aparelho a pasta externa deve ser escolhida novamente.

## Painel

“Personalizar início” permite ordenar treino, semana, atalhos, alimentação, movimento, desafio, gráficos, peso, nível, conquistas e situação do backup. Cada cartão pode ficar no início, na área de detalhes ou oculto. A organização padrão pode ser restaurada antes de salvar. Cancelar não altera as preferências.

## Entrega

Versão `12.8.8-beta`, código `120808`, pacote e certificado existentes. Sem nova permissão ampla de armazenamento nem migração de Room. Build com `[skip-tests]`, conforme pedido explícito: não executar testes automatizados nem QA manual nesta entrega. A compilação e a identidade do APK são conferidas para gerar e entregar o arquivo correto; validação física fica com o usuário.

Referências: [Storage Access Framework](https://developer.android.com/training/data-storage/shared/documents-files), [trabalho periódico Android](https://developer.android.com/develop/background-work/background-tasks/persistent/getting-started/define-work).
