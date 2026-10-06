# Teste Android — v12.8.3 Beta — tópicos 3 e 4

Faça backup e instale sobre a Beta atual sem desinstalar. Sem alteração de pacote, assinatura, permissões ou schema Room.

## Preferências (tópico 3)

1. Em Cardio & passos, escolher Bicicleta ergométrica, 90 dias e gráfico de kcal dos cardios.
2. Em Evolução, escolher macros no gráfico de rotina. No gráfico original, escolher Tabela, um exercício e o grupo Pernas.
3. Fechar/reabrir o app: conferir todas as seleções, sem reconstruir treino ativo nem modificar registros/horários de leitura.
4. Alternar Tabela → Volume → Tabela e conferir grupo lembrado. Caso um exercício salvo deixe de existir, deve haver uma seleção válida, não um gráfico quebrado.
5. Exportar backup, conferir `activityPreferencesV1283`; restaurar só em ambiente de teste e conferir as preferências.

## Quatro verificações físicas obrigatórias (tópico 4)

Responda com o resultado de cada item; não é necessário alterar a data ou as configurações de segurança do telefone.

1. **Instalação e preservação:** atualizar sem desinstalar; conferir histórico, metas, alimentos e treino ativo/rascunho.
2. **Widget com app fora da tela:** registrar refeição, conferir kcal/macros no widget; sair para a tela inicial e usar “Adicionar refeição”. Durante treino, voltar e conferir séries/descanso. Não usar “Forçar parada” como equivalente a fechar a tela: o Android pode impedir atualizações após força de parada.
3. **Virada do dia:** após a próxima meia-noite, conferir que o widget não mostra os totais de ontem como hoje. A atualização do launcher é periódica e pode atrasar; abrir o app ou registrar refeição deve atualizar. Não altere o relógio do aparelho para simular.
4. **Health e backup:** se desejar testar permissões negadas, negar apenas leitura de passos/calorias pelo Health Connect, conferir dados salvos identificados como antigos, depois reautorizar. Testar restauração com backup de segurança prévio e confirmar metas/histórico/preferências; não apagar dados reais para fazer o teste.

## Cobertura automatizada

- Preferências, valores inválidos, exercício removido e nova sessão de execução.
- Exportação/importação/snapshot, confirmação antes de substituir dados, metas/RIR zero e horários do cache preservados.
- Android simulado (Robolectric): recursos do widget, SharedPreferences, ontem ≠ hoje, atalho de refeição, sessão ativa, Room/reabertura e Health Connect indisponível.
- Falhas e permissões de leitura: respostas controladas nos testes de atividade; não foi feita revogação real no Galaxy.

Testes simulados não comprovam comportamento de launcher específico, Samsung Health, Galaxy Watch, WebView real, Bluetooth ou política de bateria. A parte física do tópico 4 fica pendente até receber os resultados do usuário.

Tópico 5 (montar refeição com vários alimentos antes de salvar) NÃO implementado; aguarda autorização.
