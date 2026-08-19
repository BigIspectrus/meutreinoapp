# TreinoApp v12.1.0 Beta

VersionCode: `120100`
Build: `2026.08.18.7`

## Health Connect

- Corrigida a perda de timestamps grandes na ponte JavaScript/Kotlin.
- `startMs`, `endMs`, `startedAt` e alvos de diagnóstico deixam de depender de `getDouble()`.
- Associação automática mantém limiar de confiança de 78%.
- Leitura detalhada de sessão inclui FC média, máxima, mínima, calorias e amostras de frequência cardíaca.
- Associação manual busca os detalhes completos do registro antes de persistir o vínculo.
- Sincronização em segundo plano salva as mesmas métricas detalhadas.
- Sessões antigas recentes da Beta são remapeadas para o Room com horários reconstruídos a partir do histórico web.

## Banco nativo

- Room atualizado do schema 1 para 2.
- Migração 1 -> 2 não destrutiva.
- Novos campos Health na entidade de sessão.
- Sem `fallbackToDestructiveMigration()`.

## Detalhes do treino

- Novo botão `Detalhes` no Histórico.
- Página/modal de sessão com dados da musculação e do relógio.
- Gráfico de frequência cardíaca ao longo da sessão.
- FC média, máxima e mínima.
- Calorias e duração monitorada.
- Origem dos dados e confiança do vínculo.
- Zonas de FC configuráveis a partir da FC máxima pessoal.
- Estimativa de FC média/máxima por bloco de exercício.
- Comparação com a sessão anterior equivalente.
- Volume, séries, duração, densidade e PRs no mesmo contexto.

## Progresso

- Novo painel de performance dos últimos 30 dias.
- Sessões sincronizadas, kcal, FC média, tempo total, volume e densidade.
- Gráfico das últimas sessões com FC média e calorias.

## Compartilhamento e relatório

- Imagem compartilhável de uma sessão específica.
- O cartão inclui FC média/máxima, calorias, origem Health e confiança quando disponíveis.
- Sparkline de FC quando existirem amostras.
- Relatório HTML para personal inclui resumo Health de 30 dias e tabela das últimas sessões vinculadas.
- Salvamento/compartilhamento Android continua usando as rotas nativas adicionadas na v12.0.2.

## Backup

- Backup JSON passa a incluir vínculos Health, amostras de FC, configuração de FC máxima e preferências de sincronização.
- Snapshots internos restauram as mesmas configurações.
