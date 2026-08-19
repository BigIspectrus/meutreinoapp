# Teste v12.1.0 Beta

Instale por cima da Beta existente. Não desinstale antes. O package continua `com.treinoapp.beta` e o versionCode sobe para `120100`.

## 1. Atualização e dados

1. Confirme `Android 12.1.0-beta` e código `120100` em Mais.
2. Confirme que os treinos existentes continuam no Histórico.
3. Execute a sincronização do banco nativo se o app oferecer essa ação.

## 2. Associação automática Health

1. Inicie Galaxy Watch e TreinoApp Beta com poucos segundos de diferença.
2. Faça uma sessão de teste com pelo menos duas séries.
3. Finalize os dois com poucos segundos de diferença.
4. Abra o Samsung Health e aguarde o registro chegar ao Health Connect.
5. Volte ao TreinoApp.
6. A sessão correspondente deve ser associada automaticamente quando a confiança for >=78%.
7. Em Diagnosticar Health, confirme que os horários do TreinoApp e do Samsung Health aparecem próximos e que existe uma porcentagem de correspondência.

## 3. Detalhes da sessão

1. Abra Histórico.
2. Toque em `Detalhes` em uma sessão vinculada ao relógio.
3. Confirme: início/fim, duração, séries, volume e PRs.
4. Confirme: origem Health, confiança, FC média/máxima/mínima e calorias.
5. Confirme que o gráfico de FC aparece quando houver amostras.
6. Informe uma FC máxima em Mais > Health Connect e confirme a exibição das zonas.
7. Confirme a seção de resposta cardiovascular por exercício e a indicação de que é uma aproximação por bloco temporal.
8. Se houver treino anterior comparável, confira a comparação de volume, duração, densidade, FC e calorias.

## 4. Progresso

1. Abra Progresso.
2. Localize Performance / Health Connect.
3. Confirme métricas de 30 dias e gráfico das sessões sincronizadas.

## 5. Compartilhamento

1. No detalhe de uma sessão sincronizada, toque em compartilhar.
2. Confirme que o cartão mostra dados do treino e, quando disponíveis, FC, kcal e origem Health.
3. Salve a imagem e confirme que aparece em `Pictures/TreinoApp` / Galeria.
4. Use Compartilhar e confirme que a folha de compartilhamento Android abre com o PNG.

## 6. Relatório para personal

1. Gere o relatório HTML.
2. Confirme o arquivo em `Downloads/TreinoApp`.
3. Abra o arquivo e confirme a seção `Galaxy Watch / Health Connect`.
4. Confirme o resumo de 30 dias e a tabela de sessões sincronizadas.
5. Teste `Gerar e Compartilhar` e confirme o arquivo anexado na folha de compartilhamento.

## 7. Gravação no Health Connect

Use `Gravar pelo TreinoApp` apenas numa sessão em que você não queira associar o registro do relógio, para não gerar duplicidade. A sessão deve usar horários válidos e não deve mais falhar por perda dos timestamps.

## 8. Regressão Android

Teste novamente:

- timer de descanso;
- ações `-15s`, `Pular`, `+30s`;
- notificação persistente;
- tela apagada durante o descanso;
- widget;
- sessão avulsa;
- PDF, CSV e backup;
- armazenamento Android protegido;
- atualização sem perda de dados.
