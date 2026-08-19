# Arquitetura Android v12.2

## Camadas

A interface continua em HTML/CSS/JavaScript empacotada pelo Capacitor. A mesma base possui runtime Web/PWA e runtime Android, mas recursos dependentes de plataforma são separados explicitamente.

`TreinoNativePlugin` é a ponte WebView -> Android. Timestamps usam conversão robusta para `Long`.

## Serviço de treino

`WorkoutForegroundService` mantém o estado mínimo da sessão fora da WebView, incluindo sessão, início, pausa, progresso e descanso.

## Health Connect

`HealthConnectRepository` trabalha com:

- `ExerciseSessionRecord`;
- `HeartRateRecord`;
- `TotalCaloriesBurnedRecord`;
- `WeightRecord`;
- `SleepSessionRecord`;
- `RestingHeartRateRecord`;
- `HeartRateVariabilityRmssdRecord`;
- `BodyFatRecord`;
- `LeanBodyMassRecord`.

Dados opcionais somente aparecem quando a origem os fornece e quando a permissão correspondente foi concedida.

### FC por série

Cada série concluída possui `completedAt`. A camada Web cruza esse instante com amostras de FC da sessão associada. Para recuperação, procura:

- FC mais próxima do término;
- pico em até 20 s;
- FC próxima de +30 s, +60 s e +90 s.

Se outra série for concluída antes da janela desejada, aquela medida de recuperação é descartada para reduzir contaminação pelo próximo esforço.

O cálculo é descritivo e não diagnóstico.

## Room

Banco: `treinoapp_native.db`.

Schema 1: sessão e séries.

Schema 2: campos detalhados do vínculo Health e amostras de FC.

Schema 3: `rir` e `rpe` em `workout_sets`.

Migrações:

- `MIGRATION_1_2`;
- `MIGRATION_2_3`.

Não existe migração destrutiva.

## Planejamento

`weeklyPlanV12` armazena o template associado a cada dia da semana. Ele alimenta Dashboard, Agenda e widget.

## Recovery

`getRecoverySnapshot()` lê uma janela de até 28 dias para sono/FC repouso/HRV e a última composição corporal disponível. Um cache Web de 15 minutos reduz consultas repetidas.

## Runtime Android

No APK:

- PWA/Service Worker ficam desativados;
- GitHub Releases é o canal de atualização;
- armazenamento, arquivos, compartilhamento, galeria e notificações seguem APIs Android;
- componentes exclusivamente Web são ocultados.
