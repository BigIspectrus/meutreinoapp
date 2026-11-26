package com.treinoapp.app.nativebridge

import android.content.Context
import android.util.Log
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.wearable.Wearable
import com.treinoapp.watchlink.WorkoutSnapshot

internal class WatchMonitorPublisher(context: Context) {
    private val app = context.applicationContext
    private var last: WorkoutSnapshot? = null
    private var lastSentAt = 0L

    fun publish(snapshot: WorkoutSnapshot, heartbeat: Boolean = false) {
        val state = snapshot.copy(sentAt = 0L, elapsedMs = 0L)
        if (!heartbeat && state == last) return
        if (GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(app) != ConnectionResult.SUCCESS) return
        val stamped = snapshot.copy(sentAt = maxOf(lastSentAt + 1, snapshot.sentAt))
        last = state
        lastSentAt = stamped.sentAt
        runCatching {
            Wearable.getDataClient(app).putDataItem(stamped.toRequest()).addOnFailureListener {
                if (lastSentAt == stamped.sentAt) last = null
                Log.d("TreinoWatch", "Atualização do monitor indisponível", it)
            }
        }.onFailure {
            last = null
            Log.d("TreinoWatch", "Data Layer indisponível", it)
        }
    }
}
