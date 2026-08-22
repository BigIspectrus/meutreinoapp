# Changelog v12.5.1 Beta

## Catálogo e praticidade

- inclui 597 alimentos da TACO 4ª edição em catálogo offline;
- adiciona busca explícita no Open Food Facts e no USDA FoodData Central;
- identifica a fonte em cada resultado e exige revisão antes de importar;
- adiciona leitura nativa de códigos de barras no APK e consulta do produto no Open Food Facts;
- permite chave USDA pessoal opcional, mantida somente no aparelho, com `DEMO_KEY` como alternativa limitada;
- mantém cache local temporário das consultas online e não faz busca a cada tecla.

## Receitas e refeições

- permite cadastrar várias medidas caseiras e converter automaticamente para gramas;
- cria receitas por ingredientes, peso final e número de porções;
- calcula kcal e macros da receita inteira, por 100 g e por porção;
- salva uma refeição completa do diário como refeição pronta reutilizável;
- mantém snapshots dos ingredientes e itens para não alterar registros antigos.

## Dados e Android

- inclui receitas e refeições prontas no backup JSON e no espelho nativo;
- eleva o Room ao schema 6 com migração explícita `MIGRATION_5_6`;
- eleva o schema Web a 17;
- adiciona o plugin oficial `@capacitor/barcode-scanner` e permissão de câmera;
- mantém proibida qualquer migração destrutiva e preserva todos os dados da v12.5.0.
