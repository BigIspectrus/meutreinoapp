# Evolução do APK — execução por tópico e aprovação

Pedido do usuário: realizar TODOS os itens abaixo, nesta ordem, concluindo e entregando um tópico por vez. Ao terminar cada tópico, parar e pedir autorização explícita para o próximo. Não antecipar implementação de outros tópicos.

Autorização adicional recebida: realizar os tópicos 3 e 4 na mesma continuidade. Parar antes do tópico 5. A validação física do tópico 4 depende do usuário; testes em ambiente simulado não devem ser apresentados como testes feitos no Galaxy/launcher real.

Autorização posterior recebida: continuar para o próximo tópico, implementando o tópico 5 na v12.8.4. Entregar e parar antes do tópico 6. A autorização não equivale a resultado dos testes físicos pendentes do tópico 4.

Nova autorização recebida após entregar v12.8.4: realizar o tópico 6 na v12.8.5. Parar antes do tópico 7. Os testes físicos pendentes não foram declarados concluídos pelo usuário.

Autorização após v12.8.5: realizar os três próximos tópicos, 7, 8 e 9, na v12.8.6. Entregar APK e parar antes do tópico 10. Isso não confirma testes físicos pendentes nem autoriza widgets/água/medidas/backup externo/painel.

1. Corrigir RIR/RPE ausente convertido em zero nas análises, preservando zero real e o histórico.
2. Mostrar atualização de cada dado separadamente, inclusive dados anteriores mantidos do cache.
3. Lembrar filtros e preferências de modalidade, período e gráfico ao reabrir.
4. Validar casos críticos no Android: widget com app fechado, virada do dia, permissões negadas e restauração de backup. Pedir ao usuário os testes físicos que não possam ser executados aqui.
5. Montar uma refeição inteira com vários alimentos antes de salvar.
6. Marcar alimentação do dia como concluída e distinguir dias completos de registros parciais nos relatórios.
7. Peso com linha de tendência de sete dias e comparação entre semanas.
8. Metas manuais de passos/dia, minutos de cardio/semana e quantidade de sessões, sem modificar metas alimentares.
9. Cardio com distância, velocidade média e ritmo, somente quando os dados fornecidos pelo Health Connect permitirem.
10. Widgets separados/configuráveis: alimentação, treino, movimento ou combinado, respeitando as restrições do Android.
11. Registro de água com copos/garrafas e meta manual.
12. Medidas corporais e fotos opcionais armazenadas localmente.
13. Backup externo automático para pasta escolhida e exportação para outro aparelho, além dos snapshots internos.
14. Painel inicial personalizável: seleção e ordem dos cartões, mantendo detalhes secundários fora da tela principal.

Pedido explícito em 07/10/2026: pular os tópicos 11 (água) e 12 (medidas/fotos), implementar somente 13 e 14 juntos na v12.8.8 e gerar APK sem executar testes. A seleção da pasta é feita pelo usuário no próprio Android; a validação física fica com ele. Esta instrução substitui a pausa entre esses dois tópicos e encerra a lista solicitada após a entrega de 13 e 14.

Autorização após a v12.8.6: implementar o tópico 10 na v12.8.7, gerar APK e parar antes do tópico 11 (água). A autorização não confirma os testes físicos anteriores.

## Regras de entrega

Autorização em 08/10/2026: da lista mais recente de 15 sugestões, implementar somente 1 (modo uma mão), 6 (revisão de evolução/plateau), 10 (OCR do rótulo), 11 (atalhos por refeição) e 14 (lixeira) juntos na v12.10.0. Não confundir com a lista antiga cujo 14 era painel inicial, nem com a anterior em que 1/8 eram carga/metas musculares. Preservar dados/assinatura/Health e gerar APK sem testes funcionais, mantendo a preferência anterior. Não implementar os demais itens.

Após a v12.9.0, autorizado somente 1 (tipo de carga por exercício) e 8 (metas semanais manuais de séries por músculo) da última lista. Entregar v12.9.1, sem antecipar outros itens. Preservar o histórico sem conversão entre carga total, por halter, por lado ou assistência. Faixas musculares escolhidas pelo usuário, diretas/indiretas separadas. Manter compilação sem testes.

Após a v12.8.9, o usuário autorizou juntos somente os itens 1, 2, 3, 4, 7 e 9 da NOVA lista: rascunho alimentar persistente, porções habituais, notas por aparelho, substitutos favoritos, planejamento alimentar separado do consumo e séries semanais por músculo. Entregar todos na v12.9.0. Não confundir com a numeração da lista antiga concluída e não antecipar os demais itens. Manter a preferência de não executar testes; compilar e gerar APK assinado.

- Foco no APK Android/Beta e preservação dos dados, assinatura e pacote existentes.
- Verificar em proporção ao risco; gerar APK assinado quando o tópico mudar o aplicativo.
- Informar o que foi feito, o que foi testado e o que depende de verificação física.
- A autorização de um tópico não autoriza avançar automaticamente ao seguinte. As aprovações e entregas ficam registradas na conversa.
