# Teste manual — TreinoApp v12.5.2 Beta

Instale por cima da v12.5.1 Beta. Não desinstale o aplicativo.

## 1. Preservação e migração

1. Confirme que metas, alimentos, receitas, refeições prontas, diário, treinos e configurações continuam presentes.
2. Registre um alimento antigo e confirme que kcal, macros, fibras e sódio continuam iguais.
3. Feche e reabra o APK para confirmar que a migração Room 6 → 7 não perdeu dados.

## 2. Micronutrientes

1. Abra Alimentação → “Metas e micros” e preencha manualmente somente duas metas, por exemplo cálcio e ferro.
2. Busque `arroz integral` na TACO, importe o alimento e confirme que vitaminas/minerais aparecem em “Campos opcionais e micronutrientes”.
3. Registre o alimento no diário e expanda “Micronutrientes do dia”.
4. Confirme que somente metas preenchidas exibem barra/percentual; os outros nutrientes mostram apenas o consumo.
5. Crie uma receita usando esse alimento e confirme que os micronutrientes são somados proporcionalmente.

## 3. Importação em lote

1. Abra Receitas e refeições → Meus alimentos → “Baixar modelo”.
2. Importe um JSON com dois alimentos novos e um alimento de mesmo nome/marca de um cadastro existente.
3. Confirme o resumo de novos/mesclados e que o cadastro existente não teve valores preenchidos apagados.
4. Pesquise e registre um dos alimentos importados.

## 4. Health Connect nutricional

1. Em Mais → Health, confirme que “Alimentação no Health Connect” começa desativada.
2. Ative e conceda a permissão de nutrição. Recusar não deve desconectar treino, FC, sono ou peso.
3. Toque em “Sincronizar alimentação dos últimos 30 dias”.
4. No Health Connect, confirme as refeições do TreinoApp no dia correto, sem duplicatas.
5. Edite uma refeição e sincronize novamente; confirme que o valor foi atualizado.
6. Exclua todos os itens de uma refeição e sincronize; confirme que o registro antigo do TreinoApp não permanece naquele dia.
7. Desative a opção e confirme que novas alterações não são enviadas.

## 5. Relatório mensal

1. Em Alimentação, abra “Relatório mensal” e selecione um mês com registros.
2. Confira dias registrados, médias de kcal/proteína, aderência às metas, sessões, volume e RIR.
3. Toque em “Atualizar Health” e confira peso, sono, HRV e FC de repouso quando disponíveis.
4. Quando houver menos de cinco pares, confirme que aparece “dados insuficientes”, sem uma conclusão inventada.
5. Compartilhe o relatório e abra o arquivo HTML em outro aplicativo/navegador.

## 6. Regressão essencial

1. Inicie e finalize uma série; confirme timer, som/vibração e notificação do relógio.
2. Finalize um treino e sincronize com Galaxy Watch/Health Connect.
3. Compartilhe um treino com nove ou mais exercícios e confirme que todos aparecem na imagem.
4. Exporte um backup e confira alimentação, micronutrientes e preferência da integração nutricional.
