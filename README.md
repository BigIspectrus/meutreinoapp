# TreinoApp v12.9.0 Beta — Refeições persistentes, planejamento e aparelhos

TreinoApp funciona como PWA no GitHub Pages e como aplicativo Android via Capacitor. A variante Beta pode coexistir com a Stable.

## Identidade

- Stable: `com.treinoapp.app`
- Beta: `com.treinoapp.beta`
- Versão: `12.9.0`
- versionCode: `120900`
- Android: compile/target API 36, minSdk 26
- Room: schema 7, somente migrações explícitas

## Melhorias v12.9.0 — somente itens 1, 2, 3, 4, 7 e 9 da nova lista

- montagem de refeição guardada automaticamente e retomável, com data/horário/finalidade e snapshots dos alimentos;
- porções habituais pessoais, preenchimento explícito e revisão antes do consumo;
- anotações por exercício/aparelho e alternativas favoritas pelo fluxo de troca existente, preservando séries já realizadas;
- planejamento alimentar em armazenamento separado; projeções não viram consumo. Confirmação real grava um único lote com IDs estáveis;
- séries por músculo/semana: mapeamento manual principal/secundário, aquecimento excluído, histórico sem mapeamento identificado e snapshots nas novas sessões;
- todos os novos dados entram em backup/importação/snapshots/reset, sem alteração de pacote, certificado, metas manuais ou schema Room;
- detalhes em `NOTAS_v12.9.0_BETA.md`. Compilação apenas, sem testes por preferência do usuário.

## Correções v12.8.9

- usa áreas seguras de SystemBars em todos os controles de borda e acompanha a altura real do cabeçalho do treino, sem assumir 65 px para posicionar a segunda barra;
- resumo de kcal/Prot/Carb/Gord por refeição, visível com a refeição fechada;
- snapshot opcional `serving` com quantidade/medida original e peso por medida; preservado em registros, cópias, refeições prontas e backups;
- registros antigos mostram equivalência aproximada quando a referência é única. Valores de consumo e metas existentes não são recalculados pela exibição;
- edição em gramas ou medida e rodapé de refeição compacto;
- sem testes por solicitação/preferência do usuário. Compilação apenas; detalhes em `NOTAS_v12.8.9_BETA.md`.

## Backup e painel v12.8.8 — tópicos 13 e 14

- pasta escolhida pelo Storage Access Framework, com permissão persistente; nenhum acesso amplo adicional ao armazenamento;
- espelho JSON privado com escrita atômica, atualizado após mudanças dos dados. WorkManager grava a última cópia preparada em intervalos de 12h/24h/7 dias, inclusive com app fechado, conforme disponibilidade do Android;
- cópias externas imutáveis com nomes únicos, gravação manual, status de captura/gravação, histórico recente e erro de pasta/permissão visível;
- retenção opcional apenas para versões automáticas rastreadas na pasta atual; todas são preservadas por padrão e cópias manuais nunca entram na limpeza;
- compartilhamento/importação JSON entre aparelhos, preferências do painel e rascunho incluídos. Pasta/permissões são específicas do aparelho e não entram no JSON;
- seleção e ordem dos cartões, destinos início/detalhes/oculto, opção de padrão, salvamento/cancelamento; registros de treino e alimentação não são alterados ao organizar a apresentação;
- tópicos 11 e 12 descartados por pedido explícito. Build sem testes nesta entrega, conforme solicitação do usuário; somente compilação e identidade do APK. Validação no Android fica com ele;
- detalhes de uso e limitações em `NOTAS_v12.8.8_BETA.md`.

