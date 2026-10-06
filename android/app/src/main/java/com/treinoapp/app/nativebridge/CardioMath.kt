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
    val distanceMeters: Double? = null,
    val distanceCoverage: Double? = null,
    val distanceComplete: Boolean = false,
    val distanceReason: String = "no_data",
    val distanceReadAt: Long? = null,
    val distanceCheckedAt: Long? = null,
    val distanceReadState: String = "unknown",
) {
    val minutes: Double get() = (endMs - startMs).coerceAtLeast(0L) / 60_000.0
}

object CardioMath {
    data class DistanceSegment(val id: String, val sourcePackage: String, val startMs: Long, val endMs: Long, val meters: Double)
    data class DistanceResult(val meters: Double? = null, val coverage: Double? = null, val complete: Boolean = false, val reason: String = "no_data")

    fun distance(session: CardioSession, segments: List<DistanceSegment>, ambiguous: Boolean = false): DistanceResult {
        if (session.endMs <= session.startMs) return DistanceResult(reason = "invalid_data")
        if (ambiguous) return DistanceResult(reason = "ambiguous_interval")
        val matching = segments.filter { it.sourcePackage == session.sourcePackage && it.endMs > session.startMs && it.startMs < session.endMs }
        if (matching.isEmpty()) return DistanceResult()
        if (matching.any { !it.meters.isFinite() || it.meters < 0 || it.endMs <= it.startMs }) return DistanceResult(reason = "invalid_data")
        // Não ratear distância de um registro diário, nem atribuí-la a outro treino.
        if (matching.any { it.startMs < session.startMs || it.endMs > session.endMs }) return DistanceResult(reason = "outside_interval")
        val rows = matching.distinctBy { if (it.id.isNotBlank()) it.id else "${it.startMs}:${it.endMs}:${it.meters}" }.sortedBy { it.startMs }
        if (rows.zipWithNext().any { (a, b) -> b.startMs < a.endMs }) return DistanceResult(reason = "overlapping_records")
        val covered = rows.sumOf { (it.endMs - it.startMs).toDouble() } / (session.endMs - session.startMs).toDouble()
        val meters = rows.sumOf { it.meters }
        if (!meters.isFinite()) return DistanceResult(reason = "invalid_data")
        return DistanceResult(meters, covered, covered >= 0.95, if (covered >= 0.95) "" else "partial_coverage")
    }

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
