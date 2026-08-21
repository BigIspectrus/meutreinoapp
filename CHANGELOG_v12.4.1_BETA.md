# Changelog v12.4.1 Beta

## Feedback personalizado

- adiciona “Como foi seu treino” no topo dos detalhes da sessão;
- combina volume, duração, RIR/RPE, RPE geral, descanso exato, contexto e FC já sincronizada;
- compara com até cinco sessões anteriores do mesmo treino;
- usa sobreposição de exercícios como alternativa quando não existe um template correspondente;
- mostra confiança alta, média ou limitada e lista os dados que sustentam a leitura;
- diferencia falta de FC, poucas janelas limpas e pouca base histórica sem inventar conclusões;
- sugere manter ou ampliar descanso apenas para a sessão seguinte, sem depender de FC em tempo real;
- identifica possível fadiga pela estabilidade de carga, queda de repetições e tendência de RIR;
- torna sugestões de progressão mais cautelosas quando houve esforço extremo, fadiga, desconforto, sono ruim ou estresse;
- recolhe gráficos, tabelas e métricas técnicas para reduzir poluição visual;
- inclui o resumo curto na imagem compartilhável sem voltar a limitar exercícios.

## Galaxy Watch

- publica o aviso com `NotificationManagerCompat`, preservando os metadados destinados ao Wear OS;
- adiciona `bridgeTag` explícita;
- usa um identificador de descarte único em cada aviso para evitar reaproveitar uma notificação já dispensada;
- cria canais v3 de alta importância para não herdar comportamento imutável dos canais anteriores;
- adiciona o botão “Testar” em Preferências para publicar um aviso sem iniciar treino;
- mantém a entrega dependente da permissão do TreinoApp Beta no Galaxy Wearable.

## Compatibilidade

- Health Connect permanece pós-treino;
- Room permanece no schema 4 e o schema Web permanece 15, pois não há novo campo persistente;
- histórico antigo e fluxo sem RIR, FC ou horários exatos continuam válidos.
