# v12.10.0 — somente itens 1, 6, 10, 11 e 14 da última lista

## 1. Controles inferiores para uma mão

Ativos por padrão durante o treino. Configurações → Treinos → Controles para uma mão permite voltar à interface anterior. A barra mostra exercício/série, carga/reps e a ação atual: iniciar, concluir, próximo exercício, finalizar ou retomar. Durante o descanso, mostra contador e ±15 s. Opções inferiores mantêm pausa/retomada, desfazer última série, adição/troca de exercício e ferramentas existentes.

Os campos alteram os inputs originais e usam o mesmo salvamento de rascunho. Ações reutilizam início preciso, conclusão, descanso e encerramento existentes, sem um segundo motor de treino. Botão verifica sessão, linha e ação para impedir aplicar um toque desatualizado depois de uma ação do relógio. Mudança de série durante digitação interrompe o foco anterior; não transporta a carga digitada para outra linha. Barra é recolhida em modais/editores e considera as áreas seguras e viewport do teclado. Rest-inline e barra antiga não ficam duplicados na tela de treino; fora dela os controles existentes permanecem.

Não altera o histórico, a duração configurada, notificações, sincronização Health nem presume FC em tempo real. Conferência física de teclado, navegação gestual e tamanhos de fonte fica com o usuário.

## 6. Evolução contextual e revisão do plateau

Evolução & Health → Evolução contextual. Compara sessões, não apenas dias, do mesmo exercício cadastrado, tipo de série e padrão de carga. Aquecimento/assistência e registros numéricos/data inválidos não entram. Compara posições e quantidade de séries, carga, repetições e um campo comum de RIR ou RPE; ausência não vira zero.

“Registros estáveis” exige quatro sessões com séries/cargas/reps/esforço iguais e uma métrica de esforço comum à janela inteira. Não é diagnóstico de plateau. Mais repetições mantendo carga/esforço, por exemplo, não gera o aviso antigo baseado apenas em carga máxima. Mudanças conflitantes são apresentadas sem conclusão; pouca cobertura vira dados insuficientes. Não mistura RIR de uma comparação com RPE de outra para emitir estabilidade.

Nenhuma recomendação automática de carga, descanso ou deload. Identificações de aparelhos físicos diferentes sob o mesmo nome ainda dependem do cadastro do usuário; perfis por academia não fazem parte desta seleção.

## 10. Leitura local de rótulos

Alimentação → Meus alimentos → Cadastrar lendo o rótulo. Fotografar abre a câmera do Android; Escolher imagem abre o seletor do sistema, sem leitura ampla da galeria. Modelo latino ML Kit embarcado, sem precisar baixar o modelo na primeira leitura. Imagem capturada fica temporariamente em cache específico e é removida ao terminar/cancelar a leitura quando o callback retorna; nenhuma imagem é incluída nos backups ou enviada a um serviço de OCR. Perda do processo pode deixar temporário no cache administrado pelo Android.

Decodificação limitada a 2048 px e correção de orientação. Leitura retorna texto e linhas; organização geométrica propõe linhas da tabela. Usuário escolhe coluna 1/2, base 100 g/porção e peso da porção quando necessário. Propostas de kcal/P/C/G/fibra/sódio podem ser editadas; %VD é descartado, kJ não é usado como kcal, saturadas/trans não são confundidas com gordura total, unidades g/mg são normalizadas. Separadores ambíguos e campos não reconhecidos exigem conferência/preenchimento.

Rótulo por 100 mL não é convertido automaticamente para 100 g. Não estima nutrientes pela foto da comida. Quatro campos principais exigem números explícitos, inclusive zero, e confirmação de revisão antes de transferir ao cadastro normal. A última tela ainda pede nome e salvamento manual. Cancelar ou ler não cadastra alimentos, não altera metas e não registra consumo. Fibras/sódio opcionais vazios seguem a normalização existente para zero, com aviso explícito de que ausência de informação não comprova ausência do nutriente.

A extração depende de foco, reflexos, resolução e layout do rótulo. Câmera/permissões e leitura real precisam de validação no celular; não foram testadas aqui.

Referências: https://developers.google.com/ml-kit/vision/text-recognition/v2/android e https://developer.android.com/media/camera/camera-intents

## 11. Atalhos alimentares por refeição

Na montagem, antes da busca, até seis alimentos mais usados em cada refeição nos últimos 90 dias. Frequência conta dias em que o alimento foi registrado naquela refeição; planejamentos futuros não entram. Prioriza porção habitual quando existente, senão a última quantidade daquela refeição. Somente alimentos/receitas ainda disponíveis no catálogo pessoal/comum aparecem.

O toque seleciona/prepara o item na montagem existente para revisão, sem gravar consumo. Alimento já na montagem é selecionado, sem adicionar outra cópia nem trocar sua quantidade atual. Nenhuma nova chave de consumo; metas e porções pessoais existentes preservadas.

## 14. Lixeira

Configurações → Dados → Lixeira. Exclusões novas de séries/sessões, rotinas e alimentos registrados recebem uma cópia **antes** de remover a origem. Se a preparação falhar por espaço ou dados inválidos, a exclusão é bloqueada. Falha depois da preparação conserva a cópia e os IDs podem ser reconciliados ao restaurar. Guarda datas, quantidades, valores e demais metadados sem recalcular macros ou tipos de carga.

Retenção de 30 dias contados da exclusão. Cópias expiradas/restauradas são limpas na próxima exclusão; cópias expiradas não têm recuperação pela UI. Restaurar insere somente IDs ausentes, sem sobrescrever registros existentes. Repetir a restauração não duplica itens, inclusive após interrupção entre gravação da origem e marcador da lixeira. Conclusões alimentares são reavaliadas pelo mecanismo existente e o espelho de séries Android é atualizado em fila. Não apaga dados do relógio. Backups anteriores podem conter cópias independentemente da lixeira.

Excluir cópia/Esvaziar exige confirmação. Reset de todos os dados não passa pela lixeira; alimentos do catálogo, receitas/planejamentos e snapshots não foram incluídos como novas categorias de exclusão protegida. Não recupera exclusões feitas antes desta versão.

## Dados e entrega

Novas chaves opcionais `recycleBinV12100` e `oneHandModeV12100`, incluídas em JSON, importação, snapshots, backup externo e reset. Dados existentes não são migrados/reinterpretados. Room permanece schema 7; pacote Beta e chave de assinatura mantidos. Única biblioteca nova é o modelo local de texto; a permissão de câmera já existia e é solicitada para a ação escolhida.

Versão 12.10.0-beta, código 121000. Processo de entrega: compilar web/Android, gerar APK assinado e conferir identidade/assinatura/arquivos. Sem executar testes automatizados, navegador, instalação ou QA físico, mantendo a preferência do usuário. Nenhum outro item da lista foi implementado.
