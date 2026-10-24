# TreinoApp v12.12.0 Beta — biblioteca e conciliação de alimentos

A biblioteca comum offline passa de 57 para 173 alimentos: 116 novos itens. Inclui mais frutas e vegetais, patinho, sardinha, coxa e sobrecoxa de frango, queijos, cereais, farinhas, tofu, castanhas, tapioca simples, quinoa cozida e chia seca. Não adiciona cópias de IDs já presentes na seleção comum. O catálogo TACO completo continua acessível pela busca existente.

## Fontes

- [TACO / NEPA – UNICAMP, 4ª edição revisada e ampliada, 2011](https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf): 113 novos itens selecionados da base oficial já incluída no projeto. Mantém os valores originais por 100 g, sem recalcular energia a partir dos macros. A planilha oficial está em https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/Taco-4a-Edicao.xlsx.
- [TBCA / USP – FoRC – BRASILFOODS](https://www.tbca.net.br/), site na versão 7.3, consultado em 24/10/2026. Novas fichas em medidas caseiras: [BRC0906B, tapioca pronta sem manteiga/recheio](https://www.tbca.net.br/base-dados-en/int_food_composition.php?cod_produto=BRC0906B), [BRC0399A, quinoa cozida sem óleo/sal](https://www.tbca.net.br/base-dados-en/int_food_composition.php?cod_produto=BRC0399A) e [BRC0402A, chia seca](https://www.tbca.net.br/base-dados-en/int_food_composition.php?cod_produto=BRC0402A). Valores energéticos dessas fichas: 289, 114 e 443 kcal/100 g, respectivamente. A ficha estatística pode apresentar arredondamento diferente; não misturar essas duas apresentações. Quinoa e chia são dados de origem internacional compilados pela TBCA, não novas análises brasileiras.
- As três referências TBCA anteriores (leites e macarrão cozido) foram preservadas. A data de consulta não é a data das análises. A TACO permanece identificada como edição de 2011.
- Novos itens sem medida doméstica conferida usam gramas. Medidas existentes aproximadas e diferenças de marca/receita continuam sinalizadas. Carboidratos TBCA seguem a coluna de carboidrato total; na chia isso inclui fibras. Rótulos podem usar outra apresentação. Não converter mL em g sem referência.

## Conciliação

Em **Alimentação → Meus alimentos → Conciliar duplicados**, comparar alimentos importados anteriormente entre si e com o catálogo comum. A comparação mostra kcal, proteína, carboidrato, gordura, fibra, sódio e detalhes de micros/medidas por 100 g. O usuário escolhe a tabela completa para os próximos registros. Não se calculam médias, nem se completam micros com dados de outra tabela.

O botão **Unir equivalências seguras** aplica de uma vez apenas pares isolados: mesma identidade, marca compatível, composição semelhante e nenhuma outra correspondência na revisão. A tabela oficial conhecida é sugerida quando disponível; caso contrário, a tabela pessoal existente. Casos com marca ausente ou múltiplas alternativas continuam na revisão individual.

Novos lotes JSON conciliam automaticamente apenas uma correspondência inequívoca de identidade, marca e composição. Marca ausente, várias correspondências ou divergência nutricional deixam os itens separados para revisão. Códigos de barras não autorizam unir preparos ou variantes conflitantes. IDs reservados pelo catálogo, pelo histórico ou por uniões anteriores não são reutilizados para outro alimento.

Critério técnico de semelhança, não garantia de precisão analítica: energia difere no máximo 4% ou 2 kcal; macros no máximo 5% ou 0,25 g; fibra 10% ou 0,3 g; sódio 10% ou 5 mg. Considerar o maior limite absoluto/relativo, sempre por 100 g. Micros positivos compartilhados precisam concordar em até 15% ou 0,02 na unidade cadastrada. Nutrientes opcionais ausentes não significam zero medido. Nos registros legados sem metadados de presença, zeros opcionais sem fonte documentada são tratados como informação desconhecida. As tolerâncias não são usadas como arredondamento dos valores salvos.

Uma fonte oficial conhecida é sugerida para alimento genérico equivalente; sem referência verificável, manter a tabela pessoal existente. Marca de produto é preservada e diferenças entre marcas não são consolidadas. Mais casas decimais e fonte informada no JSON não garantem maior precisão. Rótulo conferido do produto específico pode ser mais adequado que a referência genérica.

Cada alteração cria snapshot de segurança antes de gravar. A lista de alimentos é gravada em uma única operação; erro de armazenamento mantém o conteúdo anterior. Originais e redirecionamentos ficam no próprio `nutritionFoodsV125`, já incluído nos backups e no espelho externo. Há **Desfazer união** enquanto a tabela resultante não foi editada; após edição, usar o snapshot anterior na área de segurança. Não altera a estrutura Room nem a versão do esquema de dados.

Não reescreve diário, metas, receitas, refeições prontas ou planejamentos. Valores e porções históricas permanecem nos snapshots originais. Atalhos agregam IDs conciliados, favoritos/uso recente são mantidos e porções habituais preservam gramas quando uma medida equivalente não está mais disponível. Conciliações ficam bloqueadas enquanto houver montagem de refeição aberta ou pendente, para não substituir tabelas/medidas sob uma edição em andamento.

## Entrega

Versão Android `12.12.0-beta`, código `121200`, mesmo pacote e assinatura Beta. Preparação/compilação e inspeção do pacote assinado; sem execução de testes funcionais, automatizados, de interface ou no Android, conforme preferência do usuário. A validação de uso no aparelho fica com o usuário.
