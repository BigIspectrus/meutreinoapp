# Teste Android — v12.8.0 Beta

Faça backup antes e instale sobre a Beta atual, sem desinstalar. Mesmo pacote e assinatura; sem migração de schema Room ou mudança das metas manuais.

## Cardio e passos

- Início → Movimento do dia → Cardio & passos. Abrir também por Histórico → Evolução & Health → Cardio & passos.
- Revisar permissões no Health Connect: exercícios, passos, calorias ativas e totais. Acesso ao histórico antigo é opcional e solicitado só quando suportado.
- Negar passos ou calorias: o app deve continuar funcionando e indicar a permissão/dado ausente, sem inventar zero.
- Finalizar caminhada, corrida, corrida na esteira, bicicleta e bicicleta ergométrica no Galaxy Watch; aguardar Samsung Health → Health Connect; tocar Atualizar Health.
- Conferir modalidade, origem, data/horário, minutos exatos e kcal. Calorias são da origem da sessão e do intervalo correspondente, não um campo de calorias embutido na sessão. Calorias ativas têm prioridade; totais no intervalo são identificadas. Sem calorias: “não informadas”.
- Conferir passos de hoje e média do período. A média ignora hoje e dias sem dados; zero real retornado pelo Health é válido. Passos usam a agregação do Health Connect, não a soma manual de registros de apps diferentes.
- Atualizar duas vezes: não duplicar cardios. Sessões coincidentes de mesmo tipo em fontes diferentes são unificadas conservadoramente, priorizando Samsung Health. Sessões consecutivas/tipos diferentes devem continuar separados.
- Testar 7/30/90 dias e cada modalidade. Mais de 10 cardios: Ver todos mostra o restante. Kcal com cobertura parcial devem indicar quantas sessões forneceram kcal.
- Sem acesso ao histórico antigo, nova leitura cobre 28 dias e o aviso aparece; dias anteriores já salvos continuam disponíveis. Falha de leitura mantém os dados anteriores e avisa que a atualização é parcial.
- Virada do dia/fuso horário: passos de hoje precisam corresponder à data local; mudar o fuso invalida o cache para reler com a nova divisão de dias.

## Evolução

- Conferir gráficos de peso, passos, minutos/kcal de cardio, kcal consumidas e três macros. Filtros 7/30/90 dias compartilhados com Cardio & passos.
- Dias sem refeições ou peso ficam em branco, não em zero. Hoje aparece no gráfico, mas não na média de dias completos.
- Peso manual existente tem prioridade sobre a medida em cache do Health. O gráfico de peso original continua disponível abaixo.
- Metas manuais não mudam e as kcal do cardio não aumentam automaticamente a meta de alimentação.
- Fazer backup e conferir `healthActivityCacheV128` no arquivo; testar restauração em ambiente de teste.

## Widget Android

- Adicionar/redimensionar o widget na tela inicial. Widget compacto mantém alimentação e botões; widget maior também mostra estatísticas semanais.
- Registrar, editar e apagar refeição: kcal/macros de HOJE precisam atualizar. Alterar uma refeição de ontem não pode contaminar o widget de hoje.
- “Adicionar refeição” deve abrir o registro de hoje com o tipo de refeição sugerido pelo horário; testar com app fechado e já aberto em um dia antigo.
- Durante treino ativo, usar o botão de refeição e voltar ao treino: séries, descanso e cronômetro devem ser preservados.
- Virada do dia com app fechado: o launcher atualiza aproximadamente a cada 30 minutos (sujeito ao Android); ao redesenhar, nunca mostrar ontem como hoje. Abrir o app/registrar refeição atualiza imediatamente.
- “Iniciar/Abrir treino” continua funcionando. Conferir texto com fonte ampliada e widgets compactos; se o launcher mantiver o tamanho antigo, redimensionar.

## Regressões

- Treino, pausa, descanso, ações do relógio, notificações e sincronização de FC/peso continuam como antes.
- Alimentos comuns, medidas, receitas, backups e registros antigos preservados.
- Testes automatizados não substituem a verificação física de WebView, Room, launcher, permissões e dados reais do Samsung Health/Galaxy Watch.

## Referências de implementação

- [Agregação e prioridade das fontes](https://developer.android.com/health-and-fitness/health-connect/aggregate-data)
- [Leitura de dados e paginação](https://developer.android.com/health-and-fitness/health-connect/read-data)
- [Tipos de dados e permissões](https://developer.android.com/health-and-fitness/health-connect/data-types)
