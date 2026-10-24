# v12.11.0 Beta — Registro, navegação e cancelamento de treino

Escopo autorizado: itens de usabilidade 1–8 e 10–14. Item 9 (padronizar cores) expressamente excluído. Nenhuma das 30 features da lista anterior foi autorizada por este pedido.

## Treino: voltar, continuar, finalizar ou cancelar

- Botão visível “Voltar” no cabeçalho do treino. Guarda o rascunho e retorna ao início sem finalizar ou pausar implicitamente; o treino continua acessível pela ação de continuar.
- Retorno ao início consome a navegação do treino, evitando ciclo de voltar entre início e sessão.
- Integração Android por OnBackPressedDispatcher: primeiro fecha teclado; depois interface trata janelas, controles, visão geral/data, navegação entre abas/subabas e rolagem. Na raiz, coloca a Activity em segundo plano em vez de apagar estado ou finalizar o serviço.
- Opções do treino incluem voltar e cancelar. Cancelamento tem diálogo próprio, explicação da quantidade de séries e confirmação explícita quando há séries concluídas.
- Alternativa de finalizar e registrar apenas as séries concluídas usa o encerramento original, com contexto e confirmação de parcial.
- Antes de cancelar, exige gravação do rascunho atual. Se há séries concluídas, snapshot interno deve ser criado com sucesso; falha mantém o treino aberto.
- Cancela apenas a sessão em andamento e seu serviço/timer/avisos. Não chama o fluxo que grava treino no Room/Health Connect. Não remove sessões anteriores, ficha ou registros alimentares.
- Não comanda o Galaxy Watch/Samsung Health: uma atividade iniciada separadamente no relógio precisa ser encerrada nele.
- Confere parada do serviço antes de limpar o rascunho. Aguarda solicitação nativa de início em voo; verificações de sessão/cancelamento após permissão e em callbacks impedem reativação tardia.
- Bloqueio durante cancelamento, status da operação e tratamento de falha visível. Evita selecionar outro treino por cima de uma sessão ativa.
- Conclusão exige carga finita não negativa (0 permitido) e repetições inteiras positivas, incluindo os controles de uma mão. Sessão já presente no histórico não é registrada novamente.

## Mapeamento da lista de usabilidade

1. Ação principal: mantém o controle contextual inferior e esconde a duplicação de iniciar/concluir na série pendente enquanto esse controle está visível. No modo uma mão, carga/reps pendentes ficam concentradas no painel inferior, com ajuste −/+ da carga. Séries já concluídas continuam editáveis na própria série e a opção de interface anterior é preservada.
2. Verbos claros: “Guardar rascunho”, “Registrar refeição”, “Guardar planejamento”, “Continuar treino”, “Finalizar e registrar séries” e “Cancelar somente esta sessão” distinguem os efeitos.
3. Adição alimentar contínua: busca permanece acessível ao ajustar quantidade; “Conferir e continuar buscando” mantém o alimento na montagem, sem registrar consumo sozinho.
4. Edição direta: tocar no alimento do diário abre quantidade/unidade/prévia na própria lista; “Mais opções” mantém a edição completa. Carga/reps do treino permanecem diretamente editáveis.
5. Revisão por texto: itens resolvidos compactos, pendentes abertos e botão para conferir/recolher cada item; não precisa reabrir toda a refeição.
6. Estabilidade: atualização de revisão por chave preserva os controles ativos/cursor; editor rápido não é substituído por uma atualização concorrente da lista. Confere conflito no registro antes de gravar.
7. Navegação: voltar visível e Android, pilha interna limitada, restauração de rolagem e proteção de alterações não salvas nos principais editores (inclusive RPE/contexto da finalização).
8. Menos janelas: busca/quantidade/revisão no montador e correção rápida no diário, sem empilhar uma janela completa para cada ajuste comum.
9. NÃO IMPLEMENTADO: cores de módulos/macros/widget não foram uniformizadas; CSS novo usa a paleta existente.
10. Detalhes sob demanda: notas/aparelho/alternativas recolhidos; data do treino acessível pelo estado da sessão, sem ocupar uma coluna permanente no cabeçalho focado.
11. Feedback local: conclusão/reabertura de série, validação de campos e alimento mantido na montagem próximos do fluxo, sem toast novo em cada sucesso de série.
12. Fluidez: contexto visual agrupado por frame; gráficos de evolução/atividade não são reconstruídos quando suas telas estão ocultas. Sem alegação de medição de FPS ou melhoria quantitativa não testada.
13. Uma mão: controles inferiores e alvos de navegação confortáveis; manter opção de uma mão já existente, com cabeçalho/data e ações secundárias separados.
14. Estado/data: cabeçalho persistente mostra hoje/outra data e andamento/pausa; contexto informa rascunho e permite alterar a data. Montador informa data/refeição/planejamento ou consumo ainda não registrado. Novo treino inicia hoje; rascunho retomado preserva sua data.

## Persistência e compatibilidade

- Revisão alimentar (escolhas e quantidades corrigidas) passa a acompanhar o texto no mesmo rascunho e backup; ao retomar, alimentos/unidades são conferidos contra o catálogo atual.
- Editar quantidade escala os nutrientes já registrados e mantém unidade original quando disponível; não substitui o snapshot pelo catálogo atual. Preserva data, refeição e horário.
- Alterações alimentares usam os mesmos gatilhos de conclusão do dia, Room, Health e widget existentes.
- Sem novo schema, nova permissão ou dependência; pacote/assinatura preservados.
- Snapshot pré-cancelamento é completo, não uma lixeira seletiva de rascunhos. A restauração segue a interface de snapshots existente e sua retenção normal; não prometer restauração isolada da sessão.

## Verificação

Compilação de JavaScript/assets e recursos/código Android, geração do APK assinado e conferência de versão/pacote/certificado. Não executar testes funcionais/automáticos, simulações de navegação ou renderizações, conforme preferência anterior. Botão/gesto voltar, teclado, cancelamento com serviço ativo, instalação e comportamento visual precisam de conferência física no Android; não declarar aprovação desses casos sem teste.

Referência oficial: [navegação voltar com OnBackPressedDispatcher em Activity/WebView](https://developer.android.com/guide/navigation/navigation-custom-back).
