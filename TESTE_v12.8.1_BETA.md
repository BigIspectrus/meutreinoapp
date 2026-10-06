# Teste Android — v12.8.1 Beta — tópico 1

Faça backup e instale sobre a Beta atual sem desinstalar. Mesmo pacote e assinatura; sem migração de schema ou novas permissões.

## Esforço informado e ausente

- Um treino com RIR 1 em uma série e outra série sem RIR deve mostrar média 1,0, não 0,5.
- RIR 0 preenchido é real e continua nas médias. RIR 0 + RIR 2 + uma série vazia deve mostrar média 1,0.
- RPE 8 numa série e outra sem RPE deve mostrar média 8,0, não 4,0.
- Se nenhuma série tiver RIR/RPE, médias devem aparecer como ausentes (—) ou não ser mostradas; não fabricar média zero.
- Conferir histórico por exercício, detalhes de sessão, resumo após associação Health e relatório mensal.
- A quantidade de séries com esforço informado deve ignorar campos vazios e valores inválidos, mas contar zero real.
- A queda de RIR entre primeira/última série só deve ser calculada quando ambos foram informados.
- Dados antigos/importados com campo não definido, `null`, vazio ou só espaços devem ser interpretados como ausentes sem regravar o histórico.

## Progressão e preservação

- Conferir sugestão num treino com faixa de repetições configurada, mantendo os contextos e demais regras anteriores. Ausência de RIR não deve ser interpretada como falha (RIR 0).
- RIR 0 real e RPE geral alto devem continuar influenciando a sugestão existente. Sugestões nunca são aplicadas automaticamente.
- Comparar backup antes/depois: a correção das análises não deve alterar valores de séries antigas ou metas.
- Fechar/reabrir e conferir rascunho/histórico, incluindo RIR 0 e RPE decimal.
- Regressão: treino, descanso, relógio, sincronização, alimentos, cardio, passos, gráficos e widget continuam como na v12.8.0.

Testes locais e CI não substituem o teste físico no Android. O tópico 2 (atualização individual de cada dado) ainda NÃO foi implementado; aguarda autorização.
