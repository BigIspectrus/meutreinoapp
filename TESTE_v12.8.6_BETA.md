# Teste Android — v12.8.6 Beta — tópicos 7, 8 e 9

Faça backup e atualize sem desinstalar. Mesmo pacote/assinatura e schema Room. Nova leitura de distância é opcional e não é exigida para exercícios/FC/calorias.

## Peso

1. Evolução & Health → Evolução → Peso corporal: conferir medidas existentes e linha tracejada de 7 dias. Lacunas da linha de peso medido permanecem; mínimo duas medidas para tendência.
2. Conferir últimos 7 dias versus 7 anteriores, datas e quantidade de dias com medidas. Diferença entre médias só com pelo menos duas medidas em cada janela; sem dados = —, não zero kg.
3. Adicionar peso pelo fluxo existente e conferir gráfico atualizado. Registros locais válidos têm prioridade sobre cache Health no mesmo dia; histórico antigo pode conter peso importado e não identifica a origem.

## Metas manuais

1. Cardio & passos → Definir metas: inserir seus valores de passos/dia, minutos e sessões por semana. Não há recomendação nem preenchimento automático.
2. Salvar, fechar/reabrir e conferir valores. Deixar vazio desativa somente a meta correspondente. Valores inválidos não substituem metas anteriores.
3. Conferir progresso de segunda a domingo. Filtro de modalidade não muda metas/totais semanais (todas as modalidades); cache/incompletude são identificados. Sem consulta não aparece zero confirmado.
4. Conferir suas metas de kcal/macros, histórico, diário completo/parcial e treino ativo intactos. Backup/exportação/snapshot incluem `movementGoalsV1286`.

## Distância dos cardios

1. Usar Revisar permissões e, se desejar, autorizar leitura de Distância no Health Connect. Negar essa leitura não deve bloquear FC, calorias, passos ou sessões.
2. Finalizar caminhada/corrida/bicicleta no relógio e aguardar Samsung Health → Health Connect. Atualizar Health; conferir se a origem forneceu DistanceRecord compatível. Não existe leitura em tempo real nem GPS próprio.
3. Conferir km, km/h e, em caminhada/corrida/esteira, min/km. São valores derivados da distância registrada e do tempo total (incluindo pausas), não ritmo em movimento medido diretamente.
4. Fonte sem distância, registros sobrepostos, outro intervalo ou treinos concorrentes não geram estimativa. Cobertura abaixo de 95% aparece como parcial, sem velocidade/ritmo; isso é uma regra conservadora do app, não garantia de cobertura da fonte.
5. Conferir gráfico Distância dos cardios, contagem de sessões com cobertura suficiente e horários individuais. Ergométrica pode não oferecer distância ou oferecer distância virtual.
6. Falha ou permissão negada mantém valores anteriores identificados como salvos, sem marcá-los como nova medição. Uma leitura vazia bem-sucedida deve remover distância antiga naquele intervalo.

Testes automatizados cobrem os modelos/handlers, limites, lacunas, prioridade de pesos, cache, permissão negada e associação de registros. Testes Android simulados não confirmam disponibilidade/comportamento do Samsung Health ou do WebView/launcher real.

Tópico 10 NÃO implementado: aguardando nova autorização. Pendências físicas do tópico 4 permanecem no roteiro v12.8.3.
