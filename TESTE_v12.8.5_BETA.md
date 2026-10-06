# Teste Android — v12.8.5 Beta — tópico 6

Faça backup e atualize a Beta sem desinstalar. Pacote, assinatura, permissões, schema Room e metas manuais inalterados.

1. Abrir Alimentação num dia com alimentos: deve aparecer Parcial / não confirmado. Dias antigos não são concluídos automaticamente. Dia vazio deve aparecer Sem registros, não zero completo.
2. Tocar Concluir dia, ler a data e a confirmação. Cancelar deve manter parcial; confirmar deve mostrar Dia alimentar completo, mesmo que as kcal/macros não atinjam as metas. Conferir que nenhuma meta/alimento mudou.
3. Fechar/reabrir o app: conferir conclusão persistida. Usar Reabrir dia: alimentos ficam intactos e a situação volta a parcial.
4. Concluir novamente; adicionar alimento, alterar peso/horário/tipo de refeição ou remover item: o dia deve reabrir como parcial. Alterar outro dia não reabre o anterior. Modificar metas/cadastro de alimento não altera o snapshot já registrado.
5. No resumo semanal, concluir dois dias e deixar um com registro parcial. Média deve usar somente os dois completos; parcial aparece na cobertura, sem contar como zero. Sem completos, média aparece como —.
6. Abrir Relatório mensal: conferir completos, parciais/não confirmados e dias sem registro até hoje. Médias, micros, aderência às metas atuais e relações com treino/recuperação usam completos; treinos, peso, RIR e dados Health continuam disponíveis independentemente.
7. Em Evolução, gráficos de kcal/macros devem mostrar todos os registros: ponto preenchido = completo; vazado = parcial, com identificação ao tocar. Média somente dos completos; passos/cardio não mudam de critério.
8. Exportar o relatório: identificação dos dias e critérios devem permanecer no arquivo. Relação kcal de sete dias × peso só usa semanas com 7/7 dias completos.
9. Exportar backup e conferir `nutritionDayStatusV1285`. Restaurar somente com backup de segurança prévio: backup novo restaura as situações; backup antigo com alimentação não preserva conclusões do conjunto substituído. Não apague seus dados reais para testar.
10. Durante treino ativo, registrar refeição e concluir/reabrir o dia. Voltar ao treino sem reiniciar a sessão. Widget deve continuar mostrando os totais reais registrados hoje, inclusive quando o dia ainda está parcial.

Automação cobre handlers reais, comparação de conteúdo, alterações, confirmação, reabertura, falhas de armazenamento, persistência, médias/micros/associações, janelas de sete dias, gráficos e compatibilidade de backup. Navegador e testes Android simulados não substituem WebView/launcher/Health no aparelho real.

Tópico 7 NÃO implementado nesta etapa; aguardar autorização. Testes físicos pendentes do tópico 4 continuam no roteiro v12.8.3.
