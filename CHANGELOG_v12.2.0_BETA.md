# Changelog v12.2.0 Beta

## Performance & Recovery

- RIR e RPE opcionais por série, com persistência em histórico, rascunho, CSV e Room.
- Room schema 3 com migração não destrutiva 2->3.
- Linha do tempo série x frequência cardíaca.
- FC próxima ao término, pico pós-série e amostras em +30/+60/+90 segundos.
- Cálculo de queda da FC aos 30/60/90 segundos quando a janela não conflita com uma nova série.
- Marcadores de séries no gráfico de FC.
- Comparação e contexto fisiológico mantidos na tela de detalhes.
- PRs avançados: carga, repetições, volume de série e e1RM.
- Sugestões de progressão por faixa de reps, incremento e RIR.
- Histórico avançado por exercício com gráfico de carga/e1RM.
- Resumo pós-treino inclui recuperação de FC quando mensurável.

## Recovery via Health Connect

- leitura opcional de sono;
- FC de repouso;
- HRV RMSSD;
- peso;
- gordura corporal;
- massa magra;
- comparação 7/28 dias;
- carga recente do treino e recuperação média de FC em séries mensuráveis;
- sem score de prontidão opaco.

## Planejamento

- agenda semanal por template;
- calendário mensal;
- treino planejado na tela inicial;
- widget usa o treino planejado do dia.

## Runtime

- correção definitiva do botão Detalhes por quoting seguro do handler dinâmico;
- cartão PWA ocultado no APK;
- diagnóstico Android não trata GitHub Pages como canal do APK;
- notificações descritas como permissões Android;
- reparo do APK não manipula caches/Service Worker;
- textos de armazenamento adaptados ao runtime.
