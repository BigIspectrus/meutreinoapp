# Roteiro de teste v12.2.0 Beta

Instale por cima da Beta anterior. Não desinstale antes.

## 1. Migração

- abrir o app;
- confirmar que histórico antigo continua presente;
- abrir sessões antigas com vínculo de relógio;
- verificar que não houve reset do banco.

## 2. Detalhes

- Histórico -> Detalhes deve abrir;
- verificar FC média/máxima/mínima, kcal, duração e origem;
- verificar gráfico de FC;
- verificar marcadores das séries;
- verificar timeline;
- verificar tabela com FC fim, pico, +30/+60/+90 s e queda 60 s;
- verificar que campos ausentes aparecem como travessão, não como dados inventados.

## 3. Novo treino com RIR/RPE

- iniciar TreinoApp e Galaxy Watch próximos no tempo;
- registrar RIR/RPE em algumas séries;
- concluir pelo menos 4 séries com descansos acima de 60 s;
- confirmar timer/notificação;
- finalizar e aguardar associação automática;
- confirmar RIR/RPE no Histórico e Detalhes.

## 4. Recuperação cardíaca

Para obter medidas úteis, deixe ao menos algumas pausas superiores a 60 s.

- conferir FC no fim da série;
- conferir pico pós-série;
- conferir +30/+60/+90 s quando disponíveis;
- se uma nova série ocorrer antes da janela, confirmar que o app não força um número de recuperação.

## 5. Recovery Health

Depois de atualizar, entre em Mais -> Health Connect -> Conectar para conceder os novos tipos opcionais.

Em Progresso -> Recuperação:

- sono;
- FC de repouso;
- HRV;
- peso/composição corporal;
- carga 7d;
- recuperação média de FC.

É normal um item ficar vazio quando Samsung Health/Health Connect não fornece aquele tipo.

## 6. Progressão

- configurar uma faixa de reps em um template;
- abrir Detalhes de uma sessão;
- verificar sugestão por exercício;
- confirmar que o app nunca altera a ficha automaticamente.

## 7. Agenda

- Progresso -> Agenda;
- associar templates a dias da semana;
- voltar à tela inicial;
- confirmar treino planejado de hoje;
- confirmar widget;
- verificar calendário e dias já treinados.

## 8. Runtime Android

- cartão "Instalar como App" não deve aparecer no APK;
- diagnóstico deve informar Android/GitHub Releases e Service Worker não utilizado;
- armazenamento deve informar proteção Android;
- notificações devem ser tratadas como permissões Android;
- relatório, CSV, backup e imagem devem usar salvamento/compartilhamento Android.
