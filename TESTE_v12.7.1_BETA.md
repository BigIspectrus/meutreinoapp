# Teste manual Android — v12.7.1 Beta

Instale sobre a Beta existente (sem desinstalar); faça backup antes. Não há mudança de pacote, assinatura, permissões ou schema Room.

- Com internet desligada, abrir Alimentação → Registrar → Alimentos comuns. A lista deve estar disponível imediatamente.
- Buscar `pao queijo grande`, selecionar Pão de queijo assado: deve escolher 1 grande (aprox. 50 g). Trocar para 2 pequenos (25 g cada): mesmos 50 g e cerca de 182 kcal.
- Buscar `banana prata`, `banana terra`, `pao frances`, `leite em po`, `aipim`, `mussarela`. Conferir nomes, estado cru/cozido e medida selecionada.
- Leite desnatado líquido: 200 mL ≈ 200 g → 78 kcal, 5,96 g proteína (amostra Vigor/TBCA). Leite integral líquido: 200 mL → 130 kcal (média TBCA). Conferir fonte, aviso e rótulo da sua marca.
- Macarrão cozido sem óleo/sal: 200 g → 202 kcal. Macarrão cru tem aproximadamente 371 kcal/100 g e não deve ser confundido com cozido.
- Adicionar alimento comum duas vezes: entra nos recentes e em Meus alimentos, sem duplicar o cadastro. Favoritar e ajustar uma medida na cópia pessoal; conferir após fechar/reabrir o APK.
- Editar kcal/medidas de uma cópia: próxima refeição usa os novos valores; refeições antigas permanecem com os valores originais.
- Cadastro pessoal/importado já existente com mesmo ID/fonte deve ter prioridade. Apenas abrir a busca não deve alterar metas ou seus cadastros.
- Criar receita usando ingredientes do banco comum sem importar previamente. Conferir rendimento/porção e registro no diário.
- Catálogo → TACO → buscar leite: leites líquidos devem mostrar TBCA como fonte e macros completos, mesmo com cache antigo. Banco comum também aparece como fonte separada.
- Fazer backup/restaurar em ambiente de teste e verificar alimentos usados, favoritos, medidas e histórico.
- Regressão: treino, descanso, iniciar série pelo relógio, notificações e sincronização Health Connect devem manter comportamento anterior.

Não foram testados automaticamente em dispositivo físico: WebView/Room, instalação de atualização, notificações, Health Connect e Galaxy Watch. Os testes locais e CI não substituem esse checklist.
