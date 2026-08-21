# TreinoApp v12.4.1 Beta — Feedback Personalizado de Treino

TreinoApp funciona como PWA no GitHub Pages e como aplicativo Android via Capacitor. A variante Beta pode coexistir com a Stable.

## Identidade

- Stable: `com.treinoapp.app`
- Beta: `com.treinoapp.beta`
- Versão: `12.4.1`
- versionCode: `120401`
- Android: compile/target API 36, minSdk 26
- Room: schema 4, somente migrações explícitas

## Treino e execução

- serviço nativo de treino em primeiro plano;
- notificação persistente com duração/progresso;
- descanso nativo com `-15s`, `Pular` e `+30s`;
- widget com sessão ativa e treino planejado do dia;
- modo de treino focado, com um exercício e uma série em destaque;
- séries concluídas e futuras compactas, com avanço automático;
- sessão avulsa usando o mesmo motor do treino montado;
- tipos avançados de série;
- preferência de esforço por RIR, RPE, ambos ou oculto;
- rascunho automático incluindo RIR/RPE;
- início opcional da série para medir descanso real sem quebrar o fluxo antigo;
- RPE geral, contexto do dia e anotação opcional no encerramento;
- padrões leve, médio, longo ou desativado para o aviso de descanso;
- notificação descartável e espelhável para relógios pareados;
- progressão de carga sugerida, nunca aplicada automaticamente.

## Galaxy Watch / Health Connect

O fluxo esperado é Galaxy Watch -> Samsung Health -> Health Connect -> TreinoApp.

A associação usa horários de início/fim, duração e sobreposição. Timestamps atravessam WebView/Kotlin/Room como `Long`, evitando perda de precisão.

Quando uma sessão é vinculada, o TreinoApp preserva:

- ID e origem do registro Health;
- horário do relógio;
- confiança da associação;
- FC média, máxima e mínima;
- calorias estimadas pela origem;
- amostras de FC reduzidas para visualização;
- duração monitorada.

## Detalhes avançados do treino

A tela de detalhes combina dados do TreinoApp com os dados fisiológicos do relógio:

- resumo inicial em linguagem simples, sem score opaco;
- comparação com até cinco sessões do mesmo treino ou com exercícios semelhantes;
- confiança alta, média ou limitada acompanhada dos dados que sustentam a leitura;
- feedback de esforço, fadiga, recuperação e orientação para a próxima sessão;
- recomendações de progressão condicionadas por RIR/RPE, fadiga e contexto registrado;
- métricas, gráficos e tabelas recolhidos para reduzir poluição visual;

- gráfico de FC com marcadores das séries;
- linha do tempo série x FC;
- FC próxima ao fim da série;
- pico nos primeiros segundos após a série;
- FC aproximada em +30 s, +60 s e +90 s;
- queda de FC durante a recuperação quando a janela não é contaminada pela série seguinte;
- RIR e RPE;
- zonas de FC quando o usuário informa FC máxima pessoal;
- resposta cardiovascular aproximada por exercício;
- comparação com sessão anterior;
- PRs de carga, repetições, volume de série e e1RM;
- sugestão de progressão por faixa de repetições/RIR;
- histórico avançado por exercício com gráfico de carga e e1RM.

As medidas série a série são aproximações temporais. Elas não são apresentadas como diagnóstico ou medida clínica.

## Recovery

A aba Recuperação usa dados disponíveis no Health Connect:

- último sono e média de 7 dias;
- FC de repouso atual, média 7 dias e média 28 dias;
- HRV RMSSD atual, média 7 dias e média 28 dias;
- peso;
- percentual de gordura;
- massa magra;
- carga recente de treino;
- queda média de FC aos 60 segundos em séries mensuráveis.

O TreinoApp não cria um "readiness score" opaco. Os componentes são exibidos separadamente e com aviso de que possuem múltiplos determinantes.

## Agenda

- planejamento semanal por template;
- calendário mensal com dias treinados e treinos planejados;
- treino planejado do dia na tela inicial;
- widget usa o treino planejado quando não há sessão ativa.

## Interface

- Início prioriza o próximo treino e recolhe evolução/conquistas;
- navegação inferior com Início, Treinar, Histórico e Mais;
- Histórico reúne Sessões e Evolução & Health;
- Mais organiza treinos, preferências, Health, dados e aplicativo por categoria;
- durante a sessão, cabeçalho e navegação saem de cena para ampliar o espaço útil;
- ações de pausar e finalizar permanecem fixas e acessíveis.

## Android x Web/PWA

No APK:

- Service Worker/PWA não são usados;
- atualização é via GitHub Releases;
- notificações são gerenciadas pelo Android;
- downloads, compartilhamento e galeria usam APIs nativas;
- armazenamento é identificado como privado do Android;
- cartão de instalação PWA é ocultado;
- "reparar app" recarrega os assets empacotados, sem tentar manipular Service Worker.

Na versão Web/PWA, os fluxos de navegador permanecem disponíveis.

## Dados

- histórico Web é a base funcional principal;
- Room mantém espelho nativo de sessões/séries;
- Room schema 4 adiciona contexto da sessão e horários precisos via `MIGRATION_3_4`;
- `fallbackToDestructiveMigration()` continua proibido;
- backup JSON inclui vínculos Health, plano semanal, cache de Recovery e preferências de aviso.

Antes de promover para Stable, execute `TESTE_v12.4.1_BETA.md`.
