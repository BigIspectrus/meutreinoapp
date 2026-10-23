# v12.10.2 Beta — Widget visual e atalho por texto

## Visual

- Fundo azul-petróleo em degradê, contorno discreto, tipografia com hierarquia e data no cabeçalho.
- Kcal em destaque, meta manual e saldo para a meta, sem classificar comida como boa/ruim ou descontar kcal de exercícios.
- Anel de progresso nos tamanhos com espaço; em espaços menores usa indicador horizontal ou resumo compacto.
- Cartões P/C/G azul, verde e âmbar, com gramas (até uma casa decimal), meta e barras independentes.
- Ao passar da meta, a barra/anel permanece cheio, mas quantidades reais e kcal além da meta não são limitadas.
- Sem meta positiva não calcula percentuais. Sem dados atualizados da data atual usa “—” em vez de fingir consumo zero.
- Números são TextViews, não texto desenhado no gráfico, com descrição de conteúdo e ajuste de fonte. Anel desenhado nativamente em bitmap pequeno (192×192), sem biblioteca gráfica extra/serviço remoto/animação contínua.

## Tamanhos e ações

- Layouts responsivos em duas larguras e faixas de altura; Android anterior à API 31 usa as dimensões informadas pelo launcher.
- Considera a escala de fonte para reduzir detalhes; não força anel em área insuficiente. “Sempre compacto” e “Mostrar macros” continuam por widget.
- Alimentação tem dois botões: “＋ Alimento” (fluxo manual existente) e “✎ Por texto” (entrada da refeição inteira).
- Combinado separa as ações alimentares dos atalhos de treino/movimento. Ao encolher prioriza alimentação; painéis secundários aparecem ao ampliar.
- Widget de Alimentação novo tem tamanho inicial maior (4×4); widgets existentes podem precisar ser ampliados manualmente pelo usuário.
- Widgets Treino e Movimento continuam disponíveis e com suas leituras/ações existentes.

## Integração e dados

- Resumo web agora envia as três metas de macros ao widget, além da meta de kcal; atualização nativa pelo Room com o app fechado também lê essas mesmas metas existentes.
- Apenas cache do widget: sem migração ou alteração de entradas/metas do banco.
- Atalho tem PendingIntent próprio e abre a tela de texto com aplicativo frio ou já aberto. O texto só registra após ação explícita do usuário.
- Nova montagem usa hoje; se há montagem pendente, preserva/retoma em vez de descartar. Se for de outra data, mostra aviso persistente para conferir a data.
- Se já existe outra janela de edição, pede fechá-la antes de abrir a entrada por texto para não perder campos em edição.
- Atualizações usam os mesmos gatilhos do app e atualização periódica já existentes. Não promete atualização instantânea nem leitura de relógio em tempo real.
- Pacote/assinatura Beta preservados; sem permissões, dependências ou custos novos.

## Verificação e limites

Compilar JavaScript/assets, recursos Android e APK assinado; conferir pacote, versão e certificado. Não executar testes automáticos, renderizações simuladas ou testes no Android, conforme preferência anterior do usuário. A aparência real, os tamanhos disponibilizados pelo launcher e o atalho com app fechado/em memória dependem da conferência física no celular. Não declarar aprovação visual antes disso.

Referências oficiais usadas para a implementação:

- [Layouts responsivos de widgets](https://developer.android.com/develop/ui/views/appwidgets/layouts).
- [RemoteViews e setImageViewBitmap](https://developer.android.com/reference/android/widget/RemoteViews).
