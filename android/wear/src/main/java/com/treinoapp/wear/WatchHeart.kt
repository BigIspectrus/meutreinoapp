package com.treinoapp.wear

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.SystemClock
import androidx.health.services.client.HealthServices
import androidx.health.services.client.MeasureCallback
import androidx.health.services.client.data.Availability
import androidx.health.services.client.data.DataPointContainer
import androidx.health.services.client.data.DataType
import androidx.health.services.client.data.DeltaDataType

internal fun heartPermission(): String = if (Build.VERSION.SDK_INT >= 36) {
    "android.permission.health.READ_HEART_RATE"
} else Manifest.permission.BODY_SENSORS

internal fun Context.hasPermission(permission: String) = checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED

internal data class HeartReading(val bpm: Double, val uptimeMs: Long) {
    fun isRecent() = SystemClock.elapsedRealtime() - uptimeMs in 0L..25_000L
}

internal class SpotHeart(context: Context, private val changed: () -> Unit) {
    private val measure = HealthServices.getClient(context.applicationContext).measureClient
    var current: HeartReading? = null
        private set
    var unavailable = false
        private set
    val average: Double? get() = if (sampleCount > 0) sum / sampleCount else null
    private var session = ""
    private var lastSampleMs = -1L
    private var sampleCount = 0
    private var sum = 0.0
    private var callback: MeasureCallback? = null

    fun forSession(id: String) {
        if (session == id) return
        stop()
        session = id
        lastSampleMs = -1L
        sampleCount = 0
        sum = 0.0
    }

    fun start() {
        if (callback != null || session.isBlank()) return
        val listener = object : MeasureCallback {
            override fun onAvailabilityChanged(dataType: DeltaDataType<*, *>, availability: Availability) = Unit
            override fun onRegistrationFailed(throwable: Throwable) {
                if (callback === this) { unavailable = true; changed() }
            }

            override fun onDataReceived(data: DataPointContainer) {
                if (callback !== this) return
                val samples = data.getData(DataType.HEART_RATE_BPM)
                for (point in samples.sortedBy { it.timeDurationFromBoot }) {
                    val time = point.timeDurationFromBoot.toMillis()
                    if (time <= lastSampleMs || point.value !in 25.0..250.0) continue
                    lastSampleMs = time
                    sampleCount++
                    sum += point.value
                    current = HeartReading(point.value, time)
                }
                if (current != null) changed()
            }
        }
        callback = listener
        unavailable = false
        runCatching { measure.registerMeasureCallback(DataType.HEART_RATE_BPM, listener) }.onFailure {
            unavailable = true
            changed()
        }
    }

    fun stop() {
        callback?.let { runCatching { measure.unregisterMeasureCallbackAsync(DataType.HEART_RATE_BPM, it) } }
        callback = null
        current = null
        unavailable = false
    }
}
