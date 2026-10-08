# v12.9.1 — somente melhorias 1 e 8

## 1. Tipo de carga por exercício

Configurações → Treinos → Exercícios e aparelhos ou **Carga / aparelho** no treino. Escolha total, por halter, por lado ou assistência. Padrão anterior permanece “não definido”: não inferimos o padrão antigo pelos nomes dos exercícios e não convertemos o histórico.

Exemplos: halteres de 20 kg cada = 20 por halter; 30 kg de anilhas de cada lado = 30 por lado. Não presumimos dois halteres, peso da barra ou equivalência entre aparelhos. Volume registrado continua kg informados × reps e não representa necessariamente a soma das cargas físicas. Essa limitação aparece nos resumos/configuração. Assistência fica fora desse volume, dos PRs de carga e do e1RM; seu histórico específico mostra ajuda, reps e RIR/RPE, sem progressão automática.

Cada nova série da sessão recebe `loadSnapshot`; o rascunho guarda o tipo de todas as linhas, inclusive vazias. Rascunhos anteriores permanecem no padrão indefinido. Não se altera o tipo com séries iniciadas/concluídas. Antes de começar, trocar exige confirmar a limpeza das cargas/comparativos daquele exercício, mantendo repetições; nenhuma série histórica é regravada.

Preenchimento anterior, comparativos de carga, PRs avançados e gráficos/insights por exercício separam os padrões. Configurar outro tipo pode deixar o gráfico atual sem dados até registrar novas séries; dados anteriores permanecem no histórico, identificados pelo tipo. Edição de registros preserva o tipo salvo e aceita IDs textuais/numéricos e carga zero válida.

## 8. Metas semanais manuais de séries por músculo

Histórico → Evolução & Health → Séries por músculo · semana → **Definir minhas metas semanais**. Preencha mínimo/máximo de diretas e, se desejar, indiretas por músculo. Não há valores predefinidos. Campos vazios removem a meta; 0–0 é faixa explícita de zero. Limites precisam ser inteiros entre 0 e 999, com máximo ≥ mínimo.

Mostra contagem registrada, faixa, falta para o mínimo, dentro da faixa ou acima do máximo; não recomenda ajustes de treino. Músculos com metas aparecem mesmo sem séries. Diretas/indiretas não são somadas como equivalentes. Exercícios sem classificação tornam a contagem incompleta e aparecem para cadastro. Aquecimento e treino em andamento continuam excluídos.

Semanas passadas podem ser consultadas usando as metas atuais como referência, identificadas como não históricas. Não altera treinos/templates nem metas alimentares/de movimento.

## Dados e entrega

`exerciseProfilesV1290` recebe `loadMode`; histórico/rascunho recebem metadados opcionais; nova chave `muscleGoalsV1291` entra em JSON, importação, snapshots, backup externo e reset. Dados canônicos no armazenamento do app e backups; schema Room permanece 7, sem migrações ou reinterpretação do espelho antigo. Pacote e certificado existentes preservados.

Versão 12.9.1-beta, código 120901. Compilação, identidade e assinatura apenas; sem executar testes automatizados, navegador ou QA Android, conforme preferência do usuário. Nenhuma outra feature da lista foi implementada.
