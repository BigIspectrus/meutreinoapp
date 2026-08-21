package com.treinoapp.app.nativebridge

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.treinoapp.app.MainActivity
import com.treinoapp.app.R
import com.treinoapp.app.widget.TreinoAppWidgetProvider
import kotlin.math.max

class WorkoutForegroundService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private val prefs by lazy { getSharedPreferences(PREFS, Context.MODE_PRIVATE) }
    private var restFinishRunnable: Runnable? = null
    private var restWakeLock: PowerManager.WakeLock? = null
    private val widgetTicker = object : Runnable {
        override fun run() {
            if (prefs.getBoolean(KEY_ACTIVE, false)) {
                TreinoAppWidgetProvider.updateAll(this@WorkoutForegroundService)
                handler.postDelayed(this, 60_000L)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        createChannels()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> saveWorkoutFromIntent(intent, reset = true)
            ACTION_UPDATE -> saveWorkoutFromIntent(intent, reset = false)
            ACTION_START_REST -> startRest(
                seconds = intent.getLongExtra(EXTRA_SECONDS, 0L),
                exercise = intent.getStringExtra(EXTRA_EXERCISE).orEmpty(),
                setNumber = intent.getIntExtra(EXTRA_SET, 0),
                nextExercise = intent.getStringExtra(EXTRA_NEXT_EXERCISE).orEmpty(),
                nextSetNumber = intent.getIntExtra(EXTRA_NEXT_SET, 0),
                nextOrdinal = intent.getIntExtra(EXTRA_NEXT_ORDINAL, -1),
                sessionId = intent.getStringExtra(EXTRA_SESSION).orEmpty(),
            )
            ACTION_ADJUST_REST -> adjustRest(intent.getLongExtra(EXTRA_DELTA, 0L))
            ACTION_SKIP_REST -> clearRest()
            ACTION_CONFIGURE_ALERTS -> configureRestAlerts(
                intent.getStringExtra(EXTRA_VIBRATION),
                intent.getBooleanExtra(EXTRA_SOUND, true),
            )
            ACTION_TEST_REST_ALERT -> postRestFinishedAlert(
                exercise = "Teste do Galaxy Watch",
                set = 0,
                isTest = true,
            )
            ACTION_TEST_WATCH_SET_ALERT -> postWatchSetActionTest()
            ACTION_START_NEXT_SET -> startNextSetFromWatch(intent.getStringExtra(EXTRA_TARGET_TOKEN).orEmpty())
            ACTION_CONFIRM_WATCH_SET_TEST -> postWatchActionConfirmation(isTest = true)
            ACTION_ACK_SET_START -> acknowledgeSetStart(
                requestId = intent.getStringExtra(EXTRA_REQUEST_ID).orEmpty(),
                exercise = intent.getStringExtra(EXTRA_NEXT_EXERCISE).orEmpty(),
                setNumber = intent.getIntExtra(EXTRA_NEXT_SET, 0),
                ordinal = intent.getIntExtra(EXTRA_NEXT_ORDINAL, -1),
            )
            ACTION_PAUSE -> pauseWorkout()
            ACTION_RESUME -> resumeWorkout()
            ACTION_FINISH -> finishWorkout()
            ACTION_REFRESH -> Unit
        }
        if (prefs.getBoolean(KEY_ACTIVE, false)) {
            ensureForeground()
            scheduleRestAlarmIfNeeded()
            TreinoAppWidgetProvider.updateAll(this)
            handler.removeCallbacks(widgetTicker)
            handler.postDelayed(widgetTicker, 60_000L)
            return START_STICKY
        }
        if (intent?.action in setOf(
                ACTION_CONFIGURE_ALERTS,
                ACTION_TEST_REST_ALERT,
                ACTION_TEST_WATCH_SET_ALERT,
                ACTION_CONFIRM_WATCH_SET_TEST,
                ACTION_START_NEXT_SET,
                ACTION_ACK_SET_START,
            )
        ) stopSelf(startId)
        return START_NOT_STICKY
    }

    private fun saveWorkoutFromIntent(intent: Intent, reset: Boolean) {
        val editor = prefs.edit().putBoolean(KEY_ACTIVE, true)
        if (reset) {
            editor.putLong(KEY_REST_END, 0L)
                .putBoolean(KEY_PAUSED, false)
                .putLong(KEY_PAUSED_AT, 0L)
                .putLong(KEY_PAUSED_TOTAL, 0L)
                .remove(KEY_NEXT_EXERCISE)
                .remove(KEY_NEXT_SET)
                .remove(KEY_NEXT_ORDINAL)
                .remove(KEY_NEXT_SESSION)
                .remove(KEY_NEXT_TOKEN)
                .remove(KEY_PENDING_SET_STARTED_AT)
                .remove(KEY_PENDING_SET_EXERCISE)
                .remove(KEY_PENDING_SET_NUMBER)
                .remove(KEY_PENDING_SET_ORDINAL)
                .remove(KEY_PENDING_SET_SESSION)
                .remove(KEY_PENDING_REQUEST_ID)
                .remove(KEY_PENDING_TARGET_TOKEN)
        }
        intent.getStringExtra(EXTRA_SESSION)?.let { editor.putString(KEY_SESSION, it) }
        intent.getStringExtra(EXTRA_NAME)?.let { editor.putString(KEY_NAME, it) }
        intent.getStringExtra(EXTRA_EXERCISE)?.let { editor.putString(KEY_EXERCISE, it) }
        if (intent.hasExtra(EXTRA_STARTED)) editor.putLong(KEY_STARTED, intent.getLongExtra(EXTRA_STARTED, System.currentTimeMillis()))
        if (intent.hasExtra(EXTRA_TOTAL)) editor.putInt(KEY_TOTAL, intent.getIntExtra(EXTRA_TOTAL, 0))
        if (intent.hasExtra(EXTRA_DONE)) editor.putInt(KEY_DONE, intent.getIntExtra(EXTRA_DONE, 0))
        if (intent.hasExtra(EXTRA_SET)) editor.putInt(KEY_SET, intent.getIntExtra(EXTRA_SET, 0))
        if (intent.hasExtra(EXTRA_PAUSED_BOOL)) editor.putBoolean(KEY_PAUSED, intent.getBooleanExtra(EXTRA_PAUSED_BOOL, false))
        editor.apply()
    }

    private fun startRest(
        seconds: Long,
        exercise: String,
        setNumber: Int,
        nextExercise: String,
        nextSetNumber: Int,
        nextOrdinal: Int,
        sessionId: String,
    ) {
        if (seconds <= 0) return
        val end = System.currentTimeMillis() + seconds * 1000L
        val resolvedSession = sessionId.ifBlank { prefs.getString(KEY_SESSION, "").orEmpty() }
        val targetToken = if (nextExercise.isNotBlank() && nextSetNumber > 0) {
            "$resolvedSession|$nextOrdinal|$nextExercise|$nextSetNumber|$end"
        } else ""
        prefs.edit()
            .putLong(KEY_REST_END, end)
            .putString(KEY_EXERCISE, exercise)
            .putInt(KEY_SET, setNumber)
            .putString(KEY_NEXT_EXERCISE, nextExercise)
            .putInt(KEY_NEXT_SET, nextSetNumber)
            .putInt(KEY_NEXT_ORDINAL, nextOrdinal)
            .putString(KEY_NEXT_SESSION, resolvedSession)
            .putString(KEY_NEXT_TOKEN, targetToken)
            .apply()
        NotificationManagerCompat.from(this).cancel(REST_NOTIFICATION_ID)
        scheduleRestAlarmIfNeeded()
        updateNotification()
    }

    private fun adjustRest(deltaSeconds: Long) {
        val current = prefs.getLong(KEY_REST_END, 0L)
        if (current <= 0L) return
        val next = max(System.currentTimeMillis() + 1_000L, current + deltaSeconds * 1000L)
        prefs.edit().putLong(KEY_REST_END, next).apply()
        scheduleRestAlarmIfNeeded()
        updateNotification()
    }

    private fun clearRest() {
        restFinishRunnable?.let(handler::removeCallbacks)
        restFinishRunnable = null
        releaseRestWakeLock()
        prefs.edit()
            .putLong(KEY_REST_END, 0L)
            .remove(KEY_NEXT_EXERCISE)
            .remove(KEY_NEXT_SET)
            .remove(KEY_NEXT_ORDINAL)
            .remove(KEY_NEXT_SESSION)
            .remove(KEY_NEXT_TOKEN)
            .apply()
        NotificationManagerCompat.from(this).cancel(REST_NOTIFICATION_ID)
        updateNotification()
    }

    private fun pauseWorkout() {
        if (prefs.getBoolean(KEY_PAUSED, false)) return
        prefs.edit().putBoolean(KEY_PAUSED, true).putLong(KEY_PAUSED_AT, System.currentTimeMillis()).apply()
        updateNotification()
    }

    private fun resumeWorkout() {
        if (!prefs.getBoolean(KEY_PAUSED, false)) return
        val pausedAt = prefs.getLong(KEY_PAUSED_AT, 0L)
        val add = if (pausedAt > 0) max(0L, System.currentTimeMillis() - pausedAt) else 0L
        prefs.edit().putBoolean(KEY_PAUSED, false).putLong(KEY_PAUSED_AT, 0L)
            .putLong(KEY_PAUSED_TOTAL, prefs.getLong(KEY_PAUSED_TOTAL, 0L) + add).apply()
        updateNotification()
    }

    private fun finishWorkout() {
        restFinishRunnable?.let(handler::removeCallbacks)
        restFinishRunnable = null
        handler.removeCallbacks(widgetTicker)
        releaseRestWakeLock()
        prefs.edit().putBoolean(KEY_ACTIVE, false).putLong(KEY_REST_END, 0L)
            .remove(KEY_NEXT_EXERCISE)
            .remove(KEY_NEXT_SET)
            .remove(KEY_NEXT_ORDINAL)
            .remove(KEY_NEXT_SESSION)
            .remove(KEY_NEXT_TOKEN)
            .remove(KEY_PENDING_SET_STARTED_AT)
            .remove(KEY_PENDING_SET_EXERCISE)
            .remove(KEY_PENDING_SET_NUMBER)
            .remove(KEY_PENDING_SET_ORDINAL)
            .remove(KEY_PENDING_SET_SESSION)
            .remove(KEY_PENDING_REQUEST_ID)
            .remove(KEY_PENDING_TARGET_TOKEN)
            .apply()
        NotificationManagerCompat.from(this).cancel(REST_NOTIFICATION_ID)
        NotificationManagerCompat.from(this).cancel(WATCH_CONFIRMATION_NOTIFICATION_ID)
        TreinoAppWidgetProvider.updateAll(this)
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun scheduleRestAlarmIfNeeded() {
        restFinishRunnable?.let(handler::removeCallbacks)
        restFinishRunnable = null
        val end = prefs.getLong(KEY_REST_END, 0L)
        if (end <= 0L) return
        val delay = end - System.currentTimeMillis()
        if (delay <= 0L) {
            onRestFinished()
            return
        }
        acquireRestWakeLock(delay)
        restFinishRunnable = Runnable { onRestFinished() }.also { handler.postDelayed(it, delay) }
    }

    private fun acquireRestWakeLock(delayMs: Long) {
        releaseRestWakeLock()
        val power = getSystemService(PowerManager::class.java)
        restWakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "TreinoApp:RestTimer").apply {
            setReferenceCounted(false)
            // Apenas durante o descanso. O timeout impede que um bug mantenha a CPU acordada indefinidamente.
            acquire((delayMs + 20_000L).coerceAtMost(15 * 60_000L))
        }
    }

    private fun releaseRestWakeLock() {
        restWakeLock?.let { lock -> if (lock.isHeld) runCatching { lock.release() } }
        restWakeLock = null
    }

    private fun onRestFinished() {
        releaseRestWakeLock()
        prefs.edit().putLong(KEY_REST_END, 0L).apply()
        val nextExercise = prefs.getString(KEY_NEXT_EXERCISE, "").orEmpty()
        val nextSet = prefs.getInt(KEY_NEXT_SET, 0)
        val targetToken = prefs.getString(KEY_NEXT_TOKEN, "").orEmpty()
        val fallbackExercise = prefs.getString(KEY_EXERCISE, "Exercício") ?: "Exercício"
        postRestFinishedAlert(
            exercise = nextExercise.ifBlank { fallbackExercise },
            set = nextSet,
            isTest = false,
            targetToken = targetToken,
        )
        updateNotification()
    }

    private fun postRestFinishedAlert(exercise: String, set: Int, isTest: Boolean, targetToken: String = "") {
        val vibration = normalizedVibration(prefs.getString(KEY_REST_VIBRATION, "medium"))
        val sound = prefs.getBoolean(KEY_REST_SOUND, true)
        val channelId = createRestAlertChannel(vibration, sound)
        val now = System.currentTimeMillis()
        val title = if (isTest) "Teste de aviso do TreinoApp" else "Descanso concluído"
        val message = when {
            isTest -> "Se este aviso apareceu no relógio, o espelhamento está funcionando."
            set > 0 -> "$exercise · série $set pronta para iniciar"
            else -> exercise
        }
        val canStartSet = !isTest && targetToken.isNotBlank() && exercise.isNotBlank() && set > 0
        val wearable = NotificationCompat.WearableExtender()
            .setBridgeTag(REST_BRIDGE_TAG)
            .setDismissalId("treinoapp-rest-$now")
        if (canStartSet) {
            wearable.addAction(NotificationCompat.Action.Builder(
                R.drawable.ic_stat_treino,
                "Iniciar série",
                targetPendingIntent(ACTION_START_NEXT_SET, targetToken),
            ).build())
        }
        val alert = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_stat_treino)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setSubText("TreinoApp Beta")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setLocalOnly(false)
            .setWhen(now)
            .setShowWhen(true)
            .setOnlyAlertOnce(false)
            .setAutoCancel(true)
            .setContentIntent(openAppIntent())
            .extend(wearable)
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            alert.setVibrate(vibrationPattern(vibration))
            if (sound) alert.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
            else alert.setSound(null)
        }
        // O gerenciador compatível preserva os metadados do WearableExtender ao publicar.
        NotificationManagerCompat.from(this).notify(REST_NOTIFICATION_ID, alert.build())
    }

    private fun postWatchSetActionTest() {
        val vibration = normalizedVibration(prefs.getString(KEY_REST_VIBRATION, "medium"))
        val sound = prefs.getBoolean(KEY_REST_SOUND, true)
        val now = System.currentTimeMillis()
        val action = NotificationCompat.Action.Builder(
            R.drawable.ic_stat_treino,
            "Testar botão",
            servicePendingIntent(ACTION_CONFIRM_WATCH_SET_TEST),
        ).build()
        val wearable = NotificationCompat.WearableExtender()
            .addAction(action)
            .setBridgeTag(REST_BRIDGE_TAG)
            .setDismissalId("treinoapp-watch-test-$now")
        val message = "Toque em “Testar botão”. Nenhum treino será alterado."
        val alert = NotificationCompat.Builder(this, createRestAlertChannel(vibration, sound))
            .setSmallIcon(R.drawable.ic_stat_treino)
            .setContentTitle("Teste do botão no Galaxy Watch")
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setSubText("TreinoApp Beta")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setLocalOnly(false)
            .setWhen(now)
            .setShowWhen(true)
            .setAutoCancel(true)
            .setContentIntent(openAppIntent())
            .extend(wearable)
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            alert.setVibrate(vibrationPattern(vibration))
            if (sound) alert.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
            else alert.setSound(null)
        }
        NotificationManagerCompat.from(this).notify(REST_NOTIFICATION_ID, alert.build())
    }

    private fun startNextSetFromWatch(targetToken: String) {
        if (targetToken.isBlank()) return
        val existingToken = prefs.getString(KEY_PENDING_TARGET_TOKEN, "").orEmpty()
        if (existingToken == targetToken && prefs.getLong(KEY_PENDING_SET_STARTED_AT, 0L) > 0L) {
            postWatchActionConfirmation(isTest = false)
            return
        }
        if (!prefs.getBoolean(KEY_ACTIVE, false) || targetToken != prefs.getString(KEY_NEXT_TOKEN, "").orEmpty()) return
        val exercise = prefs.getString(KEY_NEXT_EXERCISE, "").orEmpty()
        val setNumber = prefs.getInt(KEY_NEXT_SET, 0)
        val ordinal = prefs.getInt(KEY_NEXT_ORDINAL, -1)
        val session = prefs.getString(KEY_NEXT_SESSION, "").orEmpty()
        if (exercise.isBlank() || setNumber <= 0 || session != prefs.getString(KEY_SESSION, "").orEmpty()) return
        val startedAt = System.currentTimeMillis()
        val requestId = "$targetToken|$startedAt"
        restFinishRunnable?.let(handler::removeCallbacks)
        restFinishRunnable = null
        releaseRestWakeLock()
        prefs.edit()
            .putLong(KEY_REST_END, 0L)
            .putString(KEY_EXERCISE, exercise)
            .putInt(KEY_SET, setNumber)
            .putLong(KEY_PENDING_SET_STARTED_AT, startedAt)
            .putString(KEY_PENDING_SET_EXERCISE, exercise)
            .putInt(KEY_PENDING_SET_NUMBER, setNumber)
            .putInt(KEY_PENDING_SET_ORDINAL, ordinal)
            .putString(KEY_PENDING_SET_SESSION, session)
            .putString(KEY_PENDING_REQUEST_ID, requestId)
            .putString(KEY_PENDING_TARGET_TOKEN, targetToken)
            .remove(KEY_NEXT_EXERCISE)
            .remove(KEY_NEXT_SET)
            .remove(KEY_NEXT_ORDINAL)
            .remove(KEY_NEXT_SESSION)
            .remove(KEY_NEXT_TOKEN)
            .apply()
        NotificationManagerCompat.from(this).cancel(REST_NOTIFICATION_ID)
        postWatchActionConfirmation(isTest = false)
        updateNotification()
    }

    private fun acknowledgeSetStart(requestId: String, exercise: String, setNumber: Int, ordinal: Int) {
        val pendingRequest = prefs.getString(KEY_PENDING_REQUEST_ID, "").orEmpty()
        if (requestId.isNotBlank() && requestId != pendingRequest) return
        val pendingMatches = requestId.isNotBlank() || (
            exercise.isNotBlank() && exercise == prefs.getString(KEY_PENDING_SET_EXERCISE, "").orEmpty() &&
                setNumber == prefs.getInt(KEY_PENDING_SET_NUMBER, 0) &&
                (ordinal < 0 || ordinal == prefs.getInt(KEY_PENDING_SET_ORDINAL, -1))
            )
        val nextMatches = exercise.isNotBlank() && exercise == prefs.getString(KEY_NEXT_EXERCISE, "").orEmpty() &&
            setNumber == prefs.getInt(KEY_NEXT_SET, 0) &&
            (ordinal < 0 || ordinal == prefs.getInt(KEY_NEXT_ORDINAL, -1))
        val editor = prefs.edit()
        if (pendingMatches) editor
            .remove(KEY_PENDING_SET_STARTED_AT)
            .remove(KEY_PENDING_SET_EXERCISE)
            .remove(KEY_PENDING_SET_NUMBER)
            .remove(KEY_PENDING_SET_ORDINAL)
            .remove(KEY_PENDING_SET_SESSION)
            .remove(KEY_PENDING_REQUEST_ID)
            .remove(KEY_PENDING_TARGET_TOKEN)
        if (nextMatches) editor
            .remove(KEY_NEXT_EXERCISE)
            .remove(KEY_NEXT_SET)
            .remove(KEY_NEXT_ORDINAL)
            .remove(KEY_NEXT_SESSION)
            .remove(KEY_NEXT_TOKEN)
        editor.apply()
        if (pendingMatches || nextMatches) NotificationManagerCompat.from(this).cancel(REST_NOTIFICATION_ID)
    }

    private fun postWatchActionConfirmation(isTest: Boolean) {
        val exercise = prefs.getString(KEY_PENDING_SET_EXERCISE, "").orEmpty()
        val setNumber = prefs.getInt(KEY_PENDING_SET_NUMBER, 0)
        val title = if (isTest) "Botão do relógio funcionando" else "Série iniciada"
        val message = if (isTest) {
            "O comando chegou ao celular sem alterar nenhum treino."
        } else {
            listOfNotNull(
                exercise.takeIf { it.isNotBlank() },
                setNumber.takeIf { it > 0 }?.let { "série $it" },
                "conclua pelo celular",
            ).joinToString(" · ")
        }
        val now = System.currentTimeMillis()
        val notification = NotificationCompat.Builder(this, CHANNEL_WATCH_ACTION)
            .setSmallIcon(R.drawable.ic_stat_treino)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setLocalOnly(false)
            .setOnlyAlertOnce(true)
            .setAutoCancel(true)
            .setTimeoutAfter(15_000L)
            .setContentIntent(openAppIntent())
            .extend(
                NotificationCompat.WearableExtender()
                    .setBridgeTag(WATCH_ACTION_BRIDGE_TAG)
                    .setDismissalId("treinoapp-watch-confirm-$now")
            )
            .build()
        NotificationManagerCompat.from(this).cancel(REST_NOTIFICATION_ID)
        NotificationManagerCompat.from(this).notify(WATCH_CONFIRMATION_NOTIFICATION_ID, notification)
    }

    private fun configureRestAlerts(rawVibration: String?, sound: Boolean) {
        val vibration = normalizedVibration(rawVibration)
        prefs.edit()
            .putString(KEY_REST_VIBRATION, vibration)
            .putBoolean(KEY_REST_SOUND, sound)
            .apply()
        createRestAlertChannel(vibration, sound)
    }

    private fun normalizedVibration(value: String?): String =
        value?.takeIf { it in setOf("off", "light", "medium", "long") } ?: "medium"

    private fun vibrationPattern(mode: String): LongArray = when (mode) {
        "off" -> longArrayOf(0L)
        "light" -> longArrayOf(0L, 120L)
        "long" -> longArrayOf(0L, 700L, 180L, 700L)
        else -> longArrayOf(0L, 260L, 120L, 260L)
    }

    private fun restChannelId(vibration: String, sound: Boolean): String =
        "treinoapp_rest_v3_${vibration}_${if (sound) "sound" else "silent"}"

    private fun createRestAlertChannel(vibration: String, sound: Boolean): String {
        val id = restChannelId(vibration, sound)
        val label = when (vibration) {
            "off" -> "sem vibração"
            "light" -> "vibração leve"
            "long" -> "vibração longa"
            else -> "vibração média"
        }
        val channel = NotificationChannel(id, "Fim do descanso · $label", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "Aviso no telefone e em relógios pareados quando o descanso termina"
            setShowBadge(false)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            if (vibration == "off") {
                enableVibration(false)
            } else {
                enableVibration(true)
                setVibrationPattern(vibrationPattern(vibration))
            }
            if (sound) {
                val attributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                    .build()
                setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), attributes)
            } else {
                setSound(null, null)
            }
        }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        return id
    }

    private fun ensureForeground() {
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH else 0
        ServiceCompat.startForeground(this, WORKOUT_NOTIFICATION_ID, buildNotification(), type)
    }

    private fun updateNotification() {
        if (!prefs.getBoolean(KEY_ACTIVE, false)) return
        getSystemService(NotificationManager::class.java).notify(WORKOUT_NOTIFICATION_ID, buildNotification())
        TreinoAppWidgetProvider.updateAll(this)
    }

    private fun buildNotification(): android.app.Notification {
        val name = prefs.getString(KEY_NAME, "Treino") ?: "Treino"
        val exercise = prefs.getString(KEY_EXERCISE, "") ?: ""
        val done = prefs.getInt(KEY_DONE, 0)
        val total = prefs.getInt(KEY_TOTAL, 0)
        val paused = prefs.getBoolean(KEY_PAUSED, false)
        val restEnd = prefs.getLong(KEY_REST_END, 0L)
        val builder = NotificationCompat.Builder(this, CHANNEL_WORKOUT)
            .setSmallIcon(R.drawable.ic_stat_treino)
            .setContentTitle(name)
            .setContentIntent(openAppIntent())
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setShowWhen(true)

        if (restEnd > System.currentTimeMillis()) {
            builder.setContentTitle(if (exercise.isNotBlank()) "Descanso · $exercise" else "Descanso")
                .setContentText("$done/$total séries concluídas")
                .setWhen(restEnd)
                .setUsesChronometer(true)
                .setChronometerCountDown(true)
                .addAction(0, "-15s", servicePendingIntent(ACTION_ADJUST_REST, -15))
                .addAction(0, "Pular", servicePendingIntent(ACTION_SKIP_REST))
                .addAction(0, "+30s", servicePendingIntent(ACTION_ADJUST_REST, 30))
        } else {
            val started = prefs.getLong(KEY_STARTED, System.currentTimeMillis())
            val totalPaused = prefs.getLong(KEY_PAUSED_TOTAL, 0L)
            val currentPaused = if (paused) max(0L, System.currentTimeMillis() - prefs.getLong(KEY_PAUSED_AT, System.currentTimeMillis())) else 0L
            val activeElapsed = max(0L, System.currentTimeMillis() - started - totalPaused - currentPaused)
            val chronometerBase = System.currentTimeMillis() - activeElapsed
            builder.setContentText(listOfNotNull(
                "$done/$total séries",
                exercise.takeIf { it.isNotBlank() },
                if (paused) "Pausado" else null
            ).joinToString(" · "))
                .setWhen(chronometerBase)
                .setUsesChronometer(!paused)
                .addAction(0, if (paused) "Retomar" else "Pausar", servicePendingIntent(if (paused) ACTION_RESUME else ACTION_PAUSE))
                .addAction(0, "Abrir", openAppIntent())
        }
        return builder.build()
    }

    private fun openAppIntent(): PendingIntent {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("openTab", "treinar")
        }
        return PendingIntent.getActivity(this, 100, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun servicePendingIntent(action: String, delta: Int = 0): PendingIntent {
        val requestCode = (action + delta).hashCode()
        val intent = Intent(this, WorkoutForegroundService::class.java).apply {
            this.action = action
            if (action == ACTION_ADJUST_REST) putExtra(EXTRA_DELTA, delta.toLong())
        }
        return PendingIntent.getService(this, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun targetPendingIntent(action: String, targetToken: String): PendingIntent {
        val requestCode = (action + targetToken).hashCode()
        val intent = Intent(this, WorkoutForegroundService::class.java).apply {
            this.action = action
            putExtra(EXTRA_TARGET_TOKEN, targetToken)
        }
        return PendingIntent.getService(this, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun createChannels() {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CHANNEL_WORKOUT, "Treino em andamento", NotificationManager.IMPORTANCE_LOW).apply {
            description = "Mantém o treino e o cronômetro ativos em segundo plano"
            setSound(null, null)
            enableVibration(false)
        })
        nm.createNotificationChannel(NotificationChannel(CHANNEL_WATCH_ACTION, "Comandos do Galaxy Watch", NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = "Confirma comandos iniciados pelo relógio"
            setShowBadge(false)
            setSound(null, null)
            enableVibration(false)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
        })
        createRestAlertChannel(
            normalizedVibration(prefs.getString(KEY_REST_VIBRATION, "medium")),
            prefs.getBoolean(KEY_REST_SOUND, true),
        )
    }

    override fun onDestroy() {
        restFinishRunnable?.let(handler::removeCallbacks)
        handler.removeCallbacks(widgetTicker)
        releaseRestWakeLock()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val PREFS = "treino_native_state"
        const val KEY_ACTIVE = "active"
        const val KEY_SESSION = "sessionId"
        const val KEY_NAME = "name"
        const val KEY_STARTED = "startedAt"
        const val KEY_TOTAL = "totalSets"
        const val KEY_DONE = "completedSets"
        const val KEY_EXERCISE = "currentExercise"
        const val KEY_SET = "currentSet"
        const val KEY_REST_END = "restEndAt"
        const val KEY_PAUSED = "paused"
        const val KEY_PAUSED_AT = "pausedAt"
        const val KEY_PAUSED_TOTAL = "pausedTotal"
        const val KEY_REST_VIBRATION = "restVibration"
        const val KEY_REST_SOUND = "restSound"
        const val KEY_NEXT_EXERCISE = "nextExercise"
        const val KEY_NEXT_SET = "nextSet"
        const val KEY_NEXT_ORDINAL = "nextOrdinal"
        const val KEY_NEXT_SESSION = "nextSession"
        const val KEY_NEXT_TOKEN = "nextToken"
        const val KEY_PENDING_SET_STARTED_AT = "pendingSetStartedAt"
        const val KEY_PENDING_SET_EXERCISE = "pendingSetExercise"
        const val KEY_PENDING_SET_NUMBER = "pendingSetNumber"
        const val KEY_PENDING_SET_ORDINAL = "pendingSetOrdinal"
        const val KEY_PENDING_SET_SESSION = "pendingSetSession"
        const val KEY_PENDING_REQUEST_ID = "pendingSetRequestId"
        const val KEY_PENDING_TARGET_TOKEN = "pendingTargetToken"

        const val ACTION_START = "com.treinoapp.action.START"
        const val ACTION_UPDATE = "com.treinoapp.action.UPDATE"
        const val ACTION_START_REST = "com.treinoapp.action.START_REST"
        const val ACTION_ADJUST_REST = "com.treinoapp.action.ADJUST_REST"
        const val ACTION_SKIP_REST = "com.treinoapp.action.SKIP_REST"
        const val ACTION_CONFIGURE_ALERTS = "com.treinoapp.action.CONFIGURE_ALERTS"
        const val ACTION_TEST_REST_ALERT = "com.treinoapp.action.TEST_REST_ALERT"
        const val ACTION_TEST_WATCH_SET_ALERT = "com.treinoapp.action.TEST_WATCH_SET_ALERT"
        const val ACTION_START_NEXT_SET = "com.treinoapp.action.START_NEXT_SET"
        const val ACTION_CONFIRM_WATCH_SET_TEST = "com.treinoapp.action.CONFIRM_WATCH_SET_TEST"
        const val ACTION_ACK_SET_START = "com.treinoapp.action.ACK_SET_START"
        const val ACTION_PAUSE = "com.treinoapp.action.PAUSE"
        const val ACTION_RESUME = "com.treinoapp.action.RESUME"
        const val ACTION_FINISH = "com.treinoapp.action.FINISH"
        const val ACTION_REFRESH = "com.treinoapp.action.REFRESH"

        const val EXTRA_SESSION = "sessionId"
        const val EXTRA_NAME = "name"
        const val EXTRA_STARTED = "startedAt"
        const val EXTRA_TOTAL = "totalSets"
        const val EXTRA_DONE = "completedSets"
        const val EXTRA_EXERCISE = "currentExercise"
        const val EXTRA_SET = "currentSet"
        const val EXTRA_SECONDS = "seconds"
        const val EXTRA_DELTA = "deltaSeconds"
        const val EXTRA_PAUSED_BOOL = "paused"
        const val EXTRA_VIBRATION = "vibration"
        const val EXTRA_SOUND = "sound"
        const val EXTRA_NEXT_EXERCISE = "nextExercise"
        const val EXTRA_NEXT_SET = "nextSetNumber"
        const val EXTRA_NEXT_ORDINAL = "nextOrdinal"
        const val EXTRA_TARGET_TOKEN = "targetToken"
        const val EXTRA_REQUEST_ID = "requestId"

        private const val CHANNEL_WORKOUT = "treinoapp_workout"
        private const val CHANNEL_WATCH_ACTION = "treinoapp_watch_action_v1"
        private const val WORKOUT_NOTIFICATION_ID = 12001
        private const val REST_NOTIFICATION_ID = 12002
        private const val WATCH_CONFIRMATION_NOTIFICATION_ID = 12003
        private const val REST_BRIDGE_TAG = "treinoapp-rest-alert"
        private const val WATCH_ACTION_BRIDGE_TAG = "treinoapp-watch-action"

        fun send(context: Context, action: String, configure: Intent.() -> Unit = {}) {
            val intent = Intent(context, WorkoutForegroundService::class.java).apply {
                this.action = action
                configure()
            }
            if (action == ACTION_START) ContextCompat.startForegroundService(context, intent) else context.startService(intent)
        }
    }
}
