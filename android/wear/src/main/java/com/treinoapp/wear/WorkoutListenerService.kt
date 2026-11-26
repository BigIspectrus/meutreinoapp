package com.treinoapp.wear

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.wear.ongoing.OngoingActivity
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.WearableListenerService
import com.treinoapp.watchlink.WorkoutSnapshot

class WorkoutListenerService : WearableListenerService() {
    override fun onDataChanged(events: DataEventBuffer) {
        for (event in events) {
            if (event.type == DataEvent.TYPE_CHANGED) WorkoutSnapshot.from(event.dataItem)?.let(PhoneWorkout::accept)
        }
        WatchShortcut.update(this, PhoneWorkout.snapshot.value)
    }
}

internal object WatchShortcut {
    private const val CHANNEL = "treino_monitor_ongoing"
    private const val ID = 21002
    private var postedAt = 0L
    private var lastLabel: String? = null

    fun canPost(context: Context) = Build.VERSION.SDK_INT < 33 || context.hasPermission(Manifest.permission.POST_NOTIFICATIONS)

    @Synchronized
    fun update(context: Context, workout: WorkoutSnapshot?, force: Boolean = false) {
        val manager = context.getSystemService(NotificationManager::class.java)
        val now = System.currentTimeMillis()
        if (workout == null || !workout.active || !workout.isFresh(now) || !canPost(context)) {
            if (lastLabel != null || workout?.active == false) manager.cancel(ID)
            lastLabel = null
            postedAt = 0L
            return
        }
        val summary = when {
            workout.paused -> "Treino pausado"
            workout.restAt(now) > 0 -> "Descanso"
            workout.readyAfterRest(now) -> "Pronto para a próxima série"
            else -> workout.exercise.ifBlank { "Treino em andamento" }
        }
        if (!force && now - postedAt < 30_000L && lastLabel == summary) return
        manager.createNotificationChannel(NotificationChannel(CHANNEL, "Treino no mostrador", NotificationManager.IMPORTANCE_LOW))
        val open = PendingIntent.getActivity(context, ID, Intent(context, MonitorActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val notification = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_watch_monitor)
            .setContentTitle("TreinoApp Monitor")
            .setContentText(summary)
            .setContentIntent(open)
            .setOngoing(true)
            .setLocalOnly(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .setTimeoutAfter((WorkoutSnapshot.STALE_MS - workout.ageAt(now) + 15_000L).coerceAtLeast(1L))
        OngoingActivity.Builder(context, ID, notification)
            .setStaticIcon(R.drawable.ic_watch_monitor)
            .setTouchIntent(open)
            .build()
            .apply(context)
        manager.notify(ID, notification.build())
        postedAt = now
        lastLabel = summary
    }
}
