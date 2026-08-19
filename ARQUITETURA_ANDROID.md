# Arquitetura Android v12.1

## Interface

A UI principal continua em HTML/CSS/JavaScript, empacotada pelo Capacitor. A mesma base é publicada como PWA no GitHub Pages.

## Ponte nativa

`TreinoNativePlugin` faz a comunicação WebView -> Android. Parâmetros temporais como `startedAt`, `startMs`, `endMs`, `targetStartMs` e `targetEndMs` são lidos por uma rotina própria que aceita qualquer `Number` ou string numérica e converte para `Long`.

Isso evita perda de timestamps em milissegundos e é essencial para:

- associação Health;
- gravação no Health Connect;
- persistência no Room;
- sincronização em segundo plano.

## Serviço de treino

`WorkoutForegroundService` mantém fora da WebView o estado mínimo da sessão:

- sessão atual;
- início e pausa;
- exercício/série atual;
- séries concluídas;
- fim do descanso.

A notificação permanente mostra duração ou contagem regressiva. Durante o descanso oferece `-15s`, `Pular` e `+30s`.

## Health Connect

`HealthConnectRepository` trabalha com:

- `ExerciseSessionRecord`;
- `HeartRateRecord`;
- `TotalCaloriesBurnedRecord`;
- `WeightRecord`.

A associação compara início, fim, duração e sobreposição temporal. Correspondências com confiança >= 0,78 podem ser vinculadas automaticamente. Resultados intermediários podem ser apresentados para confirmação manual.

Ao vincular uma sessão, são preservados os metadados Health e métricas fisiológicas. Para a frequência cardíaca, o repositório também pode ler as amostras do intervalo da sessão e reduzir a quantidade de pontos antes de entregá-las à camada web.

A camada web usa esses dados para:

- detalhes da sessão;
- gráfico de FC;
- zonas de FC;
- comparação de sessões;
- análise aproximada por exercício;
- painel de performance;
- imagem compartilhável;
- relatório HTML.

Os dados do Galaxy Watch normalmente seguem o fluxo Galaxy Watch -> Samsung Health -> Health Connect -> TreinoApp.

## Room

O banco `treinoapp_native.db` mantém sessões e séries, além do vínculo Health.

A v12.1 usa Room schema 2. A migração 1 -> 2 adiciona de forma não destrutiva:

- `healthMinHr`;
- `healthStartMs`;
- `healthEndMs`;
- `healthTitle`;
- `healthExerciseType`;
- `healthSampleCount`;
- `healthSamplesJson`.

Nunca habilitar `fallbackToDestructiveMigration()` no banco principal.

## Reconciliação de dados antigos da Beta

Versões anteriores podiam gravar horários nativos inválidos devido à leitura por `getDouble()`. Ao detectar o novo schema web, a v12.1 reconstrói no Room as sessões recentes usando o histórico web, recuperando início/fim válidos para novas tentativas de sincronização.

## Stable x Beta

- Stable: `com.treinoapp.app`
- Beta: `com.treinoapp.beta`

Os dois aplicativos podem coexistir. Seus dados e permissões são independentes por design.
