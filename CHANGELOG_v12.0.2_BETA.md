# TreinoApp v12.0.2 Beta

- Diagnóstico Health Connect nativo ampliado.
- Exibe permissões reais concedidas ao pacote beta.
- Testa ExerciseSessionRecord em 24 h e 7 dias com Instant e em 24 h com LocalDateTime.
- Testa leitura bruta de HeartRateRecord e TotalCaloriesBurnedRecord.
- Exibe exceções reais da API em vez de tratar tudo como “nenhuma sessão”.
- Gravação de exercício agora retorna motivo/exception detalhados.
- Metadata de treino escrito pelo TreinoApp usa activelyRecorded + Device.TYPE_PHONE.
- Botão Diagnosticar Health sempre renderiza e rola até o painel de resultado.
- Exportações no APK agora usam APIs nativas Android em vez de links de download do WebView.
- Relatório para personal: “Gerar Relatório” salva em Downloads/TreinoApp e “Gerar e Compartilhar” abre o compartilhamento nativo.
- Resumo visual do treino: “Salvar na Galeria” grava PNG em Pictures/TreinoApp via MediaStore.
- Resumo visual ganhou compartilhamento nativo de imagem.
- PDF, CSV e backup também passam a salvar pelo armazenamento público nativo do Android.
- Mensagens de sucesso só aparecem após confirmação real da gravação; falhas exibem o erro em vez de informar salvamento inexistente.
