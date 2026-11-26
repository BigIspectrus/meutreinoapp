package com.treinoapp.wear

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.ServiceCompat
import androidx.health.services.client.ExerciseUpdateCallback
import androidx.health.services.client.HealthServices
import androidx.health.services.client.data.Availability
import androidx.health.services.client.data.BatchingMode
import androidx.health.services.client.data.DataType
import androidx.health.services.client.data.ExerciseConfig
import androidx.health.services.client.data.ExerciseLapSummary
import androidx.health.services.client.data.ExerciseTrackedStatus
import androidx.health.services.client.data.ExerciseType
import androidx.health.services.client.data.ExerciseUpdate
import com.treinoapp.watchlink.WorkoutSnapshot
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.guava.await
import kotlinx.coroutines.launch

internal enum class HealthMode { IDLE, STARTING, MEASURING, EXTERNAL, ENDED, ERROR }

internal data class WatchReadings(
    val sessionId: String = "",
    val mode: HealthMode = HealthMode.IDLE,
    val current: HeartReading? = null,
    val average: Double? = null,
    val kcal: Double? = null,
    val message: String = "",
)

class WatchHealthService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val exercise by lazy { HealthServices.getClient(this).exerciseClient }
    private var sessionId = ""
    private var ownsExercise = false
    private var callbackSet = false
    private var phoneAttached = false
    private var stopping = false
    private var sensorPaused = false
    private var lastSampleMs = -1L
    private var heartSum = 0.0
    private var heartSamples = 0

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (sessionId.isNotBlank()) return START_NOT_STICKY
        val current = PhoneWorkout.snapshot.value
        try {
            val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH else 0
            ServiceCompat.startForeground(this, NOTIFICATION, notification(), type)
        } catch (e: Exception) {
            if (current?.active == true) {
                readings.value = WatchReadings(current.sessionId, HealthMode.ERROR, message = "Permita os sensores para medir FC e kcal.")
            }
            stopSelf(startId)
            return START_NOT_STICKY
        }
        if (current == null || !current.active || !current.isFresh(System.currentTimeMillis()) ||
            current.sessionId != intent?.getStringExtra(SESSION_EXTRA) ||
            !hasPermission(heartPermission()) || !hasPermission(Manifest.permission.ACTIVITY_RECOGNITION)
        ) {
            ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
            stopSelf(startId)
            return START_NOT_STICKY
        }
        sessionId = current.sessionId
        readings.value = WatchReadings(sessionId, HealthMode.STARTING)
        PhoneWorkout.attach(this)
        phoneAttached = true
        scope.launch {
            try {
                startCollecting()
                if (stopping) return@launch
                while (!stopping) {
                    val synced = PhoneWorkout.snapshot.value
                    if (synced == null || !synced.active || synced.sessionId != sessionId) {
                        end(HealthMode.ENDED, "Medição encerrada.")
                        break
                    }
                    if (synced.ageAt(System.currentTimeMillis()) > WorkoutSnapshot.SENSOR_TIMEOUT_MS) {
                        end(HealthMode.ENDED, "Medição encerrada após perder a conexão.")
                        break
                    }
                    if (synced.paused != sensorPaused) {
                        if (synced.paused) exercise.pauseExerciseAsync().await() else exercise.resumeExerciseAsync().await()
                        sensorPaused = synced.paused
                    }
                    delay(1_000)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.d("TreinoWatch", "Medição do treino indisponível", e)
                end(HealthMode.ERROR, "Medição indisponível. Tente novamente.")
            }
        }
        return START_NOT_STICKY
    }

    private suspend fun startCollecting() {
        val capabilities = exercise.getCapabilitiesAsync().await()
        val type = listOf(ExerciseType.STRENGTH_TRAINING, ExerciseType.WEIGHTLIFTING, ExerciseType.WORKOUT)
            .firstOrNull { it in capabilities.supportedExerciseTypes }
            ?: error("Sem tipo de treino compatível")
        val supported = capabilities.getExerciseTypeCapabilities(type).supportedDataTypes
        val dataTypes = setOf(DataType.HEART_RATE_BPM, DataType.HEART_RATE_BPM_STATS, DataType.CALORIES_TOTAL)
            .intersect(supported)
        check(DataType.HEART_RATE_BPM in dataTypes)

        val status = exercise.getCurrentExerciseInfoAsync().await().exerciseTrackedStatus
        if (status == ExerciseTrackedStatus.OTHER_APP_IN_PROGRESS) {
            end(HealthMode.EXTERNAL, "Outro app está medindo. FC ao olhar a tela; kcal da sessão indisponíveis.")
            return
        }
        val owner = getSharedPreferences("sensor_session", MODE_PRIVATE)
        if (status == ExerciseTrackedStatus.OWNED_EXERCISE_IN_PROGRESS && owner.getString("id", "") != sessionId) {
            exercise.endExerciseAsync().await()
            end(HealthMode.ENDED, "Medição anterior encerrada. Toque para medir esta sessão.")
            return
        }
        exercise.setUpdateCallback(callback)
        callbackSet = true
        if (status != ExerciseTrackedStatus.OWNED_EXERCISE_IN_PROGRESS) {
            exercise.startExerciseAsync(ExerciseConfig(
                exerciseType = type,
                dataTypes = dataTypes,
                isAutoPauseAndResumeEnabled = false,
                isGpsEnabled = false,
                batchingModeOverrides = setOf(BatchingMode.HEART_RATE_5_SECONDS).intersect(capabilities.supportedBatchingModeOverrides),
            )).await()
        }
        ownsExercise = true
        owner.edit().putString("id", sessionId).apply()
        if (!stopping) readings.value = readings.value.copy(mode = HealthMode.MEASURING)
    }

    private val callback = object : ExerciseUpdateCallback {
        override fun onRegistered() = Unit
        override fun onRegistrationFailed(throwable: Throwable) { end(HealthMode.ERROR, "Sensores indisponíveis.") }
        override fun onLapSummaryReceived(lapSummary: ExerciseLapSummary) = Unit
        override fun onAvailabilityChanged(dataType: DataType<*, *>, availability: Availability) = Unit

        override fun onExerciseUpdateReceived(update: ExerciseUpdate) {
            if (stopping || !ownsExercise) return
            sensorPaused = update.exerciseStateInfo.state.isPaused
            val last = readings.value
            val metrics = update.latestMetrics
            var current = last.current
            for (point in metrics.getData(DataType.HEART_RATE_BPM).sortedBy { it.timeDurationFromBoot }) {
                val time = point.timeDurationFromBoot.toMillis()
                if (time <= lastSampleMs || point.value !in 25.0..250.0) continue
                lastSampleMs = time
                heartSamples++
                heartSum += point.value
                current = HeartReading(point.value, time)
            }
            val avg = metrics.getData(DataType.HEART_RATE_BPM_STATS)?.average?.takeIf { it in 25.0..250.0 }
            val kcal = metrics.getData(DataType.CALORIES_TOTAL)?.total?.takeIf { it.isFinite() && it >= 0 }
            readings.value = last.copy(
                current = current,
                average = avg ?: if (heartSamples > 0) heartSum / heartSamples else last.average,
                kcal = kcal ?: last.kcal,
            )
            if (update.exerciseStateInfo.state.isEnded) {
                ownsExercise = false
                end(HealthMode.ENDED, "Medição encerrada no relógio.")
            }
        }
    }

    private fun end(mode: HealthMode, message: String) {
        if (stopping) return
        stopping = true
        readings.value = readings.value.copy(mode = mode, current = null, message = message)
        if (ownsExercise) runCatching { exercise.endExerciseAsync() }
        ownsExercise = false
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun notification(): Notification {
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel(CHANNEL, "Sensores do treino", NotificationManager.IMPORTANCE_LOW))
        val open = PendingIntent.getActivity(this, 0, Intent(this, MonitorActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        return Notification.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_watch_monitor).setContentTitle("TreinoApp Monitor")
            .setContentText("Medição de frequência cardíaca e calorias")
            .setContentIntent(open).setOngoing(true).setOnlyAlertOnce(true).setLocalOnly(true).build()
    }

    override fun onDestroy() {
        if (ownsExercise) runCatching { exercise.endExerciseAsync() }
        if (callbackSet) runCatching { exercise.clearUpdateCallbackAsync(callback) }
        if (phoneAttached) PhoneWorkout.detach()
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        internal const val SESSION_EXTRA = "session"
        internal val readings = MutableStateFlow(WatchReadings())
        private const val CHANNEL = "treino_monitor_sensors"
        private const val NOTIFICATION = 21001
    }
}