Referências: [pastas e permissão persistente](https://developer.android.com/training/data-storage/shared/documents-files), [execução periódica](https://developer.android.com/develop/background-work/background-tasks/persistent/getting-started/define-work).

## Widgets v12.8.7 — tópico 10 de 14

- quatro entradas no seletor do launcher: Alimentação, Treino, Movimento e Combinado; o provider antigo é preservado como Combinado;
- modo, compactação e macros persistidos por ID do widget; múltiplas instâncias são independentes. Configuração em ⋮ ou Configurações → App → Widgets da tela inicial;
- configuração nativa opcional na inclusão, reconfigurável; resultado CANCELADO até salvar, ID/provider verificados, cancelamento mantém opções anteriores;
- atalhos para iniciar/retomar treino, adicionar refeição de hoje e abrir Cardio e passos; PendingIntents distintos por ID e ação;
- RemoteViews responsivos no Android 12+, fallback por tamanho nas versões anteriores, detalhes reduzidos em áreas pequenas e com fontes maiores;
- movimento espelha passos do dia, minutos/sessões da semana e as metas manuais já definidas. Mostra dados salvos e horários reais de consulta; ausência não vira zero, e datas/semana/fuso anteriores não são reutilizados como período atual;
- widgets atualizados após leitura Health, alteração de metas, registro de alimentação e mudanças da sessão. O refresh do launcher lê alimentação de Room; movimento mostra o espelho salvo pelo app. A periodicidade do launcher pode ser adiada pelo Android;
- sem nova permissão Health, leitura contínua ou alteração do banco/dados alimentares. Nenhum registro em tempo real do Galaxy Watch é presumido;
- remoção apaga apenas configurações da instância; restauração do launcher migra opções dos IDs antigos para os novos. Backup JSON não transfere a posição dos widgets entre aparelhos;
- testes Android de modos, tamanho, isolamento, atalhos, datas, ausência/zero, permissão e restauração; medição de layout com gráficos nativos do Robolectric e previews PNG publicados junto aos testes; teste web do espelho e roteiro físico em `TESTE_v12.8.7_BETA.md`;
- parar antes do tópico 11 (água), conforme plano autorizado.

Referências oficiais: [configuração de widgets](https://developer.android.com/develop/ui/views/appwidgets/configuration), [layouts responsivos e tamanhos](https://developer.android.com/develop/ui/views/appwidgets/layouts).

## Peso e movimento v12.8.6 — tópicos 7, 8 e 9 de 14

- tendência móvel de 7 dias corridos em Evolução/Peso, no mínimo duas medidas; gráfico medido preserva lacunas, sem inventar pesagens;
- comparação dos últimos 7 dias com os 7 anteriores, quantidade de dias medidos e diferença entre médias somente com duas ou mais medidas por janela;
- registro local válido tem prioridade sobre o cache Health no mesmo dia. Histórico local antigo também pode conter peso importado, portanto não atribuímos origem manual a todo ele;
- metas opcionais manuais de passos/dia, minutos e sessões de cardio/semana; semana segunda–domingo, todas as modalidades independentemente do filtro, sem alterar metas alimentares;
- chave `movementGoalsV1286` incluída em backup/importação/snapshots/reset, sem migração de peso ou diário;
- leitura opcional `READ_DISTANCE` / `DistanceRecord`, paginada e filtrada por origens depois das consultas de calorias, com limite defensivo de 50 mil registros;
- soma apenas registros contidos na sessão, mesma fonte, sem sobreposição ou sessões concorrentes; não rateia registros diários nem usa GPS/rota;
- distância parcial identificada. Velocidade em km/h e ritmo min/km de caminhada/corrida/esteira só com cobertura de pelo menos 95% do intervalo e distância positiva; tempo total inclui pausas. Na ergométrica, distância pode ser virtual conforme a fonte;
- gráfico de km, cobertura das sessões e horários próprios de leitura. Falha/permissão negada mantém cache identificado; resposta vazia confirmada não reutiliza valor antigo; intervalo alterado não reaproveita distância;
- sem mudança de pacote, assinatura, schema Room ou permissões essenciais; única nova permissão é a leitura opcional de distância. FC/calorias e nutrição continuam independentes;
- testes em `scripts/test-movement.mjs`, `scripts/test-cardio-distance.mjs` e `CardioMathTest`; roteiro `TESTE_v12.8.6_BETA.md`;
- parar antes do tópico 10 (widgets configuráveis). Os testes físicos pendentes do tópico 4 e a validação da fonte Samsung Health continuam dependendo do usuário.

Referências oficiais: [tipos e permissão de distância](https://developer.android.com/health-and-fitness/health-connect/data-types), [leitura bruta e paginação](https://developer.android.com/health-and-fitness/health-connect/read-data).

## Conclusão alimentar v12.8.5 — tópico 6 de 14

- botão Concluir dia com confirmação explícita; Reabrir dia e reabertura automática quando o conteúdo dos alimentos muda;
- dias sem alimentos, datas futuras e registros antigos não são considerados completos nem consumo zero;
- médias semanais, aderência às metas manuais atuais, micros, comparação com treino e associações alimentares mensais usam somente dias completos;
- relação entre kcal de sete dias e peso exige sete dias consecutivos completos, inclusive quando a janela atravessa o mês;
- dias parciais permanecem no diário, listas e gráficos (pontos vazados e identificação no tooltip), mas ficam fora da média alimentar;
- treinos/RIR, peso e leituras Health continuam no relatório independentemente da conclusão alimentar;
- metadados compactos em `nutritionDayStatusV1285`, incluídos em backup, snapshots e reset; restaurar alimentação de backup antigo limpa conclusões incompatíveis;
- falha ao atualizar metadados não desfaz uma refeição já gravada; comparação com a composição detecta alteração mesmo nesse caso;
- sem migração de alimentos, alteração de metas, pacote, assinatura, permissões ou schema Room. Metadados de conclusão ficam no armazenamento privado do WebView e nos backups do app;
- testes dos handlers reais em `scripts/test-nutrition-days.mjs`; roteiro físico `TESTE_v12.8.5_BETA.md`;
- parar antes do tópico 7 (tendência de peso e comparação semanal). Testes físicos pendentes do tópico 4 continuam necessários.

## Montagem de refeição v12.8.4 — tópico 5 de 14

- escolher vários alimentos numa lista temporária, ajustar/remover cada item e acompanhar kcal/P/C/G antes de confirmar;
- um único salvamento do lote no diário, mantendo o formato existente de um registro por alimento e os fluxos de Room, Health Connect e widget;
- g, mL aproximados, medidas caseiras e receitas preservados; reescolher um alimento já incluído foca o item em vez de duplicá-lo;
- confirmação antes de descartar; falha ao salvar mantém toda a montagem para tentar novamente; duplo toque não repete o registro;
- rascunho apenas em memória: não é um registro permanente e não sobrevive ao encerramento/recarregamento do aplicativo;
- metas manuais, pacote, assinatura, permissões e schema Room inalterados;
- testes dos handlers reais em `scripts/test-meal-builder.mjs` e roteiro `TESTE_v12.8.4_BETA.md`;
- parar antes do tópico 6 (dia alimentar completo/parcial), que depende de nova autorização. A validação física do tópico 4 continua pendente.

## Preferências e testes v12.8.3 — tópicos 3 e 4 de 14

- seleção de modalidade, período 7/30/90, gráficos de atividade/rotina e gráfico/exercício/grupo de evolução persistida ao reabrir;
- valores validados, recuperação segura de preferência inválida e fallback quando um exercício já não existe;
- chave `activityPreferencesV1283` incluída em exportação, importação, snapshots e reset, sem modificar metas, treinos ou horários de leitura;
- testes Node de preferências e restauração dos handlers reais;
- testes Android em ambiente Robolectric 4.17 (dependência somente de teste), incluindo RemoteViews/SharedPreferences, refeições de ontem, atalho sem reset do treino, Room e reabertura do banco;
- resultados Android publicados no GitHub Actions separadamente do APK;
- testagem física de instalação, launcher, restrições de bateria e Samsung Health/Galaxy Watch ainda depende do usuário. Ambiente simulado não representa teste realizado no aparelho real;
- roteiro `TESTE_v12.8.3_BETA.md`; parar antes do tópico 5, conforme autorização e plano.

Referência da infraestrutura de teste: [Robolectric](https://robolectric.org/getting-started/).

## Atualização individual v12.8.2 — tópico 2 de 14

- passos, kcal ativas, kcal totais, sessões de cardio e kcal de cada sessão recebem horário/status próprios de consulta;
- horário indica a leitura pelo app, não a medição nem a sincronização do relógio;
- preservação de valores e horários anteriores em falha, indisponibilidade ou permissão negada, com identificação visível de dados salvos;
- falha de kcal de uma sessão não marca as outras como antigas; intervalo alterado não reutiliza kcal do intervalo anterior;
- consultas parciais, dados fora da janela, zero real e resposta vazia válida são diferenciados;
- dados legados sem horário individual confiável permanecem assim até nova consulta, sem carimbar o horário atual;
- avisos nos cartões, início, lista e gráficos, com painel recolhido de detalhes por leitura;
- metadados permanecem no cache existente, incluído nos backups; sem mudança de schema Room ou permissões;
- testes em `scripts/test-activity-freshness.mjs` e roteiro `TESTE_v12.8.2_BETA.md`;
- etapa entregue antes da implementação das preferências, preservada nesta versão.

## Correção de esforço v12.8.1 — tópico 1 de 14

- RIR/RPE ausente (`null`, campo não definido, vazio ou só espaços) não entra nas médias como zero; zero real continua válido;
- regra comum aplicada à progressão, histórico por exercício, resumo pós-treino, fadiga, cobertura de esforço e relatório mensal;
- payloads de sincronização nativa preservam a distinção entre ausência e zero, sem regravar o histórico web;
- nenhuma mudança em schema, permissões, metas manuais, pacote, assinatura ou recursos de cardio/widget;
- testes reais dos handlers em `scripts/test-effort.mjs`, incluindo preservação dos registros, strings numéricas e registros antigos incompletos;
- roteiro físico: `TESTE_v12.8.1_BETA.md`. Lista completa e ordem das próximas etapas: `PLANO_EVOLUCAO_APK.md`;
- primeira entrega da sequência aprovada pelo usuário; demais tópicos seguem o protocolo em `PLANO_EVOLUCAO_APK.md`.

## Cardio, passos e widget v12.8

- área Cardio & passos no Início e em Evolução & Health: caminhada, corrida, esteira, bicicleta e bicicleta ergométrica do Health Connect;
- passos de hoje e média de dias completos com dados, sem confundir dado ausente com zero;
- sessões paginadas, sincronização incremental sem duplicação, origem visível, filtros de modalidade/período e lista completa;
- calorias ativas da origem/intervalo da sessão preferidas; gasto total do intervalo identificado quando usado como alternativa, sem somar ao gasto diário nem modificar metas de alimentação;
- gráficos de peso, passos, tempo/kcal de cardio, kcal consumidas e macros com 7/30/90 dias, lacunas para dias sem registros e preservação dos gráficos originais;
- acesso a passos/calorias ativas e histórico antigo opcionais; sem histórico, leitura nova limitada a 28 dias, mantendo o cache já lido e incluído em backups;
- widget com kcal/metas manuais e P/C/G consumidos HOJE, botão de refeição independente e acesso ao treino; atalho abre registro de hoje sem reiniciar sessão ativa;
- atualização do widget ao editar alimentação e pelo launcher aproximadamente a cada 30 minutos; adaptação ao tamanho e leitura do espelho Room com app fechado;
- sem alteração de schema Room, assinatura ou identidade do aplicativo. Health Connect depende dos dados disponibilizados pelo Samsung Health, após sincronização, não em tempo real.

Validação: `npm run validate`, `npm run test:ui`, `:app:testBetaDebugUnitTest` e roteiro `TESTE_v12.8.0_BETA.md`. A instalação, permissões, dados reais e widget no Galaxy precisam de teste físico.

Referências: [agregação Health Connect](https://developer.android.com/health-and-fitness/health-connect/aggregate-data), [leitura e paginação](https://developer.android.com/health-and-fitness/health-connect/read-data).

## Interface móvel v12.7

- navegação por ícones vetoriais locais e seleção identificada para acessibilidade;
- nova hierarquia, cores nos três temas, campos e alvos de toque confortáveis;
- início com uma ação que prioriza sessão ativa, rascunho, planejamento e última rotina;
- rotinas com resumo de grupos/séries, última sessão e busca sem acentos;
- carga/repetições lado a lado, detalhes de série sob demanda e opções em painel inferior;
- volta ao início sem reconstruir a sessão; descanso no fluxo, com contador tocável no cabeçalho;
- metas manuais mais legíveis, refeições recolhidas com estado lembrado e abertura após novos registros;
- histórico resumido, séries/filtros/comparativos sob demanda;
- painéis inferiores com fechamento, foco de teclado e suporte a movimento reduzido;
- sem mudança de permissões Android, assinaturas, IDs de pacote ou schema de dados.

Validação: `npm run validate`, `npm run test:ui` e roteiros `TESTE_v12.7.0_BETA.md` / `TESTE_v12.7.1_BETA.md`.

## Banco comum v12.7.1

- 57 alimentos disponíveis diretamente no diário e nas receitas, mesmo sem internet;
- 54 composições da TACO 4ª edição (NEPA/UNICAMP), mais leites líquidos e macarrão cozido da TBCA (USP/FoRC/BRASILFOODS);
- pão de queijo assado com opções pequeno (25 g) e grande (50 g), ambas aproximações editáveis;
- leites integral/desnatado líquidos em mL, com equivalência aproximada de 1 mL ≈ 1 g, conforme as medidas de referência da TBCA;
- cru/cozido e líquido/pó explicitamente separados; busca por palavras, sem acentos, com aliases populares;
- cadastros pessoais têm prioridade; cópia salva apenas ao usar/editar, sem migração ou sobrescrita do histórico;
- os itens TACO 457/458 têm macros ausentes na fonte original (`*`); o catálogo usa os registros completos TBCA BRC0070G/BRC0044G, identificando a fonte, sem corrigir automaticamente registros pessoais antigos;
- medidas caseiras estimadas pelo aplicativo não são medidas oficiais TACO. Pese o alimento ou confira o rótulo quando precisar de mais precisão;
- fontes e configuração em `web/data/common-foods-config.json`; asset gerado por `scripts/build-common-foods.mjs` durante o build;
- TBCA BRC0070G usa a amostra Vigor; BRC0044G é média de amostras; BRC0116A é macarrão cozido/drenado sem óleo/sal. Valores de referência não substituem o rótulo de outra marca.

Fontes: [TACO / UNICAMP](https://nepa.unicamp.br/taco/), [leite desnatado TBCA](https://www.tbca.net.br/base-dados-en/int_food_composition.php?cod_produto=BRC0070G), [leite integral TBCA](https://www.tbca.net.br/base-dados-en/int_food_composition.php?cod_produto=BRC0044G), [macarrão cozido TBCA](https://www.tbca.net.br/base-dados-en/int_food_composition.php?cod_produto=BRC0116A).

## Alimentação

- metas diárias de kcal, proteína, carboidratos e gorduras definidas somente pelo usuário;
- diário por café da manhã, almoço, jantar e lanches;
- alimentos próprios cadastrados por 100 g ou porção;
- catálogo TACO com 597 alimentos brasileiros disponível offline;
- busca online no Open Food Facts e USDA FoodData Central, sempre com a fonte visível;
- leitura nativa de código de barras no APK;
- medidas caseiras personalizadas com conversão para gramas;
- receitas por ingredientes, rendimento e porções;
- refeições completas salvas para reutilização;
- valores opcionais de fibras e sódio;
- 18 micronutrientes opcionais nos alimentos, receitas, registros e metas manuais;
- micronutrientes importados da TACO, Open Food Facts e USDA quando a fonte os fornece;
- importação em lote por JSON com mesclagem segura, sem apagar cadastros existentes;
- favoritos, alimentos recentes e busca local;
- cópia de uma refeição do dia anterior;
- atalhos horizontais para alimentos recentes/favoritos e refeições prontas;
- cópia opcional de todo o dia anterior, preservando os registros atuais;
- ferramentas e resumo semanal recolhidos para manter o diário mais leve;
- totais diários e média dos últimos sete dias registrados;
- histórico imutável por snapshot: editar ou excluir um alimento não altera refeições antigas;
- funcionamento offline, inclusão no backup JSON e espelho Room no APK.
- sincronização nutricional opcional e independente com o Health Connect;
- relatório mensal de alimentação, peso, recuperação, volume, RIR/RPE e associações exploratórias.

## Treino e execução

- serviço nativo de treino em primeiro plano;
- notificação persistente com duração/progresso;
- descanso nativo com `-15s`, `Pular` e `+30s`;
- widget com sessão ativa e treino planejado do dia;
- modo de treino focado, com um exercício e uma série em destaque;
- séries concluídas e futuras compactas, com avanço automático;
- somente o exercício atual permanece aberto; o indicador superior alterna para uma visão geral tocável;
- descanso com identificação da próxima série e ação “Iniciar agora”;
- janela segura para desfazer a última série concluída;
- sessão avulsa usando o mesmo motor do treino montado;
- tipos avançados de série;
- preferência de esforço por RIR, RPE, ambos ou oculto;
- rascunho automático incluindo RIR/RPE;
- início opcional da série para medir descanso real sem quebrar o fluxo antigo;
- RPE geral, contexto do dia e anotação opcional no encerramento;
- padrões leve, médio, longo ou desativado para o aviso de descanso;
- notificação descartável e espelhável para relógios pareados;
- ação “Iniciar série” no aviso de fim do descanso do Galaxy Watch, com confirmação e sincronização durável do horário no celular;
- testes separados de encaminhamento do aviso e do botão do relógio, sem alterar treinos reais;
- progressão de carga sugerida, nunca aplicada automaticamente.
- criação de exercício com nome e grupo muscular sem sair do treino em andamento;
- inclusão após o exercício atual ou substituição temporária de um aparelho ocupado;
- parâmetros próprios de séries, repetições, descanso e incremento para o exercício inserido;
- identificação visual de exercícios planejados, adicionados e substitutos na visão geral;
- reordenação da sessão, desfazer seguro e restauração integral pelo rascunho automático;
- atualização do treino pré-montado somente após confirmação ao finalizar a sessão.

## Galaxy Watch / Health Connect

O fluxo esperado é Galaxy Watch -> Samsung Health -> Health Connect -> TreinoApp.

A associação usa horários de início/fim, duração e sobreposição. Timestamps atravessam WebView/Kotlin/Room como `Long`, evitando perda de precisão.

Quando uma sessão é vinculada, o TreinoApp preserva:

- ID e origem do registro Health;
- horário do relógio;
- confiança da associação;
- FC média, máxima e mínima;
- calorias estimadas pela origem;
- amostras de FC reduzidas para visualização;
- duração monitorada.

## Detalhes avançados do treino

A tela de detalhes combina dados do TreinoApp com os dados fisiológicos do relógio:

- resumo inicial em linguagem simples, sem score opaco;
- comparação com até cinco sessões do mesmo treino ou com exercícios semelhantes;
- confiança alta, média ou limitada acompanhada dos dados que sustentam a leitura;
- feedback de esforço, fadiga, recuperação e orientação para a próxima sessão;
- recomendações de progressão condicionadas por RIR/RPE, fadiga e contexto registrado;
- métricas, gráficos e tabelas recolhidos para reduzir poluição visual;

- gráfico de FC com marcadores das séries;
- linha do tempo série x FC;
- FC próxima ao fim da série;
- pico nos primeiros segundos após a série;
- FC aproximada em +30 s, +60 s e +90 s;
- queda de FC durante a recuperação quando a janela não é contaminada pela série seguinte;
- RIR e RPE;
- zonas de FC quando o usuário informa FC máxima pessoal;
- resposta cardiovascular aproximada por exercício;
- comparação com sessão anterior;
- PRs de carga, repetições, volume de série e e1RM;
- sugestão de progressão por faixa de repetições/RIR;
- histórico avançado por exercício com gráfico de carga e e1RM.

As medidas série a série são aproximações temporais. Elas não são apresentadas como diagnóstico ou medida clínica.

## Recovery

A aba Recuperação usa dados disponíveis no Health Connect:

- último sono e média de 7 dias;
- FC de repouso atual, média 7 dias e média 28 dias;
- HRV RMSSD atual, média 7 dias e média 28 dias;
- peso;
- percentual de gordura;
- massa magra;
- carga recente de treino;
- queda média de FC aos 60 segundos em séries mensuráveis.

O TreinoApp não cria um "readiness score" opaco. Os componentes são exibidos separadamente e com aviso de que possuem múltiplos determinantes.

## Agenda

- planejamento semanal por template;
- calendário mensal com dias treinados e treinos planejados;
- treino planejado do dia na tela inicial;
- widget usa o treino planejado quando não há sessão ativa.

## Interface

- Início prioriza o próximo treino e recolhe evolução/conquistas;
- navegação inferior com Início, Treinar, Alimentação, Histórico e Mais;
- Histórico reúne Sessões e Evolução & Health;
- Mais organiza treinos, preferências, Health, dados e aplicativo por categoria;
- durante a sessão, cabeçalho e navegação saem de cena para ampliar o espaço útil;
- o cabeçalho fora da sessão adapta título e contexto à área atual;
- o timer só ocupa o cabeçalho quando está realmente ativo;
- ações de pausar e finalizar permanecem fixas e acessíveis, com o exercício atual no rodapé.

## Android x Web/PWA

No APK:

- Service Worker/PWA não são usados;
- atualização é via GitHub Releases;
- notificações são gerenciadas pelo Android;
- downloads, compartilhamento e galeria usam APIs nativas;
- armazenamento é identificado como privado do Android;
- cartão de instalação PWA é ocultado;
- "reparar app" recarrega os assets empacotados, sem tentar manipular Service Worker.

Na versão Web/PWA, os fluxos de navegador permanecem disponíveis.

## Dados

- histórico Web é a base funcional principal;
- Room mantém espelho nativo de sessões/séries e dos dados de alimentação;
- Room schema 6 adiciona fontes, medidas, receitas e refeições prontas por `MIGRATION_5_6`, preservando os schemas anteriores;
- `fallbackToDestructiveMigration()` continua proibido;
- backup JSON inclui vínculos Health, plano semanal, cache de Recovery, preferências de aviso e todos os dados de alimentação.

Antes de promover para Stable, execute `TESTE_v12.5.2_BETA.md`.
