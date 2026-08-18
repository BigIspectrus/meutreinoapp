# Checklist do primeiro APK

## Antes de instalar

- tenha o backup JSON da PWA v11;
- confirme que a Release foi gerada pelo workflow Stable e não por um APK debug;
- guarde a chave de assinatura em dois locais seguros.

## Primeira abertura

- confirme que o app identifica o canal como STABLE;
- importe o backup JSON da PWA;
- feche e abra o app e confirme que treinos/histórico continuam presentes;
- permita notificações;
- permita atividade física;
- conecte Health Connect e conceda somente as permissões solicitadas.

## Teste de treino ativo

1. Inicie um treino.
2. Minimize o app.
3. Confirme que a notificação permanente mostra treino, duração, séries e exercício.
4. Volte ao app e conclua uma série.
5. Minimize/bloqueie o celular durante o descanso.
6. Confirme a contagem regressiva na notificação.
7. Teste `-15s`, `+30s` e `Pular` na própria notificação.
8. Finalize o descanso normalmente e confirme a notificação de descanso concluído.
9. Finalize o treino e confira se a notificação permanente desaparece.
10. Reabra o app e confira o histórico.

## Tipos de série

Registre pelo menos uma sessão contendo alguns dos tipos abaixo e confirme no histórico/CSV:

- Aquecimento
- Work set
- Top set
- Back-off
- Drop set
- Cluster set
- FST-7
- Rest-pause
- Myo-reps
- AMRAP

Aquecimento não deve ser tratado da mesma forma que uma série de trabalho nas métricas principais/PR.

## Galaxy Watch / Health Connect

1. No Samsung Health, confirme que a sincronização com Health Connect está habilitada.
2. Inicie o treino no Galaxy Watch e no TreinoApp em horários próximos.
3. Finalize os dois em horários próximos.
4. Aguarde a sincronização Samsung Health → Health Connect.
5. Abra o TreinoApp e use Sincronizar sessões recentes.
6. Se a correspondência temporal for >=85%, deve vincular automaticamente.
7. Se houver dúvida, o app deve manter como pendente e solicitar confirmação no fluxo manual.
8. Confira FC média/máxima, kcal e duração quando esses dados estiverem disponíveis no Health Connect.

## Widget

Adicione o TreinoApp pela tela de widgets do Android. Sem treino ativo deve mostrar próximo treino/progresso semanal. Durante um treino deve mostrar sessão ativa, séries e duração.

## Atualização sem perder dados

Depois de usar v12.0.0, gere uma v12.0.1 assinada com a mesma chave, instale por cima e confirme:

- Android oferece Atualizar, não instalar outro app;
- histórico permanece;
- templates permanecem;
- Health Connect continua configurável;
- widget continua funcionando.
