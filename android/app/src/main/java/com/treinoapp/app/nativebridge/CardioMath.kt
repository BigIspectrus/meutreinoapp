package com.treinoapp.app.nativebridge

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

data class CardioSession(
    val id: String,
    val sourcePackage: String,
    val source: String,
    val kind: String,
    val title: String,
    val date: String,
    val startMs: Long,
    val endMs: Long,
    val kcal: Double? = null,
    val calorieKind: String? = null,
    val sessionReadAt: Long? = null,
    val kcalReadAt: Long? = null,
    val kcalCheckedAt: Long? = null,
    val kcalReadState: String = "unknown",
) {
    val minutes: Double get() = (endMs - startMs).coerceAtLeast(0L) / 60_000.0
}

object CardioMath {
    // Mesma origem: só IDs iguais. Origens diferentes: mesmo tipo e horários
    // praticamente iguais. Não fundir sessões consecutivas nem tipos diferentes.
    fun deduplicate(rows: List<CardioSession>): List<CardioSession> {
        val chosen = mutableListOf<CardioSession>()
        val ordered = rows.sortedWith(compareBy<CardioSession> {
            if (it.sourcePackage == "com.sec.android.app.shealth") 0 else 1
        }.thenBy { it.startMs })
        for (row in ordered) {
            if (row.endMs <= row.startMs) continue
            val duplicate = chosen.any { other ->
                if (row.sourcePackage == other.sourcePackage) row.id == other.id
                else {
                    val overlap = max(0L, min(row.endMs, other.endMs) - max(row.startMs, other.startMs))
                    val longest = max(row.endMs - row.startMs, other.endMs - other.startMs)
                    row.kind == other.kind && abs(row.startMs - other.startMs) <= 60_000L &&
                        abs(row.endMs - other.endMs) <= 60_000L && overlap.toDouble() / longest >= 0.95
                }
            }
            if (!duplicate) chosen += row
        }
        return chosen.sortedByDescending { it.startMs }
    }
}
