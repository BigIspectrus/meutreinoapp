# Teste Android — v12.8.4 Beta — tópico 5

Faça backup e atualize a Beta sem desinstalar. Pacote, assinatura, permissões e schema Room não mudaram.

## Montagem de refeição

1. Em Alimentação, abrir o registro do almoço. Escolher arroz, feijão e frango, ajustando os pesos. A lista deve mostrar três itens e os totais de kcal/P/C/G, sem adicionar nada ao diário ainda.
2. Tocar no arroz da lista, alterar o peso; conferir atualização dos totais. Remover o feijão e escolher novamente. Reescolher um alimento já na lista deve editar o mesmo item, não duplicá-lo.
3. Conferir pão de queijo pequeno/grande em medidas caseiras e leite líquido em mL. Porções e equivalências são estimativas; use o peso/rótulo para maior precisão.
4. Escolher uma receita salva junto a outro alimento. Conferir quantidade, macros e micronutrientes no diário após salvar.
5. Ajustar a quantidade de um item para zero: a refeição inteira deve ficar impedida de salvar até corrigir ou remover esse item.
6. Tocar em Cancelar ou ×: recusar o descarte deve manter a montagem; confirmar deve fechá-la sem registrar os itens. O rascunho fica apenas em memória e não sobrevive ao encerramento/recarregamento do app.
7. Conferir horário/tipo de refeição, salvar uma vez e verificar todos os alimentos no diário e os totais do dia/widget. Toques repetidos não devem criar outra refeição.
8. Abrir o registro numa data anterior: conferir a data exibida na montagem e salvar nesse dia, sem misturar com os totais de hoje no widget.
9. Conferir metas, alimentos e histórico anteriores. Durante treino ativo, abrir o atalho de alimentação, registrar a refeição e voltar sem reiniciar a sessão/descanso.

## Verificações automatizadas

- Handlers reais: montagem, edição/remoção, unidades, receitas/micronutrientes, snapshots, data, confirmação e preservação das metas/histórico.
- Falha no armazenamento principal: nenhum registro parcial; montagem continua intacta e liberada para nova tentativa.
- Falha secundária de recentes: refeição já salva não é repetida.
- Um único commit do lote e uma única notificação de alteração para os fluxos existentes de sincronização/widget.
- Validação sintática, cache offline, suíte web e testes Android simulados no GitHub Actions.

Testes de interface no navegador não substituem a verificação no WebView/launcher real. Os testes físicos do tópico 4 continuam descritos em `TESTE_v12.8.3_BETA.md` e pendentes de retorno do usuário.

Não implementado nesta etapa: tópico 6, marcar o dia completo/parcial. Aguardar autorização explícita antes de avançar.
