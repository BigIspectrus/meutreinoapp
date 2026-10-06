# Teste físico v12.8.7 — Widgets (tópico 10)

Instale sobre o Beta anterior, com backup disponível. Este roteiro é para o Android/launcher real; os testes automatizados não substituem a verificação no Galaxy.

1. Abra Configurações → App → Widgets da tela inicial. Adicione Alimentação, Treino, Movimento e Combinado pelo botão ou pela lista de Widgets do launcher.
2. Confira que o widget anterior continua disponível como Combinado. Abra ⋮ e altere um widget: os demais devem manter seus próprios modos, compactação e macros.
3. Redimensione os widgets. Em áreas pequenas, o Combinado prioriza a alimentação e preserva três atalhos; amplie para ver treino e movimento. Em tamanhos maiores aparecem detalhes e barras das metas já definidas.
4. Use + Refeição com diário aberto em uma data anterior: o atalho deve registrar hoje. Confira kcal/macros após salvar e fechar o app.
5. Durante um treino, use o widget Alimentação. O treino ativo deve continuar. Use ABRIR TREINO para retornar à sessão.
6. Use VER CARDIO E PASSOS: deve abrir a aba correta. Atualize Health e confira os passos, minutos e sessões da semana no widget. Os valores são salvos, com horários da consulta; não são dados em tempo real.
7. Negue passos/exercícios e tente atualizar. Dados anteriores disponíveis devem continuar identificados como salvos; ausência deve aparecer como —. Zero real continua zero.
8. Na virada do dia, abra/atualize o widget: os passos de ontem não devem aparecer como hoje. Na segunda-feira, o cardio da semana anterior não deve aparecer como semana atual. O launcher pode adiar a atualização em segundo plano; abrir o app atualiza os widgets.
9. Remova um widget: refeições, metas, histórico e configurações dos outros widgets devem permanecer. Cancele uma edição sem salvar e confira a configuração anterior.

Os IDs dos widgets pertencem ao launcher/aparelho. O backup JSON do app mantém dados e metas, mas widgets devem ser adicionados no outro aparelho. A configuração local é migrada quando o próprio Android restaura IDs do launcher.
