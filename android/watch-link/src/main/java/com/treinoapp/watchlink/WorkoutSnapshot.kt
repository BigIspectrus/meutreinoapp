package com.treinoapp.watchlink

import com.google.android.gms.wearable.DataItem
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.PutDataMapRequest

data class WorkoutSnapshot(
    val sessionId: String,
    val active: Boolean,
    val name: String,
    val exercise: String,
    val setNumber: Int,
    val exerciseSets: Int,
    val completedSets: Int,
    val totalSets: Int,
    val setRunning: Boolean,
    val paused: Boolean,
    val sentAt: Long,
    val elapsedMs: Long,
    val restEndsAt: Long,
) {
    fun ageAt(now: Long): Long = (now - sentAt).coerceAtLeast(0L)
    fun isFresh(now: Long): Boolean = ageAt(now) <= STALE_MS
    fun elapsedAt(now: Long): Long = elapsedMs + if (active && !paused) ageAt(now).coerceAtMost(STALE_MS) else 0L
    fun restAt(now: Long): Long = if (active && !paused) (restEndsAt - now).coerceAtLeast(0L) else 0L

    fun toRequest() = PutDataMapRequest.create(PATH).apply {
        dataMap.putInt("schema", SCHEMA)
        dataMap.putString("session", sessionId)
        dataMap.putBoolean("active", active)
        dataMap.putString("name", name)
        dataMap.putString("exercise", exercise)
        dataMap.putInt("set", setNumber)
        dataMap.putInt("exerciseSets", exerciseSets)
        dataMap.putInt("done", completedSets)
        dataMap.putInt("total", totalSets)
        dataMap.putBoolean("setRunning", setRunning)
        dataMap.putBoolean("paused", paused)
        dataMap.putLong("sent", sentAt)
        dataMap.putLong("elapsed", elapsedMs)
        dataMap.putLong("restEnd", restEndsAt)
    }.asPutDataRequest().setUrgent()

    companion object {
        const val PATH = "/treinoapp/monitor/v1"
        const val HEARTBEAT_MS = 15_000L
        const val STALE_MS = 50_000L
        const val SENSOR_TIMEOUT_MS = 150_000L
        private const val SCHEMA = 1

        fun from(item: DataItem): WorkoutSnapshot? {
            if (item.uri.path != PATH) return null
            return runCatching {
                val map = DataMapItem.fromDataItem(item).dataMap
                val session = map.getString("session").orEmpty()
                val sent = map.getLong("sent")
                if (map.getInt("schema") != SCHEMA || session.isBlank() || sent <= 0L) return null
                WorkoutSnapshot(
                    session, map.getBoolean("active"), map.getString("name").orEmpty(),
                    map.getString("exercise").orEmpty(), map.getInt("set").coerceAtLeast(0),
                    map.getInt("exerciseSets").coerceAtLeast(0), map.getInt("done").coerceAtLeast(0),
                    map.getInt("total").coerceAtLeast(0), map.getBoolean("setRunning"),
                    map.getBoolean("paused"), sent, map.getLong("elapsed").coerceAtLeast(0L), map.getLong("restEnd"),
                )
            }.getOrNull()
        }
    }
}
