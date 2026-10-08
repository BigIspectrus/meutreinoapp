# v12.9.0 — somente melhorias 1, 2, 3, 4, 7 e 9

## 1. Montagem de refeição persistente

Itens, composição dos alimentos, quantidades, data, refeição, horário e finalidade são guardados no armazenamento privado. Em Alimentação aparece Continuar/Descartar. Fechar a montagem a preserva; descartar exige confirmação. A gravação definitiva tem IDs estáveis para não repetir itens ao retomar uma montagem já registrada. Falha ao salvar mantém a montagem. O armazenamento do Android e os backups incluem o rascunho.

## 2. Porções habituais

Na seleção do alimento, use Guardar porção habitual e depois Usar minha porção. É uma preferência pessoal por alimento; não registra consumo sozinha. A prévia continua editável. Se a medida deixou de existir, usa o peso salvo e informa que deve ser revisado.

## 3 e 4. Aparelhos e alternativas favoritas

Configurações → Treinos → Exercícios e aparelhos, ou Notas do aparelho durante o treino. Anote regulagem do banco/apoio/pegada e selecione substitutos favoritos. Aparelho ocupado abre esses favoritos e prepara o fluxo de troca existente. Cada alternativa usa seu próprio histórico de carga.

Só pode substituir integralmente um exercício sem séries iniciadas/concluídas. Se já começou, o favorito é adicionado; o original permanece. Séries concluídas não podem ser escondidas por Pular; finalize parcialmente para preservar somente o que realizou. A rotina salva só muda pelo fluxo de confirmação já existente.

## 7. Planejamento alimentar

Em Alimentação → Planejar alimentação, escolha a data, monte alimentos ou use refeições prontas. Previsto e registrado são mostrados separadamente, com projeção e metas manuais existentes. Planos não entram no diário, Health Connect, widgets ou relatórios de consumo.

Registrar que comi pede confirmação, data real e horário até hoje. A operação prepara um estado de registro, grava o lote de alimentos de uma vez e usa IDs determinísticos para evitar duplicação. Um registro interrompido é identificado para revisão. Editar/remover um plano não apaga o consumo. Datas futuras em novas montagens são planejamento.

## 9. Séries semanais por músculo

Em Histórico → Evolução & Health → Séries por músculo, escolha a semana. Cadastre músculos principais/secundários no editor dos exercícios. Diretas e exposições indiretas são contadas separadamente; nenhuma ponderação automática é aplicada. Aquecimento, séries sem repetições e treino em andamento ficam fora.

Novos treinos concluídos com cadastro muscular guardam a classificação daquele momento. Registros sem classificação histórica usam o cadastro atual e são identificados. Exercícios ainda não mapeados aparecem para configuração; não inferimos músculos específicos apenas do grupo Peito/Costas/Pernas. Contagens podem se repetir entre músculos, conforme seu cadastro.

## Dados e entrega

Novas chaves opcionais: `nutritionMealDraftV1290`, `nutritionUsualPortionsV1290`, `nutritionPlansV1290`, `exerciseProfilesV1290`. Incluídas em JSON, snapshots e reset; pasta de backup permanece específica do aparelho. Campos adicionais de porção/classificação não exigem migração de Room; pacote e certificado existentes preservados.

APK `12.9.0-beta`, código `120900`. Apenas compilação e identidade/assinatura do arquivo, sem executar testes automatizados ou QA físico, mantendo a preferência do usuário. Nenhuma implementação de bisets, aplicação de progressão, lixeira, blocos, Wear OS, água ou medidas/fotos nesta entrega.
