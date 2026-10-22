# v12.10.1 Beta — Montagem adaptável e refeição por texto

## Interface Android

- Montador em painel flexível com título/fechar no cabeçalho e guardar/salvar no rodapé, ambos fora do conteúdo rolável.
- Uma única rolagem vertical: listas de alimentos e itens montados não capturam uma segunda rolagem.
- Área útil respeita barras do sistema e mudanças do visualViewport (teclado/orientação), sem aplicar duas vezes o recuo inferior.
- Data, refeição e horário em grade adaptável; entradas com largura limitada e fontes de 16px.
- Resumo compacto de kcal/macros. Lista de itens, fonte/medidas, porções habituais e descarte ficam em detalhes expansíveis.
- Mantidos buscar/recentes/favoritos/receitas/alimentos comuns e cadastro manual. Após escolher um alimento, sua quantidade é trazida à área visível.

## Registro por texto

Entrada direta em Alimentação → “Registrar refeição por texto”, ou “Digitar refeição” no montador.

Exemplo:

    Café da manhã - 40g de whey, 30g de aveia, 70g de banana, 200mL de leite desnatado

- Aceita nome opcional da refeição no início, seguido de dois-pontos, traço ou quebra de linha. Sem nome, mantém a refeição selecionada.
- Um alimento por trecho, separados por vírgula, ponto e vírgula, linha ou “e” antes de uma nova quantidade. Vírgulas decimais são preservadas.
- Quantidades antes do alimento; g/kg/mL/L e medidas disponíveis no alimento, como unidades/fatias/colheres de sopa. Medidas sem equivalência cadastrada exigem revisão.
- Busca por nome/aliases/marca no catálogo pessoal, alimentos comuns offline e receitas; candidatos ordenados também pelo uso naquela refeição. Não há chamadas de IA ou envio do texto para reconhecimento remoto.
- Mais de um alimento plausível exige escolha, mesmo que um deles seja frequente. Não escolhe automaticamente uma variedade de banana ou marca de whey entre opções concorrentes.
- Revisão permite buscar/escolher alimento, corrigir quantidade/unidade, cadastrar alimento ausente, remover um item e desfazer essa remoção.
- Sem candidato, o usuário precisa cadastrar um alimento ou escolher um item existente. Não cria valores nutricionais por estimativa.
- mL/L só usam conversão de densidade já conhecida pelo catálogo; sem referência, pede medida/peso manual. Equivalências existentes continuam aproximadas e identificadas como tal.
- Ambiguidade de decimal/milhar com três casas pede confirmação numérica. Não elimina silenciosamente entradas que não entendeu.
- Limite explícito de 6.000 caracteres e 60 itens; fora dele não registra um subconjunto escondido.

## Persistência e proteção

- “Registrar por texto” é uma ação explícita: não registra enquanto digita. Se tudo for reconhecido, registra o lote; caso contrário, destaca pendências e só registra após resolvê-las.
- Usa o salvamento conjunto já existente do montador: uma escrita do conjunto no diário e IDs estáveis para impedir repetição de uma tentativa interrompida.
- Alimentos já na montagem são preservados. Se também houver itens digitados, pede confirmação para registrá-los juntos, mostrando as duas quantidades de itens.
- O texto bruto é salvo na mesma chave de rascunho, já incluída nos backups. Ao reabrir, a correspondência precisa ser conferida novamente; as escolhas da revisão intermediária não são persistidas.
- Não descarta texto pendente ao salvar no modo manual: direciona para revisão ou pede apagar o texto primeiro.
- Após transferir o texto à montagem, falha no salvamento mantém os itens montados para nova tentativa. Não reinterpreta o mesmo texto por cima deles.
- Repetições intencionais do mesmo alimento no texto preservam linhas/medidas separadas; editar um item usa sua chave, não apenas o ID do alimento.
- Planejamentos continuam separados do consumo. Datas futuras não passam a contabilizar kcal consumidas.
- Sem migração de banco nem alteração dos registros anteriores, metas manuais, pacote, assinatura, Health Connect ou ações de treino.

## Verificação

Compilação de JavaScript/assets e APK assinado, conferência de identidade/assinatura do artefato. Não executar testes automáticos, navegação simulada ou testes Android, mantendo a preferência do usuário. Ajuste visual real com teclado, fonte ampliada e barras do Galaxy depende da conferência no aparelho.
