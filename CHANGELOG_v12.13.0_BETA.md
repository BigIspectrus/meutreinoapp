# TreinoApp v12.13.0 Beta — registros compactos e ações do exercício

Implementa os itens 1, 2, 3 e 9 da última lista aprovada e as ações adicionais solicitadas para o treino em andamento. Mesma assinatura e pacote Android Beta; código `121300`.

## Alimentação

- Quantidade e unidade diretamente nos resultados da busca, com entrada de vários alimentos na mesma montagem. Campos em branco não adicionam alimentos; quantidades inválidas em itens já preparados impedem o registro. Digitar prepara a montagem, não grava consumo. A confirmação final continua registrando a refeição inteira em uma única operação.
- Pesquisa rápida ativada por padrão, com opção de retornar ao modo detalhado. Resultados limitados a 40 por busca para manter o painel leve; refinar o nome quando necessário. Quantidades já digitadas ficam na montagem ao mudar a busca.
- Montagem em lista compacta: nome, quantidade, unidade e kcal/macros, com edição direta e acesso aos detalhes pelo nome. Cada linha preserva o snapshot próprio de nutrientes e medidas. Registros existentes no diário não são alterados por editar uma montagem.
- Gramas, medidas cadastradas e mL somente quando existe referência de conversão. mL é o padrão rápido para os alimentos que oferecem essa unidade. Receitas continuam usando seus próprios rendimentos/medidas. Porções repetidas do mesmo alimento são editadas individualmente na montagem, sem somá-las silenciosamente.
- Renderização por chave de item, mantendo os campos enquanto se digita. Tecla Próximo/Enter avança entre quantidades visíveis. As alterações usam o mesmo rascunho persistente já incluído no backup.

## Treino

- Um botão **Ações** por exercício substitui a exposição permanente de Histórico/Pular no cabeçalho. Na folha de ações: substituir, adicionar série, pular/reativar uma série, detalhes da série, histórico e pular/reativar o exercício. Mantém as demais ferramentas existentes nas seções recolhidas.
- **Substituir exercício** abre busca por nome/grupo, priorizando favoritos e o mesmo grupo muscular. Confirmar pela ação fixa no rodapé. É possível criar um substituto informando nome e grupo na mesma folha.
- Sem séries concluídas, o original fica marcado como substituído na sessão. Com séries concluídas, somente as pendentes são puladas e substituídas; as concluídas permanecem no original. A quantidade inicial do substituto corresponde às pendentes. O novo exercício usa o próprio histórico/padrão de carga, sem copiar kg do aparelho anterior. A série em andamento exige confirmação antes da troca.
- A troca é guardada no rascunho e usa a ação Desfazer existente. Em trocas parciais, desfazer reativa apenas as séries puladas por aquela troca, preservando as que já estavam puladas antes. A remoção de um substituto com valores/séries preenchidos mantém a confirmação existente. Trocas parciais não oferecem conversão automática em um novo modelo permanente, para não transformar uma adaptação do dia em outra prescrição.
- **Pular série** não marca a série como concluída e não gera registro de peso/repetições/volume/PR. Mantém valores preenchidos para conferência. **Reativar** mantém valores e limpa o início/descanso da tentativa interrompida, exigindo novo início para medir o tempo corretamente. Séries concluídas não podem ser puladas; podem ser reabertas pelo controle existente.
- **Adicionar série** vale somente para a sessão atual, sem alterar o treino pré-montado. Preserva o padrão de carga e pode preencher carga/repetições a partir da última série não pulada; esforço e horários não são copiados. Limite de 30 séries por exercício.
- Quantidade adicional, séries puladas e exibição escolhida são restauradas com o treino. Progresso, próxima série, foco, registro final e resumo/ações nativas excluem séries puladas. Caso a série pulada seja o alvo do descanso, o aviso associado é encerrado para evitar iniciar uma série descartada pelo relógio. Não há geração de novo descanso apenas por pular/adicionar séries.
- Corrige a validação antiga de concluir série com carga zero: zero é permitido quando preenchido, com repetições inteiras positivas; campo vazio não equivale a zero.

## Tabela opcional e encerramento

- **Ações → Tabela** mostra série, carga, repetições, esforço conforme sua preferência RIR/RPE e conclusão em linhas compactas. O modo Foco continua disponível e é o padrão para uma nova sessão. Alternar usa os mesmos campos/valores; não cria uma cópia independente do treino. A escolha acompanha o rascunho.
- Botão ▶ inicia a série e mantém os horários reais; ✓ conclui pelo fluxo existente. Concluir sem iniciar permanece marcado como horário apenas de conclusão, sem inventar tempo de início. Detalhes/tipo de série continuam acessíveis em Ações. Tecla Próximo/Enter avança pelos campos numéricos visíveis. O controle inferior de uma mão e a barra auxiliar ficam ocultos na tabela para não duplicar campos.
- Revisão integrada à tela de encerramento mostra apenas pendências: séries incompletas, preenchidas mas não concluídas, em andamento e concluídas com valores inválidos. Cada aviso leva à respectiva série. RPE/contexto já digitados são mantidos em memória ao conferir uma pendência e voltar ao encerramento na mesma sessão.
- Séries inválidas concluídas bloqueiam o registro; pendências podem ser corrigidas ou o usuário pode escolher explicitamente registrar somente as concluídas válidas. A confirmação é reavaliada se a sessão/valores/horários mudarem. Séries puladas intencionalmente não aparecem como erro e são informadas no resumo final, sem contar como realizadas.

## Preparação e entrega

Compilação das fontes web e geração do APK assinado, com inspeção de versão, pacote, certificado e fontes embarcadas. Sem testes funcionais, automatizados, de interface ou no aparelho, conforme preferência estabelecida pelo usuário. O usuário avaliará especialmente a experiência do modo tabela no Android.
