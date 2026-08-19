package com.treinoapp.app.nativebridge

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import androidx.core.app.NotificationCompat
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
            ACTION_START_REST -> startRest(intent.getLongExtra(EXTRA_SECONDS, 0L), intent.getStringExtra(EXTRA_EXERCISE).orEmpty(), intent.getIntExtra(EXTRA_SET, 0))
            ACTION_ADJUST_REST -> adjustRest(intent.getLongExtra(EXTRA_DELTA, 0L))
            ACTION_SKIP_REST -> clearRest()
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
        }
        return START_STICKY
    }

    private fun saveWorkoutFromIntent(intent: Intent, reset: Boolean) {
        val editor = prefs.edit().putBoolean(KEY_ACTIVE, true)
        if (reset) {
            editor.putLong(KEY_REST_END, 0L)
                .putBoolean(KEY_PAUSED, false)
                .putLong(KEY_PAUSED_AT, 0L)
                .putLong(KEY_PAUSED_TOTAL, 0L)
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

    private fun startRest(seconds: Long, exercise: String, setNumber: Int) {
        if (seconds <= 0) return
        val end = System.currentTimeMillis() + seconds * 1000L
        prefs.edit().putLong(KEY_REST_END, end).putString(KEY_EXERCISE, exercise).putInt(KEY_SET, setNumber).apply()
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
        prefs.edit().putLong(KEY_REST_END, 0L).apply()
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
        prefs.edit().putBoolean(KEY_ACTIVE, false).putLong(KEY_REST_END, 0L).apply()
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
        val exercise = prefs.getString(KEY_EXERCISE, "Exercício") ?: "Exercício"
        val set = prefs.getInt(KEY_SET, 0)
        val nm = getSystemService(NotificationManager::class.java)
        nm.notify(
            REST_NOTIFICATION_ID,
            NotificationCompat.Builder(this, CHANNEL_REST)
                .setSmallIcon(R.drawable.ic_stat_treino)
                .setContentTitle("Descanso concluído")
                .setContentText(if (set > 0) "$exercise · próxima série ${set + 1}" else exercise)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(openAppIntent())
                .build()
        )
        updateNotification()
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

    private fun createChannels() {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CHANNEL_WORKOUT, "Treino em andamento", NotificationManager.IMPORTANCE_LOW).apply {
            description = "Mantém o treino e o cronômetro ativos em segundo plano"
            setSound(null, null)
            enableVibration(false)
        })
        nm.createNotificationChannel(NotificationChannel(CHANNEL_REST, "Fim do descanso", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "Aviso quando o descanso termina"
            enableVibration(true)
        })
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

        const val ACTION_START = "com.treinoapp.action.START"
        const val ACTION_UPDATE = "com.treinoapp.action.UPDATE"
        const val ACTION_START_REST = "com.treinoapp.action.START_REST"
        const val ACTION_ADJUST_REST = "com.treinoapp.action.ADJUST_REST"
        const val ACTION_SKIP_REST = "com.treinoapp.action.SKIP_REST"
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

        private const val CHANNEL_WORKOUT = "treinoapp_workout"
        private const val CHANNEL_REST = "treinoapp_rest"
        private const val WORKOUT_NOTIFICATION_ID = 12001
        private const val REST_NOTIFICATION_ID = 12002

        fun send(context: Context, action: String, configure: Intent.() -> Unit = {}) {
            val intent = Intent(context, WorkoutForegroundService::class.java).apply {
                this.action = action
                configure()
            }
            if (action == ACTION_START) ContextCompat.startForegroundService(context, intent) else context.startService(intent)
        }
    }
}
