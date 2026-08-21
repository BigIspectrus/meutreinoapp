# Teste manual — TreinoApp v12.4.2 Beta

Instale por cima da v12.4.1 Beta. Não desinstale o aplicativo.

## 1. Regressão básica

1. Confirme que treinos, histórico, preferências e vínculos do Health Connect continuam presentes.
2. Inicie um treino e use “Iniciar série” pelo celular na primeira série.
3. Preencha carga e repetições, conclua a série e confirme o timer normal de descanso.
4. Pule um descanso e confirme que o treino continua avançando normalmente.
5. Finalize o treino pelo celular e confirme o resumo e a sincronização pós-treino.

## 2. Teste isolado do relógio

1. No Galaxy Wearable, permita as notificações do TreinoApp Beta.
2. Abra Mais → Preferências → Galaxy Watch.
3. Toque em “Testar aviso” e confirme que o aviso chega ao celular e ao relógio.
4. Toque em “Testar botão”.
5. No relógio, abra a notificação e toque em “Testar botão”.
6. Confirme a mensagem “Botão do relógio funcionando”.
7. Confirme que nenhum treino, série ou registro de histórico foi criado ou alterado.

## 3. Fluxo real

1. Inicie um treino com pelo menos três séries no mesmo exercício.
2. Inicie e conclua a primeira série pelo celular.
3. Aguarde o descanso terminar com a tela do celular apagada.
4. No aviso do Galaxy Watch, toque em “Iniciar série”.
5. Confirme no relógio a mensagem “Série iniciada · conclua pelo celular”.
6. Abra o celular e confira que a série seguinte mostra o horário de início registrado.
7. Preencha os dados e conclua essa série pelo celular.
8. Repita uma vez com o TreinoApp aberto durante o toque no relógio.
9. Finalize o treino e confirme nos detalhes que `setStartedAt` e o descanso anterior foram preservados.

## 4. Proteções

1. Em um novo descanso, inicie a próxima série pelo celular antes de tocar no aviso antigo do relógio.
2. Toque no aviso antigo e confirme que ele não altera a série atual.
3. Toque duas vezes rapidamente na ação válida do relógio e confirme que existe apenas um horário de início.
4. Termine um treino deixando um aviso antigo no relógio; toque nele e confirme que nenhum treino é reaberto.

Se a notificação chegar ao celular, mas não ao relógio, registre o modelo do Galaxy Watch, a versão do Wear OS/One UI Watch e se outras notificações do celular aparecem normalmente nele.
