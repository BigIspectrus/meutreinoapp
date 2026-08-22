# Changelog v12.5.0 Beta

## Alimentação

- adiciona Alimentação como aba principal;
- permite definir manualmente metas diárias de kcal, proteína, carboidratos e gorduras;
- adiciona cadastro manual de alimentos por 100 g ou porção;
- registra alimentos em café da manhã, almoço, jantar ou lanches;
- calcula os totais do dia e mostra o progresso de cada meta;
- inclui busca, favoritos, recentes e cópia da refeição de ontem;
- mostra um resumo dos sete dias anteriores até a data selecionada;
- preserva os valores históricos de cada registro mesmo se o alimento for editado ou excluído.

## Dados e Android

- inclui metas, alimentos e diário no backup JSON e nos snapshots internos;
- adiciona espelho nativo transacional das informações de alimentação;
- eleva o Room ao schema 5 com migração explícita `MIGRATION_4_5`;
- eleva o schema Web a 16;
- mantém proibida qualquer migração destrutiva;
- preserva os fluxos de treino, Galaxy Watch e Health Connect da v12.4.2.
