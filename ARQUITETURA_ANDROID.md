# Arquitetura Android v12

## Interface

A UI principal continua sendo HTML/CSS/JavaScript, empacotada pelo Capacitor. A mesma base também é publicada como PWA.

## Camada nativa

`TreinoNativePlugin` é a ponte entre JavaScript e Android.

### Serviço de treino

`WorkoutForegroundService` mantém o estado mínimo necessário fora da WebView:

- sessão atual;
- início e pausa;
- exercício/série atual;
- número de séries concluídas;
- fim do descanso.

A notificação permanente mostra duração ou contagem regressiva. Durante descanso oferece `-15s`, `Pular` e `+30s`.

## Health Connect

`HealthConnectRepository` lê:

- ExerciseSessionRecord;
- HeartRateRecord;
- TotalCaloriesBurnedRecord;
- WeightRecord.

Também pode gravar sessão de musculação e peso quando autorizado.

A associação automática compara início/fim e sobreposição temporal. Confiança >= 0,85 é vinculada automaticamente. Resultados intermediários permanecem pendentes para confirmação no aplicativo. Se após um período não houver sessão externa correspondente e a gravação estiver habilitada, o TreinoApp pode registrar sua própria sessão no Health Connect.

Os dados do Galaxy Watch normalmente chegam ao Health Connect por intermédio do Samsung Health, desde que a sincronização correspondente esteja habilitada no telefone.

## Room

O banco `treinoapp_native.db` mantém um espelho nativo de sessões e séries. O JSON/armazenamento web continua sendo preservado nesta primeira etapa para compatibilidade com a v11. Em versões futuras o Room pode se tornar a fonte principal, com migrações explícitas.

Nunca habilitar `fallbackToDestructiveMigration()` no banco principal.

## Stable x Beta

- Stable: `com.treinoapp.app`
- Beta: `com.treinoapp.beta`

Como os packages são diferentes, podem coexistir no mesmo aparelho. Os dados são separados por design.
