package com.treinoapp.wear

import android.content.Context
import android.util.Log
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.Wearable
import com.treinoapp.watchlink.WorkoutSnapshot
import kotlinx.coroutines.flow.MutableStateFlow

internal object PhoneWorkout {
    val snapshot = MutableStateFlow<WorkoutSnapshot?>(null)
    private var client: DataClient? = null
    private var subscribers = 0
    private val listener = DataClient.OnDataChangedListener { events ->
        for (event in events) {
            if (event.type == DataEvent.TYPE_CHANGED) WorkoutSnapshot.from(event.dataItem)?.let(::accept)
        }
    }

    fun attach(context: Context) {
        if (++subscribers > 1) return
        val source = Wearable.getDataClient(context.applicationContext)
        client = source
        // Carrega o último estado mesmo que o relógio seja aberto no meio da sessão.
        source.addListener(listener).addOnSuccessListener {
            if (client !== source) {
                source.removeListener(listener)
                return@addOnSuccessListener
            }
            source.dataItems.addOnSuccessListener { items ->
                try { for (item in items) WorkoutSnapshot.from(item)?.let(::accept) }
                finally { items.release() }
            }.addOnFailureListener { Log.d("TreinoWatch", "Sem estado inicial do celular", it) }
        }.addOnFailureListener { Log.d("TreinoWatch", "Conexão Wear indisponível", it) }
    }

    fun detach() {
        if (subscribers == 0 || --subscribers > 0) return
        client?.removeListener(listener)
        client = null
    }

    private fun accept(update: WorkoutSnapshot) {
        if (update.sentAt > System.currentTimeMillis() + WorkoutSnapshot.STALE_MS) return
        if (update.sentAt > (snapshot.value?.sentAt ?: 0L)) snapshot.value = update
    }
}
